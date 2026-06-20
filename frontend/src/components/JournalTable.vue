<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { JournalEntry, SortDirection, SortField } from '@/types/journal'
import type { TimeframeSlot } from '@/api/journal'
import { SESSIONS } from '@/types/journal'
import TimeframeCell from './TimeframeCell.vue'
import PairInput from './PairInput.vue'
import DateInput from './DateInput.vue'

const props = defineProps<{
  entries: JournalEntry[]
  pairSuggestions: string[]
  sortField: SortField
  sortDirection: SortDirection
  hasAnyEntries: boolean
  imagesExpanded: boolean
  readonly?: boolean
  uploadHandler?: (entryId: number, slot: TimeframeSlot, file: File) => Promise<void>
  removeImageHandler?: (entryId: number, slot: TimeframeSlot) => Promise<void>
}>()

const emit = defineEmits<{
  remove: [id: number]
  sort: [field: SortField]
}>()

const expandedRowIds = ref(new Set<number>())
const collapsedRowIds = ref(new Set<number>())

const cellInput =
  'w-full min-w-0 rounded border-0 bg-transparent px-1 py-0.5 text-[11px] sm:text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400/50 dark:focus:ring-indigo-500/50'

const cellTextarea =
  cellInput +
  ' resize-none leading-snug break-words whitespace-pre-wrap [field-sizing:content] min-h-[1.25rem]'

const cellSelect = cellInput + ' cursor-pointer'

const mobileInput =
  'w-full rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800'

const sortableTh =
  'inline-flex w-full items-center gap-0.5 transition hover:text-zinc-700 dark:hover:text-zinc-200'

const actionBtn =
  'rounded p-0.5 text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800'

const anyRowExpanded = computed(() =>
  props.entries.some((e) => isRowExpanded(e.id)),
)

function isRowExpanded(id: number) {
  if (props.imagesExpanded) return !collapsedRowIds.value.has(id)
  return expandedRowIds.value.has(id)
}

function toggleRowExpand(id: number) {
  if (props.imagesExpanded) {
    const next = new Set(collapsedRowIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    collapsedRowIds.value = next
  } else {
    const next = new Set(expandedRowIds.value)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    expandedRowIds.value = next
  }
}

function pnlClass(pnl: number | null) {
  if (pnl == null || pnl === 0) return 'text-zinc-500'
  return pnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
}

function sortMark(field: SortField, active: SortField, dir: SortDirection) {
  if (field !== active) return ''
  return dir === 'asc' ? '↑' : '↓'
}

function thClass(field: SortField, active: SortField) {
  return field === active ? 'text-indigo-600 dark:text-indigo-400' : ''
}

watch(
  () => props.imagesExpanded,
  (expanded) => {
    if (expanded) collapsedRowIds.value = new Set()
  },
)
</script>

<template>
  <div class="space-y-3">
    <!-- Desktop / Tablet: one row per trade -->
    <div
      class="hidden overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:block"
    >
      <div class="overflow-x-auto">
        <table class="w-full min-w-[836px] border-collapse text-left">
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
              <th class="w-10 px-1.5 py-1.5 text-right">
                <button type="button" :class="[sortableTh, 'justify-end', thClass('rr', sortField)]" @click="emit('sort', 'rr')">
                  R:R <span class="text-[9px]">{{ sortMark('rr', sortField, sortDirection) }}</span>
                </button>
              </th>
              <th class="w-12 px-1.5 py-1.5 text-right">
                <button type="button" :class="[sortableTh, 'justify-end', thClass('pnl', sortField)]" @click="emit('sort', 'pnl')">
                  PnL <span class="text-[9px]">{{ sortMark('pnl', sortField, sortDirection) }}</span>
                </button>
              </th>
              <th class="min-w-[80px] px-1.5 py-1.5">Note</th>
              <th class="px-1 py-1.5" :class="anyRowExpanded ? 'min-w-[140px] w-[140px]' : 'w-[100px]'">HTF</th>
              <th class="px-1 py-1.5" :class="anyRowExpanded ? 'min-w-[140px] w-[140px]' : 'w-[100px]'">MTF</th>
              <th class="px-1 py-1.5" :class="anyRowExpanded ? 'min-w-[140px] w-[140px]' : 'w-[100px]'">LTF</th>
              <th class="w-14 px-0.5 py-1.5" />
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-100 dark:divide-zinc-800">
            <tr
              v-for="entry in entries"
              :key="entry.id"
              class="group transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/30"
            >
              <td class="sticky left-0 z-10 whitespace-nowrap bg-white px-1.5 font-mono text-[11px] text-zinc-400 group-hover:bg-zinc-50/80 dark:bg-zinc-900 dark:group-hover:bg-zinc-800/30">
                {{ entry.no }}
              </td>
              <td class="sticky left-9 z-10 min-w-[104px] whitespace-nowrap bg-white px-0.5 group-hover:bg-zinc-50/80 dark:bg-zinc-900 dark:group-hover:bg-zinc-800/30">
                <DateInput v-model="entry.date" :input-class="cellInput" :readonly="readonly" />
              </td>
              <td class="whitespace-nowrap px-0.5">
                <select v-model="entry.session" :class="cellSelect" :disabled="readonly">
                  <option v-for="s in SESSIONS" :key="s" :value="s">{{ s }}</option>
                </select>
              </td>
              <td class="min-w-[76px] whitespace-nowrap px-0.5">
                <PairInput
                  v-model="entry.pair"
                  :suggestions="pairSuggestions"
                  :input-class="cellInput + ' uppercase'"
                  placeholder="—"
                  :readonly="readonly"
                />
              </td>
              <td class="whitespace-nowrap px-0.5">
                <input
                  v-model.number="entry.rr"
                  type="number"
                  step="any"
                  placeholder="—"
                  :readonly="readonly"
                  :class="cellInput + ' no-spinner text-right'"
                />
              </td>
              <td class="whitespace-nowrap px-0.5">
                <input
                  v-model.number="entry.pnl"
                  type="number"
                  step="any"
                  placeholder="—"
                  :readonly="readonly"
                  :class="[cellInput, 'no-spinner text-right font-medium', pnlClass(entry.pnl)]"
                />
              </td>
              <td class="max-w-[140px] align-middle px-0.5 pt-1">
                <textarea
                  v-model="entry.note"
                  rows="1"
                  placeholder="—"
                  :readonly="readonly"
                  :class="cellTextarea"
                />
              </td>
              <td class="align-middle px-0.5">
                <TimeframeCell
                  v-model="entry.htf"
                  :entry-id="entry.id"
                  timeframe="htf"
                  :images-expanded="isRowExpanded(entry.id)"
                  :readonly="readonly"
                  :upload-handler="readonly ? undefined : uploadHandler"
                  :remove-image-handler="readonly ? undefined : removeImageHandler"
                />
              </td>
              <td class="align-middle px-0.5">
                <TimeframeCell
                  v-model="entry.mtf"
                  :entry-id="entry.id"
                  timeframe="mtf"
                  :images-expanded="isRowExpanded(entry.id)"
                  :readonly="readonly"
                  :upload-handler="readonly ? undefined : uploadHandler"
                  :remove-image-handler="readonly ? undefined : removeImageHandler"
                />
              </td>
              <td class="align-middle px-0.5">
                <TimeframeCell
                  v-model="entry.ltf"
                  :entry-id="entry.id"
                  timeframe="ltf"
                  :images-expanded="isRowExpanded(entry.id)"
                  :readonly="readonly"
                  :upload-handler="readonly ? undefined : uploadHandler"
                  :remove-image-handler="readonly ? undefined : removeImageHandler"
                />
              </td>
              <td class="whitespace-nowrap px-0.5">
                <div class="flex items-center justify-end gap-0.5">
                  <button
                    type="button"
                    :class="[
                      actionBtn,
                      isRowExpanded(entry.id)
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'opacity-70 group-hover:opacity-100',
                    ]"
                    :title="isRowExpanded(entry.id) ? 'Thu gọn ảnh' : 'Expand ảnh'"
                    @click="toggleRowExpand(entry.id)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
                      <path v-if="isRowExpanded(entry.id)" d="M4 14h6v6M14 4h6v6M14 10l7-7M3 21l7-7" />
                      <path v-else d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </button>
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

    <!-- Mobile: compact card rows -->
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
        class="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
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
              type="button"
              :class="[
                actionBtn,
                'p-1',
                isRowExpanded(entry.id) ? 'text-indigo-600 dark:text-indigo-400' : '',
              ]"
              :title="isRowExpanded(entry.id) ? 'Thu gọn ảnh' : 'Expand ảnh'"
              @click="toggleRowExpand(entry.id)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path v-if="isRowExpanded(entry.id)" d="M4 14h6v6M14 4h6v6M14 10l7-7M3 21l7-7" />
                <path v-else d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            </button>
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
            <label class="mb-0.5 block text-[10px] uppercase text-zinc-400">R:R</label>
            <input
              v-model.number="entry.rr"
              type="number"
              step="any"
              :readonly="readonly"
              :class="mobileInput + ' no-spinner'"
            />
          </div>
          <div>
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

        <div class="grid grid-cols-1 gap-1.5">
          <div>
            <label class="mb-0.5 block text-[10px] font-medium uppercase text-zinc-400">HTF</label>
            <TimeframeCell
              v-model="entry.htf"
              :entry-id="entry.id"
              timeframe="htf"
              :images-expanded="isRowExpanded(entry.id)"
              :readonly="readonly"
              :upload-handler="readonly ? undefined : uploadHandler"
              :remove-image-handler="readonly ? undefined : removeImageHandler"
            />
          </div>
          <div>
            <label class="mb-0.5 block text-[10px] font-medium uppercase text-zinc-400">MTF</label>
            <TimeframeCell
              v-model="entry.mtf"
              :entry-id="entry.id"
              timeframe="mtf"
              :images-expanded="isRowExpanded(entry.id)"
              :readonly="readonly"
              :upload-handler="readonly ? undefined : uploadHandler"
              :remove-image-handler="readonly ? undefined : removeImageHandler"
            />
          </div>
          <div>
            <label class="mb-0.5 block text-[10px] font-medium uppercase text-zinc-400">LTF</label>
            <TimeframeCell
              v-model="entry.ltf"
              :entry-id="entry.id"
              timeframe="ltf"
              :images-expanded="isRowExpanded(entry.id)"
              :readonly="readonly"
              :upload-handler="readonly ? undefined : uploadHandler"
              :remove-image-handler="readonly ? undefined : removeImageHandler"
            />
          </div>
        </div>
      </article>
    </div>
  </div>
</template>
