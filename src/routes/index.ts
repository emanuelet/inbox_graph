import { Hono } from 'hono'
import auth from './auth.js'

const routes = new Hono()

routes.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

routes.route('/', auth)

export default routes
