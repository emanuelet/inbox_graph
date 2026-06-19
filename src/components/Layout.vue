<template>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{{ title }}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f5f5f5; color: #333; }
        .container { max-width: 900px; margin: 0 auto; padding: 20px; }
        header { background: #fff; border-bottom: 1px solid #e0e0e0; padding: 16px 0; margin-bottom: 24px; }
        header .container { display: flex; justify-content: space-between; align-items: center; }
        header h1 { font-size: 20px; font-weight: 600; }
        .btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; text-decoration: none; display: inline-block; }
        .btn-primary { background: #4285f4; color: #fff; }
        .btn-primary:hover { background: #3367d6; }
        .btn-secondary { background: #e0e0e0; color: #333; }
        .btn-secondary:hover { background: #d0d0d0; }
        .search-bar { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .search-input-wrapper { display: flex; align-items: center; gap: 8px; }
        .search-icon { color: #888; flex-shrink: 0; }
        .search-input { width: 100%; padding: 12px 0; border: none; outline: none; font-size: 16px; }
        .search-input:focus { outline: none; }
        .message-card { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); cursor: pointer; transition: box-shadow 0.15s; }
        .message-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
        .message-subject { font-weight: 600; font-size: 15px; margin-bottom: 4px; }
        .message-snippet { color: #666; font-size: 13px; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .message-meta { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #888; }
        .message-score { background: #e8f0fe; color: #1a73e8; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
        .thread-view { background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .thread-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #eee; }
        .thread-header h2 { font-size: 18px; }
        .thread-message { padding: 16px 0; border-bottom: 1px solid #f0f0f0; }
        .thread-message:last-child { border-bottom: none; }
        .thread-message-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .thread-message-from { font-weight: 600; font-size: 14px; }
        .thread-message-date { color: #888; font-size: 12px; }
        .thread-message-recipients { color: #666; font-size: 12px; margin-bottom: 8px; }
        .thread-message-snippet { color: #444; font-size: 13px; }
        .person-card { background: #fff; border-radius: 8px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .person-name { font-weight: 600; font-size: 15px; }
        .person-email { color: #666; font-size: 13px; }
        .stats { display: flex; gap: 16px; margin: 12px 0; font-size: 13px; color: #666; }
        .stats span { background: #f0f0f0; padding: 4px 10px; border-radius: 10px; }
        .empty { text-align: center; padding: 40px; color: #888; }
        .loading { text-align: center; padding: 40px; color: #888; }
        .hidden { display: none; }
        .auth-status { font-size: 13px; color: #666; }
        .auth-status.authenticated { color: #34a853; }
        .auth-status.unauthenticated { color: #ea4335; }
        .toast { position: fixed; bottom: 20px; right: 20px; background: #333; color: #fff; padding: 12px 20px; border-radius: 8px; font-size: 13px; opacity: 0; transition: opacity 0.3s; pointer-events: none; }
        .toast.show { opacity: 1; }
      </style>
    </head>
    <body><slot /></body>
  </html>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  title?: string
}>(), {
  title: 'Inbox Graph',
})
</script>
