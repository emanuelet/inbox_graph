import { Hono } from 'hono'
import { loadSavedToken, oauth2Client, SCOPES, saveToken } from '../gmail/client.js'

const auth = new Hono()

auth.get('/auth/google', (c) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  })
  return c.redirect(url)
})

auth.get('/auth/google/callback', async (c) => {
  const code = c.req.query('code')
  if (!code) {
    return c.json({ error: 'No code provided' }, 400)
  }

  try {
    const { tokens } = await oauth2Client.getToken(code)
    await saveToken(tokens)
    oauth2Client.setCredentials(tokens)
    return c.redirect('/?auth=success')
  } catch (error) {
    console.error('OAuth callback error:', error)
    return c.json({ error: 'Failed to authenticate' }, 500)
  }
})

auth.get('/auth/status', async (c) => {
  const hasToken = await loadSavedToken()
  return c.json({ authenticated: hasToken })
})

export default auth
