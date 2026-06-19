<template>
  <Layout>
    <header>
      <div class="container">
        <h1>Inbox Graph</h1>
        <div>
          <span id="auth-status" :class="['auth-status', authClass]">{{ authStatus }}</span>
          <a href="/auth/google" class="btn btn-primary" style="margin-left: 12px">
            <Mail :size="14" style="margin-right: 4px; vertical-align: middle" />
            Login with Gmail
          </a>
        </div>
      </div>
    </header>
    <div class="container">
      <div class="search-bar">
        <div class="search-input-wrapper">
          <Search :size="18" class="search-icon" />
          <input
            ref="searchInput"
            v-model="query"
            type="text"
            class="search-input"
            placeholder="Search emails or enter an email address..."
            @keydown.enter="doSearch"
          />
        </div>
      </div>

      <div v-if="loading" class="loading">Searching...</div>
      <div v-else-if="error" class="empty">{{ error }}</div>

      <ResultsList
        v-else-if="results && !showThread"
        :messages="results"
        :person="person"
        :stats="stats"
        @select-thread="openThread"
      />

      <ThreadView
        v-if="showThread && threadMessages"
        :thread="{ _key: threadKey }"
        :messages="threadMessages"
        @back="closeThread"
      />
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast, POSITION } from 'vue-toastification'
import { Mail, Search } from '@lucide/vue'
import Layout from './Layout.vue'
import ResultsList from './ResultsList.vue'
import ThreadView from './ThreadView.vue'
import type { MessageData } from './MessageCard.vue'
import type { ThreadMessageData } from './ThreadView.vue'

const EMAIL_RE = /^[\w.+-]+@[\w-]+\.[\w.-]+$/

const toast = useToast()
const query = ref('')
const searchInput = ref<HTMLInputElement>()
const loading = ref(false)
const error = ref('')
const results = ref<MessageData[] | null>(null)
const person = ref<{ name: string; email: string; _key: string } | null>(null)
const stats = ref<{ sent: number; received: number; threads: number } | null>(null)
const showThread = ref(false)
const threadKey = ref('')
const threadMessages = ref<ThreadMessageData[] | null>(null)
const authStatus = ref('Checking...')
const authClass = ref('')

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.get('auth') === 'success') {
    toast.success('Authenticated successfully')
    const url = new URL(window.location.href)
    url.searchParams.delete('auth')
    window.history.replaceState({}, '', url)
  }

  fetch('/auth/status')
    .then((r) => r.json())
    .then((d) => {
      authStatus.value = d.authenticated ? 'Authenticated' : 'Not authenticated'
      authClass.value = d.authenticated ? 'authenticated' : 'unauthenticated'
    })
    .catch(() => {
      authStatus.value = 'Error'
    })
})

async function doSearch() {
  const q = query.value.trim()
  if (!q) return

  showThread.value = false
  threadMessages.value = null
  error.value = ''
  loading.value = true

  try {
    if (EMAIL_RE.test(q)) {
      const res = await fetch(`/search/graph/person/${encodeURIComponent(q)}`)
      if (!res.ok) throw new Error('Person not found')
      const data = await res.json()
      results.value = data.messages
      person.value = data.person
      stats.value = data.stats
    } else {
      const res = await fetch(`/search?q=${encodeURIComponent(q)}&type=messages&limit=50`)
      if (!res.ok) throw new Error('Search failed')
      const data = await res.json()
      results.value = data.results.messages
      person.value = null
      stats.value = null
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Request failed'
    results.value = null
  } finally {
    loading.value = false
  }
}

async function openThread(threadId: string) {
  showThread.value = true
  threadKey.value = threadId
  threadMessages.value = null
  error.value = ''
  loading.value = true

  try {
    const res = await fetch(`/search/graph/thread/${encodeURIComponent(threadId)}`)
    if (!res.ok) throw new Error('Thread not found')
    const data = await res.json()
    threadMessages.value = data.messages
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Request failed'
    showThread.value = false
  } finally {
    loading.value = false
  }
}

function closeThread() {
  showThread.value = false
  threadMessages.value = null
}
</script>
