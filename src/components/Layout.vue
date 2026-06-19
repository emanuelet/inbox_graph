<template>
  <div id="app">
    <style v-text="css"></style>
    <slot />
  </div>
</template>

<script setup lang="ts">
import css from '../styles/app.scss?inline'
</script>
