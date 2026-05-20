import type { gmail_v1 } from 'googleapis'
import pLimit from 'p-limit'
import { db } from '../db/index.js'
import { getGmailClient } from '../gmail/client.js'
import { processMessagesBatch } from './process.js'

const CONCURRENCY = 10
const CHUNK_SIZE = 50
const PAGE_SIZE = 100

const threadLimit = pLimit(CONCURRENCY)
const messageLimit = pLimit(CONCURRENCY)

async function fetchAllThreadIds(): Promise<string[]> {
  const gmail = getGmailClient()
  const threadIds: string[] = []
  let pageToken: string | undefined

  do {
    const response = await gmail.users.threads.list({
      userId: 'me',
      maxResults: PAGE_SIZE,
      pageToken,
      fields: 'threads(id),nextPageToken',
    })

    const threads = response.data.threads || []
    threadIds.push(
      ...threads.map((t) => t.id).filter((id): id is string => id !== null && id !== undefined),
    )
    pageToken = response.data.nextPageToken || undefined
  } while (pageToken)

  return threadIds
}

async function fetchMessageIdsInThread(threadId: string): Promise<string[]> {
  const gmail = getGmailClient()
  const response = await gmail.users.messages.list({
    userId: 'me',
    q: `rfc822msgid:* thread:${threadId}`,
    maxResults: 500,
    fields: 'messages(id)',
  })

  return (response.data.messages || [])
    .map((m) => m.id)
    .filter((id): id is string => id !== null && id !== undefined)
}

async function fetchMessageDetail(id: string): Promise<gmail_v1.Schema$Message | null> {
  const gmail = getGmailClient()
  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'metadata',
      metadataHeaders: ['From', 'To', 'Cc', 'Subject', 'Date'],
    })
    return response.data
  } catch (error) {
    console.error(`Failed to fetch message ${id}:`, error)
    return null
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
  )
}

export async function runInitialSync() {
  console.log('Starting initial sync...')

  const threadIds = await fetchAllThreadIds()
  console.log(`Found ${threadIds.length} threads`)

  let maxHistoryId = '0'
  let processedCount = 0

  for (let i = 0; i < threadIds.length; i += CHUNK_SIZE) {
    const chunk = threadIds.slice(i, i + CHUNK_SIZE)
    console.log(
      `Processing thread chunk ${Math.floor(i / CHUNK_SIZE) + 1}/${Math.ceil(threadIds.length / CHUNK_SIZE)}`,
    )

    const messageIdsResults = await Promise.allSettled(
      chunk.map((threadId) => threadLimit(() => fetchMessageIdsInThread(threadId))),
    )

    const messageIds = messageIdsResults
      .filter((r): r is PromiseFulfilledResult<string[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value)

    console.log(`  Fetched ${messageIds.length} message IDs`)

    const detailResults = await Promise.allSettled(
      messageIds.map((id) => messageLimit(() => fetchMessageDetail(id))),
    )

    const messages = detailResults
      .filter(
        (r): r is PromiseFulfilledResult<gmail_v1.Schema$Message> =>
          r.status === 'fulfilled' && r.value !== null,
      )
      .map((r) => r.value)

    console.log(`  Fetched ${messages.length} message details`)

    if (messages.length > 0) {
      const result = await processMessagesBatch(messages)
      if (result.maxHistoryId !== '0' && BigInt(result.maxHistoryId) > BigInt(maxHistoryId)) {
        maxHistoryId = result.maxHistoryId
      }
      processedCount += result.count
    }
  }

  if (maxHistoryId !== '0') {
    await saveHistoryId(maxHistoryId)
    console.log(`Saved lastHistoryId: ${maxHistoryId}`)
  }

  console.log(`Initial sync complete. Processed ${processedCount} messages.`)
}
