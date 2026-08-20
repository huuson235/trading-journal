<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import type {
  Bias,
  Ctc,
  EntryImage,
  JournalEntry,
  MtfModel,
  Session,
  Timeframe,
  TradePayload,
  TradeResult,
} from '@/types/journal'
import { BIAS_OPTIONS, CTC_OPTIONS, MTF_MODELS, RESULTS, SESSIONS, TIMEFRAMES, timeframeHasLtf } from '@/types/journal'
import type { SlotFiles } from '@/composables/useJournal'
import { todayIso } from '@/utils/date'
import DateInput from './DateInput.vue'
import PairInput from './PairInput.vue'
import SegmentedChoice from './SegmentedChoice.vue'
import FormImageUpload from './FormImageUpload.vue'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  entry?: JournalEntry | null
  pairSuggestions: string[]
  saving?: boolean
}>()

const emit = defineEmits<{
  save: [payload: Partial<TradePayload>, files: SlotFiles, removedImageIds: number[]]
}>()

interface FormState {
  pair: string
  date: string
  rrIdea: string
  rrReal: string
  pnl: string
  session: Session | ''
  timeframe: Timeframe
  result: TradeResult
  note: string
  htfCtc: Ctc
  htfBias: Bias
  htfPda: string
  htfDol: string
  mtfCtc: Ctc
  mtfPda: string
  mtfModel: MtfModel
  mtfSweep: boolean
  mtfCisd: boolean
  mtfMss: boolean
  ltfSweep: boolean
  ltfCisd: boolean
  ltfMss: boolean
  ltfEntry: string
}

function emptyForm(): FormState {
  return {
    pair: '',
    date: todayIso(),
    rrIdea: '',
    rrReal: '',
    pnl: '',
    session: '',
    timeframe: '',
    result: '',
    note: '',
    htfCtc: '',
    htfBias: '',
    htfPda: '',
    htfDol: '',
    mtfCtc: '',
    mtfPda: '',
    mtfModel: '',
    mtfSweep: false,
    mtfCisd: false,
    mtfMss: false,
    ltfSweep: false,
    ltfCisd: false,
    ltfMss: false,
    ltfEntry: '',
  }
}

function fromEntry(entry: JournalEntry): FormState {
  return {
    pair: entry.pair ?? '',
    date: entry.date || todayIso(),
    rrIdea: entry.rrIdea == null ? '' : String(entry.rrIdea),
    rrReal: entry.rrReal == null ? '' : String(entry.rrReal),
    pnl: entry.pnl == null ? '' : String(entry.pnl),
    session: entry.session || '',
    timeframe: entry.timeframe || '',
    result: entry.result || '',
    note: entry.note || '',
    htfCtc: entry.htfCtc || '',
    htfBias: entry.htfBias || '',
    htfPda: entry.htfPda || '',
    htfDol: entry.htfDol || '',
    mtfCtc: entry.mtfCtc || '',
    mtfPda: entry.mtfPda || '',
    mtfModel: entry.mtfModel || '',
    mtfSweep: Boolean(entry.mtfSweep),
    mtfCisd: Boolean(entry.mtfCisd),
    mtfMss: Boolean(entry.mtfMss),
    ltfSweep: Boolean(entry.ltfSweep),
    ltfCisd: Boolean(entry.ltfCisd),
    ltfMss: Boolean(entry.ltfMss),
    ltfEntry: entry.ltfEntry || '',
  }
}

function toNumber(value: string | number | null | undefined): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const n = Number(String(value).trim())
  return Number.isFinite(n) ? n : null
}

const form = reactive<FormState>(emptyForm())
const pending = reactive<SlotFiles>({ htf: [], mtf: [], ltf: [] })
const removedImageIds = ref<number[]>([])
const existingImages = reactive<Record<'htf' | 'mtf' | 'ltf', EntryImage[]>>({
  htf: [],
  mtf: [],
  ltf: [],
})

const isEdit = computed(() => Boolean(props.entry?.id))
const title = computed(() => (isEdit.value ? 'Edit Trade' : 'New Trade'))

const ctcOptions = CTC_OPTIONS.map((value) => ({
  value,
  tone: value === 'bullish' ? 'up' : value === 'bearish' ? 'down' : 'neutral',
})) as { value: string; tone: 'up' | 'down' | 'neutral' }[]

const biasOptions = BIAS_OPTIONS.map((value) => ({
  value,
  tone: value === 'bullish' ? 'up' : value === 'bearish' ? 'down' : 'neutral',
})) as { value: string; tone: 'up' | 'down' | 'neutral' }[]

function resetPending() {
  pending.htf = []
  pending.mtf = []
  pending.ltf = []
  removedImageIds.value = []
}

function hydrate() {
  Object.assign(form, props.entry ? fromEntry(props.entry) : emptyForm())
  existingImages.htf = [...(props.entry?.htfImages ?? [])]
  existingImages.mtf = [...(props.entry?.mtfImages ?? [])]
  existingImages.ltf = [...(props.entry?.ltfImages ?? [])]
  resetPending()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') onClose()
}

watch(open, (value) => {
  if (value) {
    hydrate()
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeydown)
  } else {
    document.body.style.overflow = ''
    window.removeEventListener('keydown', onKeydown)
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
})

function onClear() {
  Object.assign(form, emptyForm())
  resetPending()
}

function onClose() {
  if (props.saving) return
  open.value = false
}

function removeExisting(slot: 'htf' | 'mtf' | 'ltf', id: number) {
  existingImages[slot] = existingImages[slot].filter((img) => img.id !== id)
  if (!removedImageIds.value.includes(id)) removedImageIds.value.push(id)
}

function onSubmit() {
  const payload: Partial<TradePayload> = {
    pair: form.pair.trim().toUpperCase(),
    date: form.date,
    rrIdea: toNumber(form.rrIdea),
    rrReal: toNumber(form.rrReal),
    pnl: toNumber(form.pnl),
    session: (form.session || 'No session') as Session,
    timeframe: form.timeframe,
    result: form.result,
    note: form.note.trim(),
    htfCtc: form.htfCtc,
    htfBias: form.htfBias,
    htfPda: form.htfPda.trim(),
    htfDol: form.htfDol.trim(),
    mtfCtc: form.mtfCtc,
    mtfPda: form.mtfPda.trim(),
    mtfModel: form.mtfModel,
    mtfSweep: form.mtfSweep,
    mtfCisd: form.mtfCisd,
    mtfMss: form.mtfMss,
    ltfSweep: form.ltfSweep,
    ltfCisd: form.ltfCisd,
    ltfMss: form.ltfMss,
    ltfEntry: form.ltfEntry.trim(),
    ltfExist: timeframeHasLtf(form.timeframe),
  }
  emit(
    'save',
    payload,
    {
      htf: [...pending.htf],
      mtf: [...pending.mtf],
      ltf: timeframeHasLtf(form.timeframe) ? [...pending.ltf] : [],
    },
    [...removedImageIds.value],
  )
}

const fieldWrap = 'relative'
const iconClass = 'pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400'
const inputClass =
  'w-full rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-[#1976D2] focus:ring-1 focus:ring-[#1976D2] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500'
const underlineInput =
  'w-full border-0 border-b border-gray-300 bg-transparent px-0 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-[#1976D2] dark:border-zinc-600 dark:text-zinc-100'
const selectClass = `${inputClass} appearance-none pr-10`
const chevronClass = 'pointer-events-none absolute right-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400'
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      @click.self="onClose"
    >
      <form
        class="flex max-h-[100dvh] w-full flex-col overflow-hidden bg-[#f5f5f5] shadow-2xl sm:max-h-[92vh] sm:rounded-xl md:max-w-[760px] lg:max-w-[1120px] dark:bg-zinc-900"
        @submit.prevent="onSubmit"
      >
        <header class="flex items-center gap-3 bg-[#1976D2] px-4 py-3 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
            <path d="M4 19V5M4 17h16M8 13l3-4 3 3 5-6" />
          </svg>
          <h2 class="text-base font-semibold tracking-wide">{{ title }}</h2>
        </header>

        <div class="flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
          <section class="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label class="label-field">Pair</label>
                <div :class="fieldWrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="iconClass">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M8 12h8M12 8v8" />
                  </svg>
                  <PairInput
                    v-model="form.pair"
                    :suggestions="pairSuggestions"
                    :input-class="inputClass + ' uppercase'"
                    placeholder="BTC"
                  />
                </div>
              </div>

              <div>
                <label class="label-field">Date</label>
                <div :class="fieldWrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="iconClass">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  <DateInput
                    v-model="form.date"
                    :input-class="inputClass + ' !pl-10'"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
              </div>

              <div>
                <label class="label-field">RR idea</label>
                <div :class="fieldWrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="iconClass">
                    <path d="M9 18h6M10 22h4M12 2a7 7 0 0 1 4 12c-.8.8-1 1.5-1 3H9c0-1.5-.2-2.2-1-3a7 7 0 0 1 4-12Z" />
                  </svg>
                  <input v-model="form.rrIdea" type="number" step="any" placeholder="Nhập ý tưởng RR" :class="[inputClass, 'no-spinner']" />
                </div>
              </div>

              <div>
                <label class="label-field">RR real</label>
                <div :class="fieldWrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="iconClass">
                    <circle cx="12" cy="12" r="8" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  <input v-model="form.rrReal" type="number" step="any" placeholder="Nhập RR thực tế" :class="[inputClass, 'no-spinner']" />
                </div>
              </div>

              <div>
                <label class="label-field">PnL</label>
                <div :class="fieldWrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="iconClass">
                    <path d="M4 19V5M4 17h16M7 14l4-5 3 3 5-7" />
                  </svg>
                  <input v-model="form.pnl" type="number" step="any" placeholder="Nhập PnL" :class="[inputClass, 'no-spinner']" />
                </div>
              </div>

              <div>
                <label class="label-field">Session</label>
                <div :class="fieldWrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="iconClass">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  <select v-model="form.session" :class="selectClass">
                    <option value="">Chọn phiên giao dịch</option>
                    <option v-for="item in SESSIONS" :key="item" :value="item">{{ item }}</option>
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="chevronClass">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>

              <div>
                <label class="label-field">Timeframe</label>
                <div :class="fieldWrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="iconClass">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M8 2v4M16 2v4M3 10h18" />
                  </svg>
                  <select v-model="form.timeframe" :class="selectClass">
                    <option value="">Chọn timeframe</option>
                    <option v-for="item in TIMEFRAMES" :key="item" :value="item">{{ item }}</option>
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="chevronClass">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>

              <div>
                <label class="label-field">Result</label>
                <div :class="fieldWrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="iconClass">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                    <path d="M4 22v-7" />
                  </svg>
                  <select v-model="form.result" :class="selectClass">
                    <option value="">Chọn kết quả</option>
                    <option v-for="item in RESULTS" :key="item" :value="item">{{ item }}</option>
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="chevronClass">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>

              <div class="md:col-span-2 lg:col-span-4">
                <label class="label-field">Note</label>
                <div class="relative">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="pointer-events-none absolute left-3 top-3 z-10 h-4 w-4 text-gray-400">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" x2="8" y1="13" y2="13" />
                    <line x1="16" x2="8" y1="17" y2="17" />
                    <line x1="10" x2="8" y1="9" y2="9" />
                  </svg>
                  <textarea
                    v-model="form.note"
                    rows="3"
                    placeholder="Nhập ghi chú"
                    class="w-full resize-y rounded-md border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-800 placeholder:text-gray-400 outline-none transition focus:border-[#1976D2] focus:ring-1 focus:ring-[#1976D2] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                  />
                </div>
              </div>
            </div>
          </section>

          <section class="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800">
            <h3 class="mb-3 text-sm font-semibold text-[#1976D2]">HTF</h3>
            <FormImageUpload
              v-model:pending="pending.htf"
              :existing="existingImages.htf"
              title="Upload Image"
              subtitle="Tải lên ảnh phân tích HTF"
              @remove-existing="removeExisting('htf', $event)"
            />
            <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label class="label-field">CTC</label>
                <SegmentedChoice v-model="form.htfCtc" :options="ctcOptions" />
              </div>
              <div>
                <label class="label-field">Bias</label>
                <SegmentedChoice v-model="form.htfBias" :options="biasOptions" />
              </div>
              <div>
                <label class="label-field">PDA</label>
                <input v-model="form.htfPda" type="text" placeholder="Nhập PDA" :class="underlineInput" />
              </div>
              <div>
                <label class="label-field">DOL</label>
                <input v-model="form.htfDol" type="text" placeholder="Nhập DOL" :class="underlineInput" />
              </div>
            </div>
          </section>

          <section class="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800">
            <h3 class="mb-3 text-sm font-semibold text-[#1976D2]">MTF</h3>
            <FormImageUpload
              v-model:pending="pending.mtf"
              :existing="existingImages.mtf"
              title="Upload Images"
              subtitle="Tải lên ảnh phân tích MTF"
              @remove-existing="removeExisting('mtf', $event)"
            />
            <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label class="label-field">CTC</label>
                <SegmentedChoice v-model="form.mtfCtc" :options="ctcOptions" />
              </div>
              <div>
                <label class="label-field">PDA</label>
                <input v-model="form.mtfPda" type="text" placeholder="Nhập PDA" :class="underlineInput" />
              </div>
              <div>
                <label class="label-field">Model</label>
                <div :class="fieldWrap">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="iconClass">
                    <path d="M12 3 4 7.5v9L12 21l8-4.5v-9L12 3Z" />
                    <path d="M12 12 4 7.5M12 12l8-4.5M12 12v9" />
                  </svg>
                  <select v-model="form.mtfModel" :class="selectClass">
                    <option value="">Chọn model</option>
                    <option v-for="item in MTF_MODELS" :key="item" :value="item">{{ item }}</option>
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="chevronClass">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
              </div>
              <div>
                <label class="label-field">Flags</label>
                <div class="flex h-[42px] flex-wrap items-center gap-4">
                  <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200">
                    <input v-model="form.mtfSweep" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-[#1976D2] focus:ring-[#1976D2]" />
                    Sweep
                  </label>
                  <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200">
                    <input v-model="form.mtfCisd" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-[#1976D2] focus:ring-[#1976D2]" />
                    CISD
                  </label>
                  <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200">
                    <input v-model="form.mtfMss" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-[#1976D2] focus:ring-[#1976D2]" />
                    MSS
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section v-if="timeframeHasLtf(form.timeframe)" class="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800">
            <h3 class="mb-3 text-sm font-semibold text-[#1976D2]">LTF</h3>
            <FormImageUpload
              v-model:pending="pending.ltf"
              :existing="existingImages.ltf"
              title="Upload Images"
              subtitle="Tải lên ảnh phân tích LTF"
              @remove-existing="removeExisting('ltf', $event)"
            />
            <div class="mt-4 flex flex-wrap gap-5">
              <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200">
                <input v-model="form.ltfSweep" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-[#1976D2] focus:ring-[#1976D2]" />
                Sweep
              </label>
              <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200">
                <input v-model="form.ltfCisd" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-[#1976D2] focus:ring-[#1976D2]" />
                CISD
              </label>
              <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-200">
                <input v-model="form.ltfMss" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-[#1976D2] focus:ring-[#1976D2]" />
                MSS
              </label>
            </div>
            <div class="mt-4">
              <label class="label-field">Entry</label>
              <textarea
                v-model="form.ltfEntry"
                rows="3"
                placeholder="Nhập điểm vào lệnh"
                class="w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 outline-none focus:border-[#1976D2] focus:ring-1 focus:ring-[#1976D2] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
          </section>
        </div>

        <footer class="flex items-center justify-between gap-2 border-t border-gray-200 bg-white px-3 py-3 sm:px-4 dark:border-zinc-700 dark:bg-zinc-800">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-md border border-rose-400 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:hover:bg-rose-950/30"
            :disabled="saving"
            @click="onClear"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Clear
          </button>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              :disabled="saving"
              @click="onClose"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <path d="M18 11V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v5" />
                <path d="M4 11h16l-1 9H5z" />
              </svg>
              Hủy
            </button>
            <button
              type="submit"
              class="inline-flex items-center gap-1.5 rounded-md bg-[#1976D2] px-4 py-2 text-sm font-medium text-white shadow hover:bg-[#1565C0] disabled:opacity-50"
              :disabled="saving"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-4 w-4">
                <circle cx="12" cy="12" r="9" />
                <path d="m8 12 3 3 5-6" />
              </svg>
              {{ saving ? 'Đang lưu...' : 'OK' }}
            </button>
          </div>
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.label-field {
  margin-bottom: 0.375rem;
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: #1976d2;
}
</style>
