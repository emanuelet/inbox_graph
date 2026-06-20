<template>
  <div class="message-card" @click="emit('click')">
    <div class="message-subject">
      <template v-if="sender">{{ sender }} — </template>
      {{ message.subject || '(no subject)' }}
      <span v-if="message.direction" style="color: #888; font-size: 12px"> ({{ message.direction }})</span>
    </div>
    <div class="message-snippet">{{ message.snippet || '' }}</div>
    <div class="message-meta">
      <span>{{ formattedDate }}</span>
      <span v-if="message.score != null" class="message-score">{{ message.score.toFixed(2) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

export interface MessageData {
  _key: string
  subject?: string
  snippet?: string
  internalDate?: string
  threadId: string
  gmailUrl?: string
  score?: number
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
