import { Hono } from 'hono'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import SearchPage from '../components/SearchPage.vue'

const ui = new Hono()

ui.get('/', async (c) => {
  const app = createSSRApp(SearchPage)
  const html = await renderToString(app)
  return c.html(html)
})

export default ui
