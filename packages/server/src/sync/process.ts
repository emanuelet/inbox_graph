import type { gmail_v1 } from "googleapis";
import { db } from "../db/index.js";
import { safeBase64, extractBodyText } from "../gmail/helpers.js";

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
  };
}

export async function processMessagesBatch(
  messages: gmail_v1.Schema$Message[],
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
    payload: m.payload,
    bodyText: m.bodyText,
    internalDate: m.internalDate,
    gmailUrl: `https://mail.google.com/mail/u/0/#all/${m.messageId}`,
    historyId: m.historyId,
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

  const sentByEdges: Array<{ _from: string; _to: string }> = [];
  const receivedByEdges: Array<{ _from: string; _to: string }> = [];
  const inThreadEdges: Array<{ _from: string; _to: string }> = [];

  for (const m of parsed) {
    if (m.from.email) {
      sentByEdges.push({
        _from: `messages/${m.messageId}`,
        _to: `people/${safeBase64(m.from.email)}`,
      });
    }
    for (const p of m.to) {
      if (p.email) {
        receivedByEdges.push({
          _from: `messages/${m.messageId}`,
          _to: `people/${safeBase64(p.email)}`,
        });
      }
    }
    for (const p of m.cc) {
      if (p.email) {
        receivedByEdges.push({
          _from: `messages/${m.messageId}`,
          _to: `people/${safeBase64(p.email)}`,
        });
      }
    }
    inThreadEdges.push({
      _from: `messages/${m.messageId}`,
      _to: `threads/${m.threadId}`,
    });
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

  const insertEdges = async (
    collection: string,
    docs: Array<{ _from: string; _to: string }>,
  ) => {
    if (docs.length === 0) return;
    await db.query(
      `
      FOR doc IN @docs
        INSERT doc
        IN @@collection
        OPTIONS { overwriteMode: 'ignore' }
      `,
      { "@collection": collection, docs },
    );
  };

  await insertEdges("sent_by", sentByEdges);
  await insertEdges("received_by", receivedByEdges);
  await insertEdges("in_thread", inThreadEdges);

  let maxHistoryId = "0";
  for (const m of parsed) {
    if (m.historyId && BigInt(m.historyId) > BigInt(maxHistoryId)) {
      maxHistoryId = m.historyId;
    }
  }

  return { maxHistoryId, count: parsed.length };
}
