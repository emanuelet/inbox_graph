import { Hono } from "hono";
import { db } from "../db/index.js";
import { safeBase64 } from "../gmail/helpers.js";
import { parseSearchQuery } from "../search/query.js";

const search = new Hono();

search.get("/search", async (c) => {
  const q = c.req.query("q")?.trim();
  const type = c.req.query("type") || "all";
  const limit = Number(c.req.query("limit") || "50");

  if (!q) {
    return c.json({ error: 'Query parameter "q" is required' }, 400);
  }
  if (!["all", "messages", "people"].includes(type)) {
    return c.json({ error: 'type must be "all", "messages", or "people"' }, 400);
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
    return c.json({ error: "limit must be an integer between 1 and 200" }, 400);
  }

  const parsed = parseSearchQuery(q);
  const phraseSearch = parsed.phrases
    .map(
      (_, index) => `
        AND ANALYZER(
          PHRASE(doc.subject, @phrase${index}) OR
          PHRASE(doc.snippet, @phrase${index}) OR
          PHRASE(doc.bodyText, @phrase${index}),
          "text_en"
        )`,
    )
    .join("");
  const bindVars = {
    text: parsed.terms.join(" "),
    hasText: parsed.terms.length > 0,
    from: parsed.filters.from || null,
    to: parsed.filters.to || null,
    subject: parsed.filters.subject?.toLowerCase() || null,
    after: parsed.filters.after || null,
    before: parsed.filters.before || null,
    hasAttachment: parsed.filters.hasAttachment || null,
    limit,
    ...Object.fromEntries(
      parsed.phrases.map((phrase, index) => [`phrase${index}`, phrase]),
    ),
  };
  const peopleBindVars = {
    text: bindVars.text,
    hasText: bindVars.hasText,
    limit,
  };

  const results: { messages: unknown[]; people: unknown[] } = {
    messages: [],
    people: [],
  };

  if (type === "all" || type === "messages") {
    const cursor = await db.query(
      `
      FOR doc IN email_search
        SEARCH (
          @hasText == false OR ANALYZER(
            BOOST(doc.subject IN TOKENS(@text, "text_en"), 5) OR
            BOOST(doc.fromName IN TOKENS(@text, "text_en"), 3) OR
            BOOST(doc.bodyText IN TOKENS(@text, "text_en"), 2) OR
            doc.snippet IN TOKENS(@text, "text_en"),
            "text_en"
          )
        )${phraseSearch}
        LET isMessage = doc._id LIKE "messages/%"
        FILTER isMessage
          AND (@from == null OR LOWER(doc.fromEmail) == @from)
          AND (@to == null OR @to IN doc.to[*].email OR @to IN doc.cc[*].email)
          AND (@subject == null OR CONTAINS(LOWER(doc.subject), @subject))
          AND (@after == null OR TO_NUMBER(doc.internalDate) >= @after)
          AND (@before == null OR TO_NUMBER(doc.internalDate) < @before)
          AND (@hasAttachment == null OR doc.hasAttachment == @hasAttachment)
        SORT BM25(doc) DESC, TO_NUMBER(doc.internalDate) DESC
        LIMIT @limit
        RETURN {
          _key: doc._key,
          type: "message",
          subject: doc.subject,
          snippet: doc.snippet,
          internalDate: doc.internalDate,
          gmailUrl: doc.gmailUrl,
          threadId: doc.threadId,
          sender: { name: doc.fromName, email: doc.fromEmail },
          score: BM25(doc)
        }
      `,
      bindVars,
    );
    results.messages = await cursor.all();
  }

  if (type === "all" || type === "people") {
    const cursor = await db.query(
      `
      FOR doc IN email_search
        SEARCH (
          @hasText == false OR ANALYZER(
            BOOST(doc.name IN TOKENS(@text, "text_en"), 3) OR
            doc.email IN TOKENS(@text, "text_en"),
            "text_en"
          )
        )
        LET isPerson = doc._id LIKE "people/%"
        FILTER isPerson
        SORT BM25(doc) DESC
        LIMIT @limit
        RETURN {
          _key: doc._key,
          type: "person",
          name: doc.name,
          email: doc.email,
          score: BM25(doc)
        }
      `,
      peopleBindVars,
    );
    results.people = await cursor.all();
  }

  return c.json({
    query: q,
    type,
    count: {
      messages: results.messages.length,
      people: results.people.length,
    },
    results,
  });
});

search.get("/search/graph/person/:email", async (c) => {
  const email = c.req.param("email");
  const personKey = safeBase64(email);

  const cursor = await db.query(
    `
    LET person = DOCUMENT(CONCAT("people/", @personKey))

    LET sentMessages = person != null ? (
      FOR msg IN 1..1 INBOUND person sent_by
        RETURN {
          _key: msg._key,
          subject: msg.subject,
          snippet: msg.snippet,
          internalDate: msg.internalDate,
          gmailUrl: msg.gmailUrl,
          threadId: msg.threadId,
          direction: "sent"
        }
    ) : []

    LET receivedMessages = person != null ? (
      FOR msg IN 1..1 INBOUND person received_by
        RETURN {
          _key: msg._key,
          subject: msg.subject,
          snippet: msg.snippet,
          internalDate: msg.internalDate,
          gmailUrl: msg.gmailUrl,
          threadId: msg.threadId,
          direction: "received"
        }
    ) : []

    LET allMessages = APPEND(sentMessages, receivedMessages)

    LET threads = person != null ? (
      FOR msg IN allMessages
        LET thread = DOCUMENT(CONCAT("threads/", msg.threadId))
        FILTER thread != null
        RETURN DISTINCT {
          _key: thread._key,
          updatedAt: thread.updatedAt
        }
    ) : []

    RETURN person != null ? {
      person: {
        email: person.email,
        name: person.name,
        _key: person._key
      },
      stats: {
        sent: LENGTH(sentMessages),
        received: LENGTH(receivedMessages),
        threads: LENGTH(threads)
      },
      messages: allMessages,
      threads: threads
    } : null
    `,
    { personKey },
  );

  const result = await cursor.next();
  if (!result) {
    return c.json({ error: "Person not found" }, 404);
  }

  return c.json(result);
});

search.get("/search/graph/thread/:threadId", async (c) => {
  const threadId = c.req.param("threadId");

  const cursor = await db.query(
    `
    LET thread = DOCUMENT(CONCAT("threads/", @threadId))

    LET messages = thread != null ? (
      FOR msg IN 1..1 INBOUND thread in_thread
        LET sender = (
          FOR p IN 1..1 INBOUND msg sent_by
            RETURN { email: p.email, name: p.name }
        )[0]
        LET recipients = (
          FOR p IN 1..1 INBOUND msg received_by
            RETURN { email: p.email, name: p.name }
        )
        SORT msg.internalDate ASC
        RETURN {
          _key: msg._key,
          subject: msg.subject,
          snippet: msg.snippet,
          internalDate: msg.internalDate,
          gmailUrl: msg.gmailUrl,
          sender: sender,
          recipients: recipients
        }
    ) : []

    RETURN thread != null ? {
      thread: {
        _key: thread._key,
        updatedAt: thread.updatedAt
      },
      messageCount: LENGTH(messages),
      messages: messages
    } : null
    `,
    { threadId },
  );

  const result = await cursor.next();
  if (!result) {
    return c.json({ error: "Thread not found" }, 404);
  }

  return c.json(result);
});

export default search;
