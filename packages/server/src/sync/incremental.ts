import type { gmail_v1 } from "googleapis";
import pLimit from "p-limit";
import { db } from "../db/index.js";
import { getGmailClient } from "../gmail/client.js";
import { processMessagesBatch } from "./process.js";

const CONCURRENCY = 10;
const messageLimit = pLimit(CONCURRENCY);

async function getLastHistoryId(): Promise<string | null> {
  const cursor = await db.query<{ lastHistoryId: string }>(
    "RETURN DOCUMENT(@key)",
    {
      key: "state/sync_state",
    },
  );
  const doc = await cursor.next();
  return doc?.lastHistoryId || null;
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

async function fetchMessageDetail(
  id: string,
): Promise<gmail_v1.Schema$Message> {
  const gmail = getGmailClient();
  try {
    const response = await gmail.users.messages.get({
      userId: "me",
      id,
      format: "full",
    });
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch message ${id}:`, error);
    throw error;
  }
}

async function deleteMessages(ids: string[]) {
  if (ids.length === 0) return;
  const messageIds = ids.map((id) => `messages/${id}`);

  for (const collection of ["sent_by", "received_by", "in_thread"]) {
    await db.query(
      `
      FOR edge IN @@collection
        FILTER edge._from IN @messageIds
        REMOVE edge IN @@collection
      `,
      { "@collection": collection, messageIds },
    );
  }

  await db.query(
    `
    FOR id IN @ids
      REMOVE { _key: id } IN messages
      OPTIONS { ignoreErrors: true }
    `,
    { ids },
  );
}

export async function runIncrementalSync() {
  const lastHistoryId = await getLastHistoryId();

  if (!lastHistoryId) {
    console.log("No lastHistoryId found. Running initial sync instead.");
    const { runInitialSync } = await import("./initial.js");
    await runInitialSync();
    return;
  }

  console.log(`Starting incremental sync from historyId: ${lastHistoryId}`);

  const gmail = getGmailClient();
  let maxHistoryId = lastHistoryId;
  let nextPageToken: string | undefined;

  try {
    do {
      const response = await gmail.users.history.list({
        userId: "me",
        startHistoryId: lastHistoryId,
        pageToken: nextPageToken,
      });

      const historyEntries = response.data.history || [];
      maxHistoryId = response.data.historyId || maxHistoryId;

      const changedMessageIds = new Set<string>();
      const messagesToDelete = new Set<string>();

      for (const entry of historyEntries) {
        for (const message of entry.messages || []) {
          if (message.id) changedMessageIds.add(message.id);
        }
        const messagesAdded = entry.messagesAdded || [];
        const messagesDeleted = entry.messagesDeleted || [];

        for (const msgRef of messagesAdded) {
          if (msgRef.message?.id) {
            changedMessageIds.add(msgRef.message.id);
          }
        }

        for (const msgRef of messagesDeleted) {
          if (msgRef.message?.id) {
            messagesToDelete.add(msgRef.message.id);
          }
        }
      }

      for (const id of messagesToDelete) changedMessageIds.delete(id);

      if (changedMessageIds.size > 0) {
        const detailResults = await Promise.allSettled(
          [...changedMessageIds].map((id) =>
            messageLimit(() => fetchMessageDetail(id)),
          ),
        );

        const failedMessages = detailResults.filter(
          (result) => result.status === "rejected",
        );
        if (failedMessages.length > 0) {
          throw new Error(`Failed to fetch ${failedMessages.length} changed message(s)`);
        }

        const messages = detailResults
          .filter(
            (r): r is PromiseFulfilledResult<gmail_v1.Schema$Message> =>
              r.status === "fulfilled",
          )
          .map((r) => r.value);

        if (messages.length > 0) {
          const result = await processMessagesBatch(messages);
          if (
            result.maxHistoryId !== "0" &&
            BigInt(result.maxHistoryId) > BigInt(maxHistoryId)
          ) {
            maxHistoryId = result.maxHistoryId;
          }
        }
      }

      await deleteMessages([...messagesToDelete]);

      nextPageToken = response.data.nextPageToken || undefined;
    } while (nextPageToken);

    await saveHistoryId(maxHistoryId);
    console.log(`Incremental sync complete. New historyId: ${maxHistoryId}`);
  } catch (error: unknown) {
    const err = error as { code?: number; message?: string };
    if (err.code === 404 || err.message?.includes("requestedStartHistory")) {
      console.warn("historyId expired. Running a full reconciliation sync.");
      const { runInitialSync } = await import("./initial.js");
      await runInitialSync();
    } else {
      console.error("Incremental sync failed:", error);
      throw error;
    }
  }
}
