import { reactRenderer } from '@hono/react-renderer'
import { Hono } from 'hono'
import { SearchPage } from '../components/SearchPage.js'

const ui = new Hono()

ui.use(
  '*',
  reactRenderer(({ children }) => <>{children}</>, { docType: true }),
)

ui.get('/', (c) => {
  return c.render(<SearchPage />)
})

export default ui
