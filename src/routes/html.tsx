import { Hono } from 'hono'
import { renderToString } from 'react-dom/server'
import { ResultsList } from '../components/ResultsList.js'
import { ThreadView } from '../components/ThreadView.js'
import { db } from '../db/index.js'
import { safeBase64 } from '../gmail/helpers.js'

const html = new Hono()

html.get('/html/search', async (c) => {
  const q = c.req.query('q')
  const limit = Math.min(parseInt(c.req.query('limit') || '50', 10), 200)

  if (!q) return c.html('<div class="empty">Query parameter "q" is required</div>')

  const cursor = await db.query(
    `
    FOR doc IN email_search
      SEARCH ANALYZER(PHRASE(doc.subject, @q) OR PHRASE(doc.snippet, @q), "text_en")
      LET isMessage = doc._id LIKE "messages/%"
      FILTER isMessage
      SORT BM25(doc) DESC
      LIMIT @limit
      RETURN {
        _key: doc._key,
        subject: doc.subject,
        snippet: doc.snippet,
        internalDate: doc.internalDate,
        gmailUrl: doc.gmailUrl,
        threadId: doc.threadId,
        score: BM25(doc)
      }
    `,
    { q, limit },
  )

  const messages = await cursor.all()
  const html = renderToString(<ResultsList messages={messages} />)
  return c.html(html)
})

html.get('/html/person/:email', async (c) => {
  const email = c.req.param('email')
  const personKey = safeBase64(email)

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
      messages: allMessages
    } : null
    `,
    { personKey },
  )

  const result = await cursor.next()
  if (!result) return c.html('<div class="empty">Person not found</div>')

  const html = renderToString(
    <ResultsList messages={result.messages} person={result.person} stats={result.stats} />,
  )
  return c.html(html)
})

html.get('/html/thread/:threadId', async (c) => {
  const threadId = c.req.param('threadId')

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
      messages: messages
    } : null
    `,
    { threadId },
  )

  const result = await cursor.next()
  if (!result) return c.html('<div class="empty">Thread not found</div>')

  const html = renderToString(<ThreadView thread={result.thread} messages={result.messages} />)
  return c.html(html)
})

export default html
