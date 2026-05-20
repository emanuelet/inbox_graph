import { Hono } from 'hono'
import { enqueueTask } from '../tasks/client.js'

const webhook = new Hono()

webhook.post('/webhook/gmail', async (c) => {
  try {
    const body = await c.req.json()

    const message = body.message
    if (!message?.data) {
      return c.json({ error: 'Invalid Pub/Sub payload' }, 400)
    }

    const decoded = JSON.parse(Buffer.from(message.data, 'base64').toString('utf-8'))

    console.log('Received Gmail webhook:', decoded)

    await enqueueTask({
      type: 'sync',
      timestamp: new Date().toISOString(),
    })

    return c.json({ status: 'enqueued' }, 200)
  } catch (error) {
    console.error('Webhook handler error:', error)
    return c.json({ error: 'Failed to process webhook' }, 500)
  }
})

export default webhook
