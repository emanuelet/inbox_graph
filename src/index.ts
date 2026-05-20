import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { config } from './config.js'
import { initDb } from './db/init.js'
import { loadSavedToken } from './gmail/client.js'
import routes from './routes/index.js'

const app = new Hono()

app.route('/', routes)

async function bootstrap() {
  await initDb()
  await loadSavedToken()

  serve(
    {
      fetch: app.fetch,
      port: config.server.port,
    },
    (info) => {
      console.log(`Server running on http://localhost:${info.port}`)
    },
  )
}

bootstrap().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
