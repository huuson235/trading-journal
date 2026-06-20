<script setup lang="ts">
import { ref } from 'vue'
import BackgroundSettings from '@/components/BackgroundSettings.vue'

const showSettings = ref(false)
</script>

<template>
  <button
    type="button"
    class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
    aria-label="Tùy chỉnh nền trang"
    @click="showSettings = true"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" stroke="none" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  </button>

  <BackgroundSettings v-model:open="showSettings" />
</template>
