import type { gmail_v1 } from "googleapis";
import { db } from "../db/index.js";
import {
  safeBase64,
  extractBodyText,
  hasAttachment,
} from "../gmail/helpers.js";

interface ParsedMessage {
  messageId: string;
  threadId: string;
  subject: string;
  snippet: string;
  payload: unknown;
  bodyText: string;
  internalDate: string;
  from: { name: string; email: string };
  to: Array<{ name: string; email: string }>;
  cc: Array<{ name: string; email: string }>;
  historyId: string;
  labelIds: string[];
  hasAttachment: boolean;
}

type Person = { name: string; email: string };
type Edge = { _key: string; _from: string; _to: string };

export interface MessageEdgeInput {
  messageId: string;
  threadId: string;
  from: Person;
  to: Person[];
  cc: Person[];
}

export function buildMessageEdges(message: MessageEdgeInput): {
  sentBy: Edge[];
  receivedBy: Edge[];
  inThread: Edge[];
} {
  const messageRef = `messages/${message.messageId}`;
  const edgeKey = (kind: string, target: string) =>
    safeBase64(`${kind}:${message.messageId}:${target}`);
  const recipients = new Map<string, Person>();

  for (const person of [...message.to, ...message.cc]) {
    if (person.email) recipients.set(person.email, person);
  }

  return {
    sentBy: message.from.email
      ? [
          {
            _key: edgeKey("sent_by", message.from.email),
            _from: messageRef,
            _to: `people/${safeBase64(message.from.email)}`,
          },
        ]
      : [],
    receivedBy: [...recipients.values()].map((person) => ({
      _key: edgeKey("received_by", person.email),
      _from: messageRef,
      _to: `people/${safeBase64(person.email)}`,
    })),
    inThread: [
      {
        _key: edgeKey("in_thread", message.threadId),
        _from: messageRef,
        _to: `threads/${message.threadId}`,
      },
    ],
  };
}

function parseGmailMessage(
  gmailMessage: gmail_v1.Schema$Message,
): ParsedMessage | null {
  const messageId = gmailMessage.id;
  const threadId = gmailMessage.threadId;
  const snippet = gmailMessage.snippet || "";
  const historyId = gmailMessage.historyId || "";
  const internalDate = gmailMessage.internalDate || "";

  if (!messageId || !threadId) return null;

  const headers = gmailMessage.payload?.headers || [];
  const findHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ||
    "";

  const subject = findHeader("Subject");
  const fromRaw = findHeader("From");
  const toRaw = findHeader("To");
  const ccRaw = findHeader("Cc");

  const parseAddr = (
    raw: string,
  ): Array<{ name: string; email: string }> => {
    if (!raw) return [];
    const results: Array<{ name: string; email: string }> = [];
    const regex =
      /(?:"?([^"<]*?)"?\s*<([^>]+)>|([\w.+-]+@[\w.-]+\.\w+))/g;
    let match = regex.exec(raw);
    while (match !== null) {
      const name = (match[1] || "").trim();
      const email = (match[2] || match[3] || "").toLowerCase();
      if (email) {
        results.push({ name: name || email, email });
      }
      match = regex.exec(raw);
    }
    return results;
  };

  const fromList = parseAddr(fromRaw);
  const from = fromList[0] || {
    name: fromRaw || "Unknown",
    email: fromRaw || "",
  };

  return {
    messageId,
    threadId,
    subject,
    snippet,
    payload: gmailMessage.payload,
    bodyText: extractBodyText(gmailMessage.payload || {}),
    internalDate,
    from,
    to: parseAddr(toRaw),
    cc: parseAddr(ccRaw),
    historyId,
    labelIds: gmailMessage.labelIds || [],
    hasAttachment: hasAttachment(gmailMessage.payload || {}),
  };
}

export async function processMessagesBatch(
  messages: gmail_v1.Schema$Message[],
  fullSyncId?: string,
) {
  const parsed: ParsedMessage[] = [];

  for (const msg of messages) {
    const result = parseGmailMessage(msg);
    if (result) parsed.push(result);
  }

  if (parsed.length === 0) return { maxHistoryId: "0", count: 0 };

  const messageDocs = parsed.map((m) => ({
    _key: m.messageId,
    threadId: m.threadId,
    subject: m.subject,
    snippet: m.snippet,
    bodyText: m.bodyText,
    internalDate: m.internalDate,
    fromName: m.from.name,
    fromEmail: m.from.email,
    to: m.to,
    cc: m.cc,
    labelIds: m.labelIds,
    hasAttachment: m.hasAttachment,
    gmailUrl: `https://mail.google.com/mail/u/0/#all/${m.messageId}`,
    historyId: m.historyId,
    ...(fullSyncId ? { fullSyncId } : {}),
  }));

  const threadDocs = [...new Set(parsed.map((m) => m.threadId))].map(
    (id) => ({
      _key: id,
      updatedAt: Date.now(),
    }),
  );

  const peopleMap = new Map<string, { name: string; email: string }>();
  for (const m of parsed) {
    if (m.from.email) peopleMap.set(safeBase64(m.from.email), m.from);
    for (const p of m.to) {
      if (p.email) peopleMap.set(safeBase64(p.email), p);
    }
    for (const p of m.cc) {
      if (p.email) peopleMap.set(safeBase64(p.email), p);
    }
  }

  const peopleDocs = [...peopleMap.entries()].map(([key, person]) => ({
    _key: key,
    email: person.email,
    name: person.name,
  }));

  const sentByEdges: Edge[] = [];
  const receivedByEdges: Edge[] = [];
  const inThreadEdges: Edge[] = [];

  for (const m of parsed) {
    const edges = buildMessageEdges(m);
    sentByEdges.push(...edges.sentBy);
    receivedByEdges.push(...edges.receivedBy);
    inThreadEdges.push(...edges.inThread);
  }

  await db.query(
    `
    FOR doc IN @docs
      UPSERT { _key: doc._key }
      INSERT doc
      UPDATE doc
      IN messages
    `,
    { docs: messageDocs },
  );

  await db.query(
    `
    FOR doc IN @docs
      UPSERT { _key: doc._key }
      INSERT doc
      UPDATE { updatedAt: doc.updatedAt }
      IN threads
    `,
    { docs: threadDocs },
  );

  if (peopleDocs.length > 0) {
    await db.query(
      `
      FOR doc IN @docs
        UPSERT { _key: doc._key }
        INSERT doc
        UPDATE { name: doc.name }
        IN people
      `,
      { docs: peopleDocs },
    );
  }

  const messageIds = parsed.map((message) => `messages/${message.messageId}`);

  const replaceEdges = async (
    collection: string,
    docs: Edge[],
  ) => {
    await db.query(
      `
      FOR edge IN @@collection
        FILTER edge._from IN @messageIds
        REMOVE edge IN @@collection
      `,
      { "@collection": collection, messageIds },
    );

    if (docs.length === 0) return;
    await db.query(
      `
      FOR doc IN @docs
        UPSERT { _key: doc._key }
        INSERT doc
        UPDATE doc
        IN @@collection
      `,
      { "@collection": collection, docs },
    );
  };

  await replaceEdges("sent_by", sentByEdges);
  await replaceEdges("received_by", receivedByEdges);
  await replaceEdges("in_thread", inThreadEdges);

  let maxHistoryId = "0";
  for (const m of parsed) {
    if (m.historyId && BigInt(m.historyId) > BigInt(maxHistoryId)) {
      maxHistoryId = m.historyId;
    }
  }

  return { maxHistoryId, count: parsed.length };
}
