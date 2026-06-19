<template>
  <Layout>
    <header>
      <div class="container">
        <h1>Inbox Graph</h1>
        <div>
          <span id="auth-status" class="auth-status">Checking...</span>
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
          <input type="text" id="search-input" class="search-input" placeholder="Search emails or enter an email address..." autofocus />
        </div>
      </div>
      <div id="results" />
      <div id="thread-view" class="hidden" />
    </div>
    <ClientScript />
  </Layout>
</template>

<script setup lang="ts">
import Layout from './Layout.vue'
import ClientScript from './ClientScript.vue'
import { Mail, Search } from '@lucide/vue'
</script>
