<template>
  <div class="message-card" @click="emit('click')">
    <div class="message-subject">
      <template v-if="sender">{{ sender }} — </template>
      {{ message.subject || '(no subject)' }}
      <span v-if="message.direction" style="color: #888; font-size: 12px"> ({{ message.direction }})</span>
    </div>
    <div class="message-snippet">{{ message.snippet || '' }}</div>
    <div class="message-meta">
      <span class="message-date">{{ formattedDate }}</span>
      <a v-if="message.gmailUrl" :href="message.gmailUrl" target="_blank" class="message-gmail-link" @click.stop>
        Open in Gmail
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface MessageData {
  _key: string
  subject?: string
  snippet?: string
  payload?: unknown
  internalDate?: string
  threadId: string
  gmailUrl?: string
  direction?: string
  sender?: { name: string; email: string }
}

const props = defineProps<{
  message: MessageData
}>()

const emit = defineEmits<{
  click: []
}>()

const sender = computed(() => props.message.sender?.name || props.message.sender?.email || '')

const formattedDate = computed(() => {
  if (!props.message.internalDate) return ''
  return new Date(parseInt(props.message.internalDate, 10)).toLocaleString()
})
</script>
