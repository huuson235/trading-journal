<script setup lang="ts">
import { computed } from 'vue'
import { currencyFlagUrl, currencyName } from '@/types/news'

const props = withDefaults(
  defineProps<{
    code: string
    /** Chiều cao hiển thị (px) */
    size?: number
  }>(),
  { size: 14 },
)

const src = computed(() => currencyFlagUrl(props.code))
const label = computed(() => currencyName(props.code))
const width = computed(() => Math.round(props.size * (4 / 3)))
</script>

<template>
  <img
    v-if="src"
    :src="src"
    :alt="label"
    :title="label"
    :width="width"
    :height="size"
    loading="lazy"
    decoding="async"
    class="inline-block shrink-0 rounded-[2px] object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/15"
    :style="{ width: `${width}px`, height: `${size}px` }"
  />
  <span
    v-else
    class="inline-flex shrink-0 items-center justify-center rounded-[2px] bg-zinc-200 text-[8px] font-bold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300"
    :title="code"
    :style="{ width: `${width}px`, height: `${size}px` }"
  >
    {{ code.slice(0, 2).toUpperCase() }}
  </span>
</template>
