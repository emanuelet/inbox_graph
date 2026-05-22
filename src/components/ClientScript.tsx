export function ClientScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  const resultsEl = document.getElementById('results')
  const threadEl = document.getElementById('thread-view')
  const input = document.getElementById('search-input')
  const authEl = document.getElementById('auth-status')

  const EMAIL_RE = /^[\\w.+-]+@[\\w-]+\\.[\\w.-]+$/

  function esc(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML }

  function date(ts) { return ts ? new Date(parseInt(ts)).toLocaleString() : '' }

  function score(s) { return s ? '<span class="message-score">' + s.toFixed(2) + '</span>' : '' }

  function msgHTML(m) {
    var sender = m.sender ? esc(m.sender.name || m.sender.email) : ''
    var dir = m.direction ? ' <span style="color:#888;font-size:12px">(' + esc(m.direction) + ')</span>' : ''
    return '<div class="message-card" data-thread="' + esc(m.threadId) + '">' +
      '<div class="message-subject">' + (sender ? esc(sender) + ' — ' : '') + esc(m.subject || '(no subject)') + dir + '</div>' +
      '<div class="message-snippet">' + esc(m.snippet || '') + '</div>' +
      '<div class="message-meta"><span>' + date(m.internalDate) + '</span>' + score(m.score) + '</div></div>'
  }

  function resultsHTML(data) {
    var msgs = data.results ? data.results.messages : data.messages || []
    if (msgs.length === 0) return '<div class="empty">No results found</div>'
    var out = ''
    if (data.person) {
      var p = data.person
      out += '<div class="person-card"><div class="person-name">' + esc(p.name) + '</div>' +
        '<div class="person-email">' + esc(p.email) + '</div>' +
        '<div class="stats"><span>Sent: ' + data.stats.sent + '</span>' +
        '<span>Received: ' + data.stats.received + '</span>' +
        '<span>Threads: ' + data.stats.threads + '</span></div></div>'
    }
    for (var i = 0; i < msgs.length; i++) out += msgHTML(msgs[i])
    return out
  }

  function threadHTML(data) {
    var msgs = data.messages || []
    var subject = msgs[0] ? esc(msgs[0].subject || '(no subject)') : ''
    var html = '<div class="thread-view">' +
      '<div class="thread-header"><h2>Thread: ' + subject + '</h2>' +
      '<button class="btn btn-secondary" onclick="window.__closeThread()">Back</button></div>'
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i]
      var from = m.sender ? esc(m.sender.name || m.sender.email) : 'Unknown'
      var to = m.recipients ? m.recipients.map(function(r) { return esc(r.name || r.email) }).join(', ') : ''
      html += '<div class="thread-message">' +
        '<div class="thread-message-header"><span class="thread-message-from">' + from + '</span>' +
        '<span class="thread-message-date">' + date(m.internalDate) + '</span></div>' +
        (to ? '<div class="thread-message-recipients">To: ' + to + '</div>' : '') +
        '<div class="thread-message-snippet">' + esc(m.snippet || '') + '</div></div>'
    }
    return html + '</div>'
  }

  window.__closeThread = function() {
    threadEl.classList.add('hidden')
    threadEl.innerHTML = ''
    resultsEl.classList.remove('hidden')
  }

  async function doSearch(q) {
    resultsEl.innerHTML = '<div class="loading">Searching...</div>'
    threadEl.classList.add('hidden')
    try {
      var url = EMAIL_RE.test(q.trim())
        ? '/search/graph/person/' + encodeURIComponent(q.trim())
        : '/search?q=' + encodeURIComponent(q) + '&type=messages&limit=50'
      var res = await fetch(url)
      var data = await res.json()
      resultsEl.innerHTML = data.error ? '<div class="empty">' + esc(data.error) + '</div>' : resultsHTML(data)
    } catch(e) { resultsEl.innerHTML = '<div class="empty">Search failed</div>' }
  }

  async function openThread(id) {
    resultsEl.classList.add('hidden')
    threadEl.classList.remove('hidden')
    threadEl.innerHTML = '<div class="loading">Loading thread...</div>'
    try {
      var res = await fetch('/search/graph/thread/' + encodeURIComponent(id))
      var data = await res.json()
      threadEl.innerHTML = data.error ? '<div class="thread-view"><div class="empty">' + esc(data.error) + '</div></div>' : threadHTML(data)
    } catch(e) { threadEl.innerHTML = '<div class="thread-view"><div class="empty">Failed to load thread</div></div>' }
  }

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && input.value.trim()) doSearch(input.value.trim())
  })

  resultsEl.addEventListener('click', function(e) {
    var card = e.target.closest('.message-card')
    if (card && card.dataset.thread) openThread(card.dataset.thread)
  })

  fetch('/auth/status').then(function(r) { return r.json() }).then(function(d) {
    authEl.textContent = d.authenticated ? 'Authenticated' : 'Not authenticated'
    authEl.classList.add(d.authenticated ? 'authenticated' : 'unauthenticated')
  }).catch(function() { authEl.textContent = 'Error' })
})()
        `,
      }}
    />
  )
}
