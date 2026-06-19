<template>
  <script v-pre>
(() => {
  const r = document.getElementById('results')
  const t = document.getElementById('thread-view')
  const i = document.getElementById('search-input')
  const a = document.getElementById('auth-status')

  const ER = /^[\w.+-]+@[\w-]+\.[\w.-]+$/

  function showToast(msg) {
    let toast = document.getElementById('toast')
    if (!toast) {
      toast = document.createElement('div')
      toast.id = 'toast'
      toast.className = 'toast'
      document.body.appendChild(toast)
    }
    toast.textContent = msg
    toast.classList.add('show')
    setTimeout(() => toast.classList.remove('show'), 4000)
  }

  const params = new URLSearchParams(window.location.search)
  if (params.get('auth') === 'success') {
    showToast('Authenticated successfully')
    const url = new URL(window.location.href)
    url.searchParams.delete('auth')
    window.history.replaceState({}, '', url)
  }

  function load(url, el) {
    el.innerHTML = '<div class="loading">Searching...</div>'
    fetch(url).then((r) => r.text()).then((h) => {
      el.innerHTML = h
    }).catch(() => {
      el.innerHTML = '<div class="empty">Request failed</div>'
    })
  }

  i.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || !i.value.trim()) return
    t.classList.add('hidden')
    const q = i.value.trim()
    if (ER.test(q)) {
      load(`/html/person/${encodeURIComponent(q)}`, r)
    } else {
      load(`/html/search?q=${encodeURIComponent(q)}&limit=50`, r)
    }
  })

  r.addEventListener('click', (e) => {
    const c = e.target.closest('.message-card')
    if (!c || !c.dataset.thread) return
    r.classList.add('hidden')
    t.classList.remove('hidden')
    load(`/html/thread/${encodeURIComponent(c.dataset.thread)}`, t)
  })

  t.addEventListener('click', (e) => {
    if (e.target.id === 'back-btn') {
      t.classList.add('hidden')
      t.innerHTML = ''
      r.classList.remove('hidden')
    }
  })

  fetch('/auth/status').then((r) => r.json()).then((d) => {
    a.textContent = d.authenticated ? 'Authenticated' : 'Not authenticated'
    a.classList.add(d.authenticated ? 'authenticated' : 'unauthenticated')
  }).catch(() => { a.textContent = 'Error' })
})()
  </script>
</template>
