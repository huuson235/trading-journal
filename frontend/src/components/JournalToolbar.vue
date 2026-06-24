<script setup lang="ts">
import DateInput from './DateInput.vue'
import type { SortDirection, SortField } from '@/types/journal'
import { isoToDisplay } from '@/utils/date'

const dateFrom = defineModel<string>('dateFrom', { required: true })
const dateTo = defineModel<string>('dateTo', { required: true })

defineProps<{
  sortField: SortField
  sortDirection: SortDirection
  resultCount: number
  totalCount: number
}>()

const emit = defineEmits<{
  resetWeek: []
  resetMonth: []
  sort: [field: SortField]
}>()

const filterInput =
  'min-w-[118px] rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900'

const sortFields: { key: SortField; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'session', label: 'Session' },
  { key: 'pair', label: 'Pair' },
  { key: 'direction', label: 'Dir' },
  { key: 'rr', label: 'R:R' },
  { key: 'pnl', label: 'PnL' },
]

function sortIcon(field: SortField, activeField: SortField, direction: SortDirection) {
  if (field !== activeField) return ''
  return direction === 'asc' ? '↑' : '↓'
}
</script>

<template>
  <div
    class="mb-3 space-y-2.5 rounded-lg border border-zinc-200 bg-white px-3 py-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:px-4"
  >
    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Từ</span>
        <DateInput v-model="dateFrom" :input-class="filterInput" />
      </div>
      <span class="hidden text-zinc-300 sm:inline dark:text-zinc-600">→</span>
      <div class="flex items-center gap-2">
        <span class="text-[10px] font-medium uppercase tracking-wide text-zinc-400">Đến</span>
        <DateInput v-model="dateTo" :input-class="filterInput" />
      </div>
      <button
        type="button"
        class="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        @click="emit('resetWeek')"
      >
        Tuần này
      </button>
      <button
        type="button"
        class="rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        @click="emit('resetMonth')"
      >
        Tháng này
      </button>
      <span class="ml-auto text-xs text-zinc-400">
        {{ resultCount }}/{{ totalCount }} giao dịch
        <span class="hidden sm:inline">
          ({{ isoToDisplay(dateFrom) }} – {{ isoToDisplay(dateTo) }})
        </span>
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-1.5">
      <span class="mr-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400">Sắp xếp</span>
      <button
        v-for="item in sortFields"
        :key="item.key"
        type="button"
        class="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition"
        :class="
          sortField === item.key
            ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
            : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
        "
        @click="emit('sort', item.key)"
      >
        {{ item.label }}
        <span v-if="sortField === item.key" class="text-[10px]">
          {{ sortIcon(item.key, sortField, sortDirection) }}
        </span>
      </button>
    </div>
  </div>
</template>
