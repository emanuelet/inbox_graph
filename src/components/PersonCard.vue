<template>
  <div class="person-card">
    <div class="person-name">{{ data.person.name }}</div>
    <div class="person-email">{{ data.person.email }}</div>
    <div class="stats">
      <span>Sent: {{ data.stats.sent }}</span>
      <span>Received: {{ data.stats.received }}</span>
      <span>Threads: {{ data.stats.threads }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  data: {
    person: { name: string; email: string; _key: string }
    stats: { sent: number; received: number; threads: number }
  }
}>()
</script>
