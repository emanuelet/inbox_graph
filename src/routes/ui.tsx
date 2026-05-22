import { Hono } from 'hono'
import { jsxRenderer } from 'hono/jsx-renderer'

const ui = new Hono()

ui.use(
  '*',
  jsxRenderer(
    ({ children }) => (
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Inbox Graph</title>
          <style>{`
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; }
            .container { max-width: 900px; margin: 0 auto; padding: 20px; }
            header { background: #fff; border-bottom: 1px solid #e0e0e0; padding: 16px 0; margin-bottom: 24px; }
            header .container { display: flex; justify-content: space-between; align-items: center; }
            header h1 { font-size: 20px; font-weight: 600; }
            .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; text-decoration: none; display: inline-block; }
            .btn-primary { background: #4285f4; color: #fff; }
            .btn-primary:hover { background: #3367d6; }
            .btn-secondary { background: #e0e0e0; color: #333; }
            .btn-secondary:hover { background: #d0d0d0; }
            .search-bar { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .search-input { width: 100%; padding: 12px 16px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; }
            .search-input:focus { outline: none; border-color: #4285f4; box-shadow: 0 0 0 2px rgba(66,133,244,0.2); }
            .message-card { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer; transition: box-shadow 0.15s; }
            .message-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .message-subject { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
            .message-snippet { color: #666; font-size: 13px; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
            .message-meta { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #888; }
            .message-score { background: #e8f0fe; color: #1a73e8; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
            .thread-view { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .thread-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee; }
            .thread-header h2 { font-size: 18px; }
            .thread-message { padding: 16px 0; border-bottom: 1px solid #f0f0f0; }
            .thread-message:last-child { border-bottom: none; }
            .thread-message-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .thread-message-from { font-weight: 600; font-size: 14px; }
            .thread-message-date { color: #888; font-size: 12px; }
            .thread-message-recipients { color: #666; font-size: 12px; margin-bottom: 8px; }
            .thread-message-snippet { color: #444; font-size: 13px; }
            .person-card { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
            .person-name { font-weight: 600; font-size: 15px; }
            .person-email { color: #666; font-size: 13px; }
            .stats { display: flex; gap: 16px; margin: 12px 0; font-size: 13px; color: #666; }
            .stats span { background: #f0f0f0; padding: 4px 10px; border-radius: 10px; }
            .empty { text-align: center; padding: 40px; color: #888; }
            .loading { text-align: center; padding: 40px; color: #888; }
            .hidden { display: none; }
            .auth-status { font-size: 13px; color: #666; }
            .auth-status.authenticated { color: #34a853; }
            .auth-status.unauthenticated { color: #ea4335; }
          `}</style>
        </head>
        <body>{children}</body>
      </html>
    ),
    {
      docType: true,
    },
  ),
)

ui.get('/', (c) => {
  return c.render(
    <>
      <header>
        <div class="container">
          <h1>Inbox Graph</h1>
          <div>
            <span id="auth-status" class="auth-status">
              Checking...
            </span>
            <a href="/auth/google" class="btn btn-primary" style="margin-left: 12px;">
              Login with Gmail
            </a>
          </div>
        </div>
      </header>
      <div class="container">
        <div class="search-bar">
          <input
            type="text"
            id="search-input"
            class="search-input"
            placeholder="Search emails or enter an email address..."
            autofocus={true}
          />
        </div>
        <div id="results"></div>
        <div id="thread-view" class="hidden"></div>
      </div>
      <script
        dangerouslySetInnerHTML={{
          __html: `
          const resultsEl = document.getElementById('results')
          const threadViewEl = document.getElementById('thread-view')
          const searchInput = document.getElementById('search-input')
          const authStatusEl = document.getElementById('auth-status')

          const EMAIL_REGEX = /^[\\w.+-]+@[\\w-]+\\.[\\w.-]+$/

          async function checkAuth() {
            try {
              const res = await fetch('/auth/status')
              const data = await res.json()
              if (data.authenticated) {
                authStatusEl.textContent = 'Authenticated'
                authStatusEl.classList.add('authenticated')
                authStatusEl.classList.remove('unauthenticated')
              } else {
                authStatusEl.textContent = 'Not authenticated'
                authStatusEl.classList.add('unauthenticated')
                authStatusEl.classList.remove('authenticated')
              }
            } catch {
              authStatusEl.textContent = 'Auth check failed'
              authStatusEl.classList.add('unauthenticated')
            }
          }

          function escapeHtml(str) {
            const div = document.createElement('div')
            div.textContent = str
            return div.innerHTML
          }

          function formatDate(ts) {
            if (!ts) return ''
            return new Date(parseInt(ts)).toLocaleString()
          }

          function renderMessages(messages, showThread) {
            if (!messages || messages.length === 0) {
              return '<div class="empty">No results found</div>'
            }
            return messages.map(m => {
              const sender = m.sender ? escapeHtml(m.sender.name || m.sender.email) : ''
              const score = m.score ? '<span class="message-score">' + m.score.toFixed(2) + '</span>' : ''
              const direction = m.direction ? '<span style="color:#888;font-size:12px">(' + escapeHtml(m.direction) + ')</span>' : ''
              return '<div class="message-card" data-thread="' + escapeHtml(m.threadId) + '">' +
                '<div class="message-subject">' + (sender ? escapeHtml(sender) + ' — ' : '') + escapeHtml(m.subject || '(no subject)') + ' ' + direction + '</div>' +
                '<div class="message-snippet">' + escapeHtml(m.snippet || '') + '</div>' +
                '<div class="message-meta">' +
                  '<span>' + formatDate(m.internalDate) + '</span>' +
                  '<span>' + score + '</span>' +
                '</div>' +
              '</div>'
            }).join('')
          }

          function renderThreadView(result) {
            const thread = result.thread
            const messages = result.messages || []
            let html = '<div class="thread-view">' +
              '<div class="thread-header">' +
                '<h2>Thread: ' + escapeHtml(messages[0]?.subject || '(no subject)') + '</h2>' +
                '<button class="btn btn-secondary" onclick="closeThreadView()">Back</button>' +
              '</div>'

            for (const m of messages) {
              const sender = m.sender ? escapeHtml(m.sender.name || m.sender.email) : 'Unknown'
              const recipients = m.recipients ? m.recipients.map(r => escapeHtml(r.name || r.email)).join(', ') : ''
              html += '<div class="thread-message">' +
                '<div class="thread-message-header">' +
                  '<span class="thread-message-from">' + sender + '</span>' +
                  '<span class="thread-message-date">' + formatDate(m.internalDate) + '</span>' +
                '</div>' +
                (recipients ? '<div class="thread-message-recipients">To: ' + recipients + '</div>' : '') +
                '<div class="thread-message-snippet">' + escapeHtml(m.snippet || '') + '</div>' +
              '</div>'
            }

            html += '</div>'
            return html
          }

          function renderPersonResult(result) {
            const person = result.person
            const stats = result.stats
            const messages = result.messages || []
            let html = '<div class="person-card">' +
              '<div class="person-name">' + escapeHtml(person.name) + '</div>' +
              '<div class="person-email">' + escapeHtml(person.email) + '</div>' +
              '<div class="stats">' +
                '<span>Sent: ' + stats.sent + '</span>' +
                '<span>Received: ' + stats.received + '</span>' +
                '<span>Threads: ' + stats.threads + '</span>' +
              '</div>' +
            '</div>'
            html += renderMessages(messages, true)
            return html
          }

          async function search(query) {
            resultsEl.innerHTML = '<div class="loading">Searching...</div>'
            threadViewEl.classList.add('hidden')

            try {
              if (EMAIL_REGEX.test(query.trim())) {
                const res = await fetch('/search/graph/person/' + encodeURIComponent(query.trim()))
                const data = await res.json()
                if (data.error) {
                  resultsEl.innerHTML = '<div class="empty">' + escapeHtml(data.error) + '</div>'
                } else {
                  resultsEl.innerHTML = renderPersonResult(data)
                }
              } else {
                const res = await fetch('/search?q=' + encodeURIComponent(query) + '&type=messages&limit=50')
                const data = await res.json()
                if (data.results && data.results.messages) {
                  resultsEl.innerHTML = renderMessages(data.results.messages, true)
                } else {
                  resultsEl.innerHTML = '<div class="empty">No results found</div>'
                }
              }
            } catch (err) {
              resultsEl.innerHTML = '<div class="empty">Search failed: ' + escapeHtml(err.message) + '</div>'
            }
          }

          async function openThread(threadId) {
            resultsEl.classList.add('hidden')
            threadViewEl.classList.remove('hidden')
            threadViewEl.innerHTML = '<div class="loading">Loading thread...</div>'

            try {
              const res = await fetch('/search/graph/thread/' + encodeURIComponent(threadId))
              const data = await res.json()
              if (data.error) {
                threadViewEl.innerHTML = '<div class="thread-view"><div class="empty">' + escapeHtml(data.error) + '</div></div>'
              } else {
                threadViewEl.innerHTML = renderThreadView(data)
              }
            } catch (err) {
              threadViewEl.innerHTML = '<div class="thread-view"><div class="empty">Failed to load thread</div></div>'
            }
          }

          function closeThreadView() {
            threadViewEl.classList.add('hidden')
            threadViewEl.innerHTML = ''
            resultsEl.classList.remove('hidden')
          }

          searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && searchInput.value.trim()) {
              search(searchInput.value.trim())
            }
          })

          resultsEl.addEventListener('click', (e) => {
            const card = e.target.closest('.message-card')
            if (card && card.dataset.thread) {
              openThread(card.dataset.thread)
            }
          })

          checkAuth()
        `,
        }}
      />
    </>,
  )
})

export default ui
