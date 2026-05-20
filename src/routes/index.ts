import { Hono } from 'hono'
import auth from './auth.js'
import search from './search.js'
import tasks from './tasks.js'
import webhook from './webhook.js'

const routes = new Hono()

routes.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

routes.route('/', auth)
routes.route('/', search)
routes.route('/', webhook)
routes.route('/', tasks)

export default routes
