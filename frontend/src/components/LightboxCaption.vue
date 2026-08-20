<script setup lang="ts">
import { computed } from 'vue'
import type { ImageSlot, JournalEntry } from '@/types/journal'

const props = defineProps<{
  entry: JournalEntry
  slot?: ImageSlot | null
}>()

function formatFlag(value: string) {
  if (value === 'bullish') return 'Bullish'
  if (value === 'bearish') return 'Bearish'
  if (value === 'sideways') return 'Sideways'
  if (value === 'no_bias') return 'No bias'
  return value || '—'
}

function flagList(...flags: (string | false | undefined)[]) {
  return flags.filter(Boolean).join(' · ') || '—'
}

const items = computed(() => {
  const current = props.entry
  const slot = props.slot

  if (slot === 'htf') {
    return [
      { label: 'CTC', value: formatFlag(current.htfCtc) },
      { label: 'Bias', value: formatFlag(current.htfBias) },
      { label: 'PDA', value: current.htfPda || '—' },
      { label: 'DOL', value: current.htfDol || '—' },
    ]
  }
  if (slot === 'mtf') {
    return [
      { label: 'CTC', value: formatFlag(current.mtfCtc) },
      { label: 'PDA', value: current.mtfPda || '—' },
      { label: 'Model', value: current.mtfModel || '—' },
      {
        label: 'Flags',
        value: flagList(current.mtfSweep && 'Sweep', current.mtfCisd && 'CISD', current.mtfMss && 'MSS'),
      },
    ]
  }
  if (slot === 'ltf') {
    return [
      {
        label: 'Flags',
        value: flagList(current.ltfSweep && 'Sweep', current.ltfCisd && 'CISD', current.ltfMss && 'MSS'),
      },
      { label: 'Entry', value: current.ltfEntry || '—' },
    ]
  }

  return [
    { label: 'HTF CTC', value: formatFlag(current.htfCtc) },
    { label: 'Bias', value: formatFlag(current.htfBias) },
    { label: 'MTF CTC', value: formatFlag(current.mtfCtc) },
    { label: 'Model', value: current.mtfModel || '—' },
    { label: 'Entry', value: current.ltfEntry || '—' },
  ]
})
</script>

<template>
  <p v-if="slot" class="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/60">
    {{ slot }}
  </p>
  <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-white">
    <span v-for="item in items" :key="item.label">
      <span class="text-white/55">{{ item.label }}</span>
      {{ item.value }}
    </span>
  </div>
</template>
