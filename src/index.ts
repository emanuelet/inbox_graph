import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { config } from './config.js'
import { initDb } from './db/init.js'
import { getGmailClient, loadSavedToken } from './gmail/client.js'
import { setupGmailWatch } from './gmail/watch.js'
import routes from './routes/index.js'

const app = new Hono()

app.route('/', routes)

async function bootstrap() {
  await initDb()
  await loadSavedToken()

  try {
    const gmail = getGmailClient()
    await gmail.users.labels.list({ userId: 'me' })
    console.log('Gmail API connection verified')
    const state = await gmail.users.getProfile({ userId: 'me' })
    console.log(`Authenticated as: ${state.data.emailAddress}`)
    await setupGmailWatch()
  } catch {
    console.log('Gmail API not accessible. Complete OAuth flow at /auth/google')
  }
}

const isProduction = process.env.NODE_ENV === 'production'

if (isProduction) {
  bootstrap()
    .then(() => {
      serve({ fetch: app.fetch, port: config.server.port }, (info) => {
        console.log(`Server running on http://localhost:${info.port}`)
      })
    })
    .catch((error) => {
      console.error('Failed to start server:', error)
      process.exit(1)
    })
} else {
  bootstrap().catch((error) => {
    console.error('Failed to bootstrap:', error)
    process.exit(1)
  })
}

export default {
  fetch: app.fetch,
  port: config.server.port,
}
