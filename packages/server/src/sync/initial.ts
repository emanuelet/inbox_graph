import type { gmail_v1 } from "googleapis";
import { randomUUID } from "node:crypto";
import pLimit from "p-limit";
import { db } from "../db/index.js";
import { getGmailClient } from "../gmail/client.js";
import { processMessagesBatch } from "./process.js";

const CONCURRENCY = 10;
const CHUNK_SIZE = 50;
const PAGE_SIZE = 100;

const threadLimit = pLimit(CONCURRENCY);

async function fetchAllThreadIds(): Promise<string[]> {
  const gmail = getGmailClient();
  const threadIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const response = await gmail.users.threads.list({
      userId: "me",
      maxResults: PAGE_SIZE,
      pageToken,
      fields: "threads(id),nextPageToken",
    });

    const threads = response.data.threads || [];
    threadIds.push(
      ...threads
        .map((t) => t.id)
        .filter((id): id is string => id !== null && id !== undefined),
    );
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);

  return threadIds;
}

async function fetchMessagesInThread(
  threadId: string,
): Promise<gmail_v1.Schema$Message[]> {
  const gmail = getGmailClient();

  try {
    const response = await gmail.users.threads.get({
      userId: "me",
      id: threadId,
      format: "full",
    });
    return response.data.messages || [];
  } catch (error) {
    console.error(`Failed to fetch thread ${threadId}:`, error);
    throw new Error(`Failed to fetch thread ${threadId}`);
  }
}

async function saveHistoryId(historyId: string) {
  await db.query(
    `
    UPSERT { _key: 'sync_state' }
    INSERT { _key: 'sync_state', lastHistoryId: @historyId }
    UPDATE { lastHistoryId: @historyId }
    IN state
    `,
    { historyId },
  );
}

async function reconcileFullSync(fullSyncId: string) {
  await db.query(
    `
    FOR edge IN in_thread
      LET message = DOCUMENT(edge._from)
      FILTER message == null OR message.fullSyncId != @fullSyncId
      REMOVE edge IN in_thread
    `,
    { fullSyncId },
  );
  await db.query(
    `
    FOR edge IN sent_by
      LET message = DOCUMENT(edge._from)
      FILTER message == null OR message.fullSyncId != @fullSyncId
      REMOVE edge IN sent_by
    `,
    { fullSyncId },
  );
  await db.query(
    `
    FOR edge IN received_by
      LET message = DOCUMENT(edge._from)
      FILTER message == null OR message.fullSyncId != @fullSyncId
      REMOVE edge IN received_by
    `,
    { fullSyncId },
  );
  await db.query(
    `
    FOR message IN messages
      FILTER message.fullSyncId != @fullSyncId
      REMOVE message IN messages
    `,
    { fullSyncId },
  );
  await db.query(
    `
    FOR person IN people
      FILTER LENGTH(FOR edge IN sent_by FILTER edge._to == person._id RETURN 1) == 0
        AND LENGTH(FOR edge IN received_by FILTER edge._to == person._id RETURN 1) == 0
      REMOVE person IN people
    `,
  );
  await db.query(
    `
    FOR thread IN threads
      FILTER LENGTH(FOR edge IN in_thread FILTER edge._to == thread._id RETURN 1) == 0
      REMOVE thread IN threads
    `,
  );
}

export async function runInitialSync() {
  console.log("Starting initial sync...");

  const threadIds = await fetchAllThreadIds();
  console.log(`Found ${threadIds.length} threads`);

  let maxHistoryId = "0";
  let processedCount = 0;
  const fullSyncId = randomUUID();

  for (let i = 0; i < threadIds.length; i += CHUNK_SIZE) {
    const chunk = threadIds.slice(i, i + CHUNK_SIZE);
    console.log(
      `Processing thread chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(threadIds.length / CHUNK_SIZE)}`,
    );

    const threadResults = await Promise.allSettled(
      chunk.map((threadId) =>
        threadLimit(() => fetchMessagesInThread(threadId)),
      ),
    );

    const failedThreads = threadResults.filter((result) => result.status === "rejected");
    if (failedThreads.length > 0) {
      throw new Error(`Failed to fetch ${failedThreads.length} thread(s)`);
    }

    const messages = threadResults
      .filter(
        (result): result is PromiseFulfilledResult<gmail_v1.Schema$Message[]> =>
          result.status === "fulfilled",
      )
      .flatMap((r) => r.value);

    console.log(`  Fetched ${messages.length} full messages`);

    if (messages.length > 0) {
      const result = await processMessagesBatch(messages, fullSyncId);
      if (
        result.maxHistoryId !== "0" &&
        BigInt(result.maxHistoryId) > BigInt(maxHistoryId)
      ) {
        maxHistoryId = result.maxHistoryId;
      }
      processedCount += result.count;
    }
  }

  await reconcileFullSync(fullSyncId);

  // The profile cursor also covers an empty mailbox and changes during the walk.
  const profile = await getGmailClient().users.getProfile({ userId: "me" });
  if (profile.data.historyId) maxHistoryId = profile.data.historyId;

  if (maxHistoryId !== "0") {
    await saveHistoryId(maxHistoryId);
    console.log(`Saved lastHistoryId: ${maxHistoryId}`);
  }

  console.log(`Initial sync complete. Processed ${processedCount} messages.`);
}
