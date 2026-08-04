<template>
  <div v-if="!messages.length && !people.length" class="empty">No results found</div>
  <template v-else>
    <PersonCard v-if="person && stats" :data="{ person, stats }" />
    <button
      v-for="result in people"
      :key="result._key"
      type="button"
      class="message-card"
      @click="emit('select-person', result.email)"
    >
      <div class="message-subject">{{ result.name || result.email }}</div>
      <div class="message-snippet">{{ result.email }}</div>
    </button>
    <MessageCard v-for="m in messages" :key="m._key" :message="m" @click="emit('select-thread', m.threadId)" />
  </template>
</template>

<script setup lang="ts">
import type { MessageData } from './MessageCard.vue'
import MessageCard from './MessageCard.vue'
import PersonCard from './PersonCard.vue'

defineProps<{
  messages: MessageData[]
  people: Array<{ _key: string; name: string; email: string }>
  person?: { name: string; email: string; _key: string } | null
  stats?: { sent: number; received: number; threads: number } | null
}>()

const emit = defineEmits<{
  'select-thread': [threadId: string]
  'select-person': [email: string]
}>()
</script>
