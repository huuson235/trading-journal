<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { JournalEntry, SortDirection, SortField } from '@/types/journal'
import { DIRECTIONS, SESSIONS } from '@/types/journal'
import ImagesCell from './ImagesCell.vue'
import PairInput from './PairInput.vue'
import DateInput from './DateInput.vue'

defineProps<{
  entries: JournalEntry[]
  pairSuggestions: string[]
  sortField: SortField
  sortDirection: SortDirection
  hasAnyEntries: boolean
  readonly?: boolean
  uploadHandler?: (entryId: number, file: File) => Promise<void>
  removeImageHandler?: (entryId: number, imageId: number) => Promise<void>
}>()

const emit = defineEmits<{
  remove: [id: number]
  sort: [field: SortField]
}>()

const cellInput =
  'w-full min-w-0 rounded border-0 bg-transparent px-1 py-1 text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400/50 dark:focus:ring-indigo-500/50'

const cellTextarea =
  cellInput +
  ' resize-none leading-snug break-words whitespace-pre-wrap [field-sizing:content] min-h-[1.5rem]'

const cellSelect = cellInput + ' cursor-pointer'

const mobileInput =
  'w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800'

const sortableTh =
  'inline-flex w-full items-center gap-0.5 transition hover:text-zinc-700 dark:hover:text-zinc-200'

const actionBtn =
  'rounded p-0.5 text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800'

function pnlClass(pnl: number | null) {
  if (pnl == null || pnl === 0) return 'text-zinc-500'
  return pnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
}

function rowBgClass(pnl: number | null) {
  if (pnl == null || pnl === 0) {
    return 'hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30'
  }
  if (pnl > 0) {
    return 'bg-emerald-100 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-950/60'
  }
  return 'bg-rose-100 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-950/60'
}

function stickyCellClass(pnl: number | null) {
  if (pnl == null || pnl === 0) {
    return 'bg-white group-hover:bg-zinc-50/80 dark:bg-zinc-900 dark:group-hover:bg-zinc-800/30'
  }
  if (pnl > 0) {
    return 'bg-emerald-100 group-hover:bg-emerald-100 dark:bg-emerald-950/50 dark:group-hover:bg-emerald-950/60'
  }
  return 'bg-rose-100 group-hover:bg-rose-100 dark:bg-rose-950/50 dark:group-hover:bg-rose-950/60'
}

function mobileCardClass(pnl: number | null) {
  if (pnl == null || pnl === 0) {
    return 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
  }
  if (pnl > 0) {
    return 'border-emerald-300 bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/50'
  }
  return 'border-rose-300 bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50'
}

function directionClass(direction: string) {
  return direction === 'LONG'
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400'
}

function sortMark(field: SortField, active: SortField, dir: SortDirection) {
  if (field !== active) return ''
  return dir === 'asc' ? '↑' : '↓'
}

function thClass(field: SortField, active: SortField) {
  return field === active ? 'text-indigo-600 dark:text-indigo-400' : ''
}
</script>

<template>
  <div class="space-y-3">
    <div
      class="hidden overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:block"
    >
      <div class="overflow-x-auto">
        <table class="w-full min-w-[952px] border-collapse text-left">
          <thead>
            <tr class="border-b border-zinc-200 bg-zinc-50 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
              <th class="sticky left-0 z-20 w-9 bg-zinc-50 px-1.5 py-1.5 dark:bg-zinc-900/80">No.</th>
              <th class="sticky left-9 z-20 w-[104px] bg-zinc-50 px-1.5 py-1.5 dark:bg-zinc-900/80">
                <button type="button" :class="[sortableTh, thClass('date', sortField)]" @click="emit('sort', 'date')">
                  Date <span class="text-[9px]">{{ sortMark('date', sortField, sortDirection) }}</span>
                </button>
              </th>
              <th class="w-[80px] px-1.5 py-1.5">
                <button type="button" :class="[sortableTh, thClass('session', sortField)]" @click="emit('sort', 'session')">
                  Session <span class="text-[9px]">{{ sortMark('session', sortField, sortDirection) }}</span>
                </button>
              </th>
              <th class="w-[76px] px-1.5 py-1.5">
                <button type="button" :class="[sortableTh, thClass('pair', sortField)]" @click="emit('sort', 'pair')">
                  Pair <span class="text-[9px]">{{ sortMark('pair', sortField, sortDirection) }}</span>
                </button>
              </th>
              <th class="w-[80px] px-1.5 py-1.5">
                <button type="button" :class="[sortableTh, thClass('direction', sortField)]" @click="emit('sort', 'direction')">
                  Dir <span class="text-[9px]">{{ sortMark('direction', sortField, sortDirection) }}</span>
                </button>
              </th>
              <th class="w-10 px-1.5 py-1.5 text-right">
                <button type="button" :class="[sortableTh, 'justify-end', thClass('rr', sortField)]" @click="emit('sort', 'rr')">
                  R:R <span class="text-[9px]">{{ sortMark('rr', sortField, sortDirection) }}</span>
                </button>
              </th>
              <th v-if="!readonly" class="w-12 px-1.5 py-2 text-right">
                <button type="button" :class="[sortableTh, 'justify-end', thClass('pnl', sortField)]" @click="emit('sort', 'pnl')">
                  PnL <span class="text-[9px]">{{ sortMark('pnl', sortField, sortDirection) }}</span>
                </button>
              </th>
              <th class="min-w-[160px] px-1.5 py-2">Note</th>
              <th class="min-w-[180px] w-[180px] px-1.5 py-2">Images</th>
              <th class="w-[72px] px-0.5 py-1.5" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr
              v-for="entry in entries"
              :key="entry.id"
              class="group min-h-[2.25rem] transition-colors"
              :class="[rowBgClass(entry.pnl), !entry.visible ? 'opacity-50' : '']"
            >
              <td :class="['sticky left-0 z-10 whitespace-nowrap px-1.5 py-1 font-mono text-[11px] text-zinc-400', stickyCellClass(entry.pnl)]">
                {{ entry.no }}
              </td>
              <td :class="['sticky left-9 z-10 min-w-[104px] whitespace-nowrap px-0.5 py-1', stickyCellClass(entry.pnl)]">
                <DateInput v-model="entry.date" :input-class="cellInput" :readonly="readonly" />
              </td>
              <td class="whitespace-nowrap px-0.5 py-1">
                <select v-model="entry.session" :class="cellSelect" :disabled="readonly">
                  <option v-for="s in SESSIONS" :key="s" :value="s">{{ s }}</option>
                </select>
              </td>
              <td class="min-w-[76px] whitespace-nowrap px-0.5 py-1">
                <PairInput
                  v-model="entry.pair"
                  :suggestions="pairSuggestions"
                  :input-class="cellInput + ' uppercase'"
                  placeholder="—"
                  :readonly="readonly"
                />
              </td>
              <td class="min-w-[80px] whitespace-nowrap px-0.5 py-1">
                <select
                  v-model="entry.direction"
                  :class="[cellSelect, 'font-medium', directionClass(entry.direction)]"
                  :disabled="readonly"
                >
                  <option v-for="d in DIRECTIONS" :key="d" :value="d">{{ d }}</option>
                </select>
              </td>
              <td class="whitespace-nowrap px-0.5 py-1">
                <input
                  v-model.number="entry.rr"
                  type="number"
                  step="any"
                  placeholder="—"
                  :readonly="readonly"
                  :class="cellInput + ' no-spinner text-right'"
                />
              </td>
              <td v-if="!readonly" class="whitespace-nowrap px-0.5 py-1">
                <input
                  v-model.number="entry.pnl"
                  type="number"
                  step="any"
                  placeholder="—"
                  :readonly="readonly"
                  :class="[cellInput, 'no-spinner text-right font-medium', pnlClass(entry.pnl)]"
                />
              </td>
              <td class="min-w-[160px] max-w-[200px] align-middle px-0.5 py-1">
                <textarea
                  v-model="entry.note"
                  rows="1"
                  placeholder="—"
                  :readonly="readonly"
                  :class="cellTextarea"
                />
              </td>
              <td class="min-w-[180px] w-[180px] align-middle px-0.5 py-1">
                <ImagesCell
                  :entry-id="entry.id"
                  :images="entry.images"
                  :readonly="readonly"
                  :upload-handler="readonly ? undefined : uploadHandler"
                  :remove-image-handler="readonly ? undefined : removeImageHandler"
                />
              </td>
              <td class="whitespace-nowrap px-0.5 py-1">
                <div class="flex items-center justify-end gap-0.5">
                  <button
                    v-if="!readonly"
                    type="button"
                    :class="[
                      actionBtn,
                      entry.visible
                        ? 'text-zinc-400 opacity-70 group-hover:opacity-100'
                        : 'text-amber-500 opacity-100',
                    ]"
                    :title="entry.visible ? 'Đang hiện — click để ẩn khỏi người xem' : 'Đang ẩn — click để hiện'"
                    @click="entry.visible = !entry.visible"
                  >
                    <svg v-if="entry.visible" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12.05 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  </button>
                  <RouterLink
                    v-if="entry.visible"
                    :to="{ name: 'entry-detail', params: { id: entry.id } }"
                    target="_blank"
                    :class="[actionBtn, 'opacity-70 group-hover:opacity-100']"
                    title="Xem & chia sẻ"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                  </RouterLink>
                  <button
                    v-if="!readonly"
                    type="button"
                    class="rounded p-0.5 text-zinc-300 opacity-0 transition hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100 dark:hover:bg-rose-950/50 dark:hover:text-rose-400"
                    title="Xóa"
                    @click="emit('remove', entry.id)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        v-if="entries.length === 0"
        class="px-4 py-12 text-center text-sm text-zinc-400"
      >
        {{ hasAnyEntries ? 'Không có giao dịch trong khoảng thời gian này.' : 'Chưa có giao dịch. Nhấn "Thêm dòng" để bắt đầu.' }}
      </div>
    </div>

    <!-- Mobile -->
    <div class="space-y-2 md:hidden">
      <div
        v-if="entries.length === 0"
        class="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-400 dark:border-zinc-700"
      >
        {{ hasAnyEntries ? 'Không có giao dịch trong khoảng thời gian này.' : 'Chưa có giao dịch. Nhấn "Thêm dòng" để bắt đầu.' }}
      </div>

      <article
        v-for="entry in entries"
        :key="entry.id"
        class="rounded-lg border p-3 shadow-sm"
        :class="[mobileCardClass(entry.pnl), !entry.visible ? 'opacity-50' : '']"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <span class="font-mono text-xs text-zinc-400">#{{ entry.no }}</span>
            <DateInput
              v-model="entry.date"
              :input-class="mobileInput + ' !min-w-[128px]'"
              :readonly="readonly"
            />
          </div>
          <div class="flex items-center gap-1">
            <button
              v-if="!readonly"
              type="button"
              :class="[actionBtn, 'p-1', entry.visible ? '' : 'text-amber-500']"
              :title="entry.visible ? 'Ẩn khỏi người xem' : 'Hiện cho người xem'"
              @click="entry.visible = !entry.visible"
            >
              <svg v-if="entry.visible" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12.05 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" />
              </svg>
            </button>
            <RouterLink
              v-if="entry.visible"
              :to="{ name: 'entry-detail', params: { id: entry.id } }"
              target="_blank"
              :class="[actionBtn, 'p-1']"
              title="Xem & chia sẻ"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </RouterLink>
            <button
              v-if="!readonly"
              type="button"
              class="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/50"
              @click="emit('remove', entry.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>

        <div class="mb-2 grid grid-cols-2 gap-2">
          <div>
            <label class="mb-0.5 block text-[10px] uppercase text-zinc-400">Session</label>
            <select v-model="entry.session" :class="mobileInput" :disabled="readonly">
              <option v-for="s in SESSIONS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div>
            <label class="mb-0.5 block text-[10px] uppercase text-zinc-400">Pair</label>
            <PairInput
              v-model="entry.pair"
              :suggestions="pairSuggestions"
              :input-class="mobileInput + ' uppercase'"
              :readonly="readonly"
            />
          </div>
          <div>
            <label class="mb-0.5 block text-[10px] uppercase text-zinc-400">Direction</label>
            <select
              v-model="entry.direction"
              :class="[mobileInput, 'font-medium', directionClass(entry.direction)]"
              :disabled="readonly"
            >
              <option v-for="d in DIRECTIONS" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>
          <div>
            <label class="mb-0.5 block text-[10px] uppercase text-zinc-400">R:R</label>
            <input v-model.number="entry.rr" type="number" step="any" :readonly="readonly" :class="mobileInput + ' no-spinner'" />
          </div>
          <div v-if="!readonly" class="col-span-2">
            <label class="mb-0.5 block text-[10px] uppercase text-zinc-400">PnL</label>
            <input
              v-model.number="entry.pnl"
              type="number"
              step="any"
              placeholder="0"
              :readonly="readonly"
              :class="[mobileInput, 'no-spinner font-medium tabular-nums', pnlClass(entry.pnl)]"
            />
          </div>
        </div>

        <div class="mb-2">
          <label class="mb-0.5 block text-[10px] uppercase text-zinc-400">Note</label>
          <textarea
            v-model="entry.note"
            rows="2"
            placeholder="Ghi chú giao dịch..."
            :readonly="readonly"
            class="w-full resize-none rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs leading-snug break-words whitespace-pre-wrap dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div>
          <label class="mb-0.5 block text-[10px] font-medium uppercase text-zinc-400">Images</label>
          <ImagesCell
            :entry-id="entry.id"
            :images="entry.images"
            :readonly="readonly"
            :upload-handler="readonly ? undefined : uploadHandler"
            :remove-image-handler="readonly ? undefined : removeImageHandler"
          />
        </div>
      </article>
    </div>
  </div>
</template>
