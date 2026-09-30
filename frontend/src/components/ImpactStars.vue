<script setup lang="ts">
import { computed } from 'vue'
import type { NewsImpact } from '@/types/news'

const props = defineProps<{
  impact: NewsImpact
  /** Kích thước sao (px) */
  size?: number
}>()

function normalize(impact: NewsImpact): string {
  const v = String(impact || '').trim()
  if (/holiday/i.test(v)) return 'Holiday'
  if (/high/i.test(v)) return 'High'
  if (/medium|med/i.test(v)) return 'Medium'
  if (/low/i.test(v)) return 'Low'
  return v || 'Low'
}

const kind = computed(() => normalize(props.impact))

const starCount = computed(() => {
  switch (kind.value) {
    case 'High':
      return 3
    case 'Medium':
      return 2
    case 'Low':
      return 1
    default:
      return 0
  }
})

const starClass = computed(() => {
  switch (kind.value) {
    case 'High':
      return 'text-red-600'
    case 'Medium':
      return 'text-orange-400'
    case 'Low':
      return 'text-emerald-500'
    default:
      return 'text-zinc-400'
  }
})

const px = computed(() => props.size ?? 12)
</script>

<template>
  <span
    v-if="kind === 'Holiday'"
    class="inline-flex items-center whitespace-nowrap text-[10px] font-medium text-sky-600 dark:text-sky-400"
  >
    Nghỉ lễ
  </span>
  <span
    v-else
    class="inline-flex items-center gap-px"
    :class="starClass"
    :title="kind"
    :aria-label="`${starCount} sao — ${kind}`"
  >
    <svg
      v-for="n in starCount"
      :key="n"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      class="shrink-0"
      :style="{ width: `${px}px`, height: `${px}px` }"
    >
      <path
        d="M12 2.5l2.9 6.1 6.7.7-5 4.6 1.4 6.6L12 17.8 5.99 20.5l1.4-6.6-5-4.6 6.7-.7L12 2.5z"
      />
    </svg>
  </span>
</template>
