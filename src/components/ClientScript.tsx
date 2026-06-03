export function ClientScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
(function() {
  var r = document.getElementById('results')
  var t = document.getElementById('thread-view')
  var i = document.getElementById('search-input')
  var a = document.getElementById('auth-status')

  var ER = /^[\\w.+-]+@[\\w-]+\\.[\\w.-]+$/

  function load(url, el) {
    el.innerHTML = '<div class="loading">Searching...</div>'
    fetch(url).then(function(r) { return r.text() }).then(function(h) {
      el.innerHTML = h
    }).catch(function() {
      el.innerHTML = '<div class="empty">Request failed</div>'
    })
  }

  i.addEventListener('keydown', function(e) {
    if (e.key !== 'Enter' || !i.value.trim()) return
    t.classList.add('hidden')
    var q = i.value.trim()
    if (ER.test(q)) {
      load('/html/person/' + encodeURIComponent(q), r)
    } else {
      load('/html/search?q=' + encodeURIComponent(q) + '&limit=50', r)
    }
  })

  r.addEventListener('click', function(e) {
    var c = e.target.closest('.message-card')
    if (!c || !c.dataset.thread) return
    r.classList.add('hidden')
    t.classList.remove('hidden')
    load('/html/thread/' + encodeURIComponent(c.dataset.thread), t)
  })

  t.addEventListener('click', function(e) {
    if (e.target.id === 'back-btn') {
      t.classList.add('hidden')
      t.innerHTML = ''
      r.classList.remove('hidden')
    }
  })

  fetch('/auth/status').then(function(r) { return r.json() }).then(function(d) {
    a.textContent = d.authenticated ? 'Authenticated' : 'Not authenticated'
    a.classList.add(d.authenticated ? 'authenticated' : 'unauthenticated')
  }).catch(function() { a.textContent = 'Error' })
})()
        `,
      }}
    />
  )
}
