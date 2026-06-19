<template>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{{ title }}</title>
      <style v-text="css"></style>
    </head>
    <body><slot /></body>
  </html>
</template>

<script setup lang="ts">
import css from '../styles/app.scss?inline'

withDefaults(defineProps<{
  title?: string
}>(), {
  title: 'Inbox Graph',
})
</script>
