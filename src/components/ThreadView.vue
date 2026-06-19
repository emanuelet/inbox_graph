<template>
  <div class="thread-view">
    <div class="thread-header">
      <h2>Thread: {{ subject }}</h2>
      <button id="back-btn" type="button" class="btn btn-secondary">Back</button>
    </div>
    <div v-for="m in messages" :key="m._key" class="thread-message">
      <div class="thread-message-header">
        <span class="thread-message-from">{{ fromName(m) }}</span>
        <span class="thread-message-date">{{ formatDate(m) }}</span>
      </div>
      <div v-if="recipientsList(m)" class="thread-message-recipients">To: {{ recipientsList(m) }}</div>
      <div class="thread-message-snippet">{{ m.snippet || '' }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface ThreadMessageData {
  _key: string
  subject?: string
  snippet?: string
  internalDate?: string
  sender: { name: string; email: string }
  recipients: Array<{ name: string; email: string }>
}

const props = defineProps<{
  thread: { _key: string; updatedAt?: number }
  messages: ThreadMessageData[]
}>()

const subject = computed(() => props.messages[0]?.subject || '(no subject)')

function fromName(m: ThreadMessageData) {
  return m.sender?.name || m.sender?.email || 'Unknown'
}

function recipientsList(m: ThreadMessageData) {
  if (!m.recipients?.length) return ''
  return m.recipients.map((r: { name: string; email: string }) => r.name || r.email).join(', ')
}

function formatDate(m: ThreadMessageData) {
  if (!m.internalDate) return ''
  return new Date(parseInt(m.internalDate, 10)).toLocaleString()
}
</script>
