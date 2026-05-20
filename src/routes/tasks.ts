import { Hono } from 'hono'
import { runIncrementalSync } from '../sync/incremental.js'

const tasks = new Hono()

tasks.post('/tasks/sync', async (c) => {
  try {
    const body = await c.req.json()
    console.log('Processing sync task:', body)

    await runIncrementalSync()

    return c.json({ status: 'synced' }, 200)
  } catch (error) {
    console.error('Sync task failed:', error)
    return c.json({ error: 'Sync failed' }, 500)
  }
})

export default tasks
