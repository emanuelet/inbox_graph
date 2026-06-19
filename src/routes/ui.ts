import { Hono } from 'hono'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import SearchPage from '../components/SearchPage.vue'

const ui = new Hono()

const isDev = process.env.NODE_ENV !== 'production'

ui.get('/', async (c) => {
  const app = createSSRApp(SearchPage)
  const content = await renderToString(app)

  const src = isDev ? '/src/entry-client.ts' : '/client/entry-client.js'

  return c.html(
`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Inbox Graph</title>
    <script type="module" src="${src}"></script>
  </head>
  <body>${content}</body>
</html>`,
  )
})

export default ui
