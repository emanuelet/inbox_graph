<template>
  <div v-if="!messages.length" class="empty">No results found</div>
  <template v-else>
    <PersonCard v-if="person && stats" :data="{ person, stats }" />
    <MessageCard v-for="m in messages" :key="m._key" :message="m" />
  </template>
</template>

<script setup lang="ts">
import type { MessageData } from './MessageCard.vue'
import MessageCard from './MessageCard.vue'
import PersonCard from './PersonCard.vue'

defineProps<{
  messages: MessageData[]
  person?: { name: string; email: string; _key: string } | null
  stats?: { sent: number; received: number; threads: number } | null
}>()
</script>
