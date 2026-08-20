<script setup lang="ts">
const model = defineModel<string>({ required: true })

defineProps<{
  options: { value: string; tone: 'up' | 'down' | 'neutral' }[]
}>()

function select(value: string) {
  model.value = model.value === value ? '' : value
}

function toneClass(tone: 'up' | 'down' | 'neutral', active: boolean) {
  if (!active) return 'text-gray-400 hover:bg-gray-50 dark:text-zinc-500 dark:hover:bg-zinc-800'
  if (tone === 'up') return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
  if (tone === 'down') return 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
  return 'bg-gray-100 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300'
}
</script>

<template>
  <div class="inline-flex overflow-hidden rounded-md border border-gray-300 bg-white dark:border-zinc-600 dark:bg-zinc-800">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      class="flex h-10 w-11 items-center justify-center transition"
      :class="toneClass(option.tone, model === option.value)"
      :title="option.value"
      @click="select(option.value)"
    >
      <svg v-if="option.tone === 'up'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="h-5 w-5">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
      <svg v-else-if="option.tone === 'down'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="h-5 w-5">
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
      <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
        <circle cx="12" cy="12" r="9" />
        <path d="M5 5l14 14" />
      </svg>
    </button>
  </div>
</template>
