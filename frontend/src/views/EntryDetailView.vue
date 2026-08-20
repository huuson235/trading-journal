<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { fetchEntry } from '@/api/journal'
import ImageLightbox from '@/components/ImageLightbox.vue'
import LightboxCaption from '@/components/LightboxCaption.vue'
import { useAuth } from '@/composables/useAuth'
import type { EntryImage, JournalEntry } from '@/types/journal'
import { timeframeHasLtf } from '@/types/journal'
import { isoToDisplay } from '@/utils/date'
import { getTagClass } from '@/utils/tagStyles'

const route = useRoute()
const { canEditSlug } = useAuth()

const entry = ref<JournalEntry | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const copied = ref(false)
const lightboxIndex = ref(0)
const showLightbox = ref(false)

const allDetailImages = computed(() => {
  const current = entry.value
  if (!current) return [] as EntryImage[]
  const images = [
    ...(current.htfImages ?? []),
    ...(current.mtfImages ?? []),
  ]
  if (timeframeHasLtf(current.timeframe)) images.push(...(current.ltfImages ?? []))
  return images
})

const lightboxSources = computed(() => allDetailImages.value.map((img) => img.imageUrl))

const journalSlug = computed(() => String(route.params.slug ?? ''))
const entryId = computed(() => Number(route.params.id))
const canSeePnl = computed(() => canEditSlug(journalSlug.value))

const shareUrl = computed(() =>
  typeof window !== 'undefined'
    ? `${window.location.origin}/u/${journalSlug.value}/detail/${entryId.value}`
    : '',
)

function pnlClass(pnl: number | null) {
  if (pnl == null || pnl === 0) return 'text-zinc-500'
  return pnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
}

function resultClass(result: string) {
  if (result === 'Take profit') return 'bg-emerald-600 text-white'
  if (result === 'Stop loss') return 'bg-rose-600 text-white'
  if (result === 'BE') return 'bg-zinc-700 text-white'
  return 'bg-zinc-200 text-zinc-600'
}

function formatPnl(pnl: number | null) {
  if (pnl == null) return '—'
  return `${pnl >= 0 ? '+' : ''}${pnl}`
}

function formatRrPart(rr: number | null) {
  if (rr == null) return '—'
  return String(rr)
}

function formatFlag(value: string) {
  if (value === 'bullish') return 'Bullish'
  if (value === 'bearish') return 'Bearish'
  if (value === 'sideways') return 'Sideways'
  if (value === 'no_bias') return 'No bias'
  return value || '—'
}

function chipClass(value: string) {
  const v = value.trim().toLowerCase()
  if (v === 'bullish') return 'bg-emerald-600 text-white'
  if (v === 'bearish') return 'bg-rose-600 text-white'
  return 'bg-zinc-950 text-white'
}

const chipBase = 'inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium'

const headline = computed(() => {
  const current = entry.value
  if (!current) return ''
  const pair = (current.pair || '—').toUpperCase()
  const idea = formatRrPart(current.rrIdea)
  const real = formatRrPart(current.rrReal)
  const timeframe = current.timeframe || '—'
  return `${pair} - RR ${real}/${idea} - ${timeframe}`
})

function openImages(clicked: EntryImage) {
  const index = allDetailImages.value.findIndex((img) => img.id === clicked.id)
  lightboxIndex.value = index >= 0 ? index : 0
  showLightbox.value = true
}

async function loadEntry() {
  loading.value = true
  error.value = null
  entry.value = null

  if (!journalSlug.value || !Number.isFinite(entryId.value) || entryId.value <= 0) {
    error.value = 'ID giao dịch không hợp lệ'
    loading.value = false
    return
  }

  try {
    entry.value = await fetchEntry(journalSlug.value, entryId.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không tải được giao dịch'
  } finally {
    loading.value = false
  }
}

async function copyLink() {
  if (!shareUrl.value) return
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  } catch {
    /* ignore */
  }
}

onMounted(loadEntry)
watch([entryId, journalSlug], loadEntry)
</script>

<template>
  <div class="flex min-h-screen flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <header class="shrink-0 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div class="mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <RouterLink
          :to="{ name: 'journal', params: { slug: journalSlug } }"
          class="text-sm font-medium text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Trading Journal
        </RouterLink>
        <button
          v-if="entry"
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          @click="copyLink"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          {{ copied ? 'Đã copy!' : 'Copy link' }}
        </button>
      </div>
    </header>

    <main class="mx-auto w-full flex-1 px-4 py-6 sm:px-6 lg:min-h-0 lg:overflow-hidden lg:py-3">
      <div v-if="loading" class="py-24 text-center text-sm text-zinc-400">Đang tải...</div>

      <div
        v-else-if="error"
        class="rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center dark:border-rose-900 dark:bg-rose-950/40"
      >
        <p class="text-sm text-rose-700 dark:text-rose-300">{{ error }}</p>
        <RouterLink
          :to="{ name: 'journal', params: { slug: journalSlug } }"
          class="mt-4 inline-block text-xs font-medium text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Về nhật ký
        </RouterLink>
      </div>

      <article v-else-if="entry" class="space-y-5 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:space-y-3">
        <header class="shrink-0 space-y-2">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              #{{ entry.no }}
            </span>
            <span class="text-xs text-zinc-400">{{ isoToDisplay(entry.date) }}</span>
            <span v-if="entry.session" class="text-xs text-zinc-500">{{ entry.session }}</span>
            <span
              v-if="entry.result"
              class="rounded-full px-2 py-0.5 text-[10px] font-medium"
              :class="resultClass(entry.result)"
            >
              {{ entry.result }}
            </span>
            <span
              v-if="canSeePnl && entry.pnl != null"
              :class="['text-xs font-semibold tabular-nums', pnlClass(entry.pnl)]"
            >
              PnL {{ formatPnl(entry.pnl) }}
            </span>
          </div>

          <h1 class="text-xl font-bold tracking-tight break-words sm:text-2xl lg:text-3xl">
            {{ headline }}
          </h1>
        </header>

        <section
          v-if="(entry.note ?? '').trim()"
          class="shrink-0 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
        >
          <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Note</h2>
          <p class="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {{ entry.note }}
          </p>
        </section>

        <div
          class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:min-h-0 lg:flex-1"
          :class="timeframeHasLtf(entry.timeframe) ? 'lg:grid-cols-3' : 'lg:grid-cols-2'"
        >
          <section class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:flex lg:min-h-0 lg:flex-col">
            <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-[#1976D2]">HTF</h2>
            <dl class="mb-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt class="text-[10px] uppercase text-zinc-400">CTC</dt>
                <dd>
                  <span v-if="entry.htfCtc" :class="[chipBase, chipClass(entry.htfCtc)]">{{ formatFlag(entry.htfCtc) }}</span>
                  <span v-else class="text-zinc-400">—</span>
                </dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase text-zinc-400">Bias</dt>
                <dd>
                  <span v-if="entry.htfBias" :class="[chipBase, chipClass(entry.htfBias)]">{{ formatFlag(entry.htfBias) }}</span>
                  <span v-else class="text-zinc-400">—</span>
                </dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase text-zinc-400">PDA</dt>
                <dd>{{ entry.htfPda || '—' }}</dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase text-zinc-400">DOL</dt>
                <dd>{{ entry.htfDol || '—' }}</dd>
              </div>
            </dl>
            <div v-if="entry.htfImages?.length" class="grid gap-2 lg:min-h-0 lg:flex-1 lg:overflow-auto">
              <button
                v-for="(img, i) in entry.htfImages"
                :key="img.id"
                type="button"
                class="block w-full cursor-zoom-in overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-950"
                @click="openImages(img)"
              >
                <img :src="img.imageUrl" :alt="`HTF ${i + 1}`" class="mx-auto max-h-[42vh] w-full object-contain lg:max-h-none" />
              </button>
            </div>
          </section>

          <section class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:flex lg:min-h-0 lg:flex-col">
            <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-[#1976D2]">MTF</h2>
            <dl class="mb-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt class="text-[10px] uppercase text-zinc-400">CTC</dt>
                <dd>
                  <span v-if="entry.mtfCtc" :class="[chipBase, chipClass(entry.mtfCtc)]">{{ formatFlag(entry.mtfCtc) }}</span>
                  <span v-else class="text-zinc-400">—</span>
                </dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase text-zinc-400">PDA</dt>
                <dd>{{ entry.mtfPda || '—' }}</dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase text-zinc-400">Model</dt>
                <dd>
                  <span v-if="entry.mtfModel" :class="[chipBase, chipClass(entry.mtfModel)]">{{ entry.mtfModel }}</span>
                  <span v-else class="text-zinc-400">—</span>
                </dd>
              </div>
              <div>
                <dt class="text-[10px] uppercase text-zinc-400">Flags</dt>
                <dd class="flex flex-wrap gap-1">
                  <span v-if="entry.mtfSweep" :class="[chipBase, chipClass('sweep')]">Sweep</span>
                  <span v-if="entry.mtfCisd" :class="[chipBase, chipClass('cisd')]">CISD</span>
                  <span v-if="entry.mtfMss" :class="[chipBase, chipClass('mss')]">MSS</span>
                  <span v-if="!entry.mtfSweep && !entry.mtfCisd && !entry.mtfMss" class="text-zinc-400">—</span>
                </dd>
              </div>
            </dl>
            <div v-if="entry.mtfImages?.length" class="grid gap-2 lg:min-h-0 lg:flex-1 lg:overflow-auto">
              <button
                v-for="(img, i) in entry.mtfImages"
                :key="img.id"
                type="button"
                class="block w-full cursor-zoom-in overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-950"
                @click="openImages(img)"
              >
                <img :src="img.imageUrl" :alt="`MTF ${i + 1}`" class="mx-auto max-h-[42vh] w-full object-contain lg:max-h-none" />
              </button>
            </div>
          </section>

          <section
            v-if="timeframeHasLtf(entry.timeframe)"
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:col-span-2 lg:col-span-1 lg:flex lg:min-h-0 lg:flex-col"
          >
            <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-[#1976D2]">LTF</h2>
            <dl class="mb-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt class="text-[10px] uppercase text-zinc-400">Flags</dt>
                <dd class="flex flex-wrap gap-1">
                  <span v-if="entry.ltfSweep" :class="[chipBase, chipClass('sweep')]">Sweep</span>
                  <span v-if="entry.ltfCisd" :class="[chipBase, chipClass('cisd')]">CISD</span>
                  <span v-if="entry.ltfMss" :class="[chipBase, chipClass('mss')]">MSS</span>
                  <span v-if="!entry.ltfSweep && !entry.ltfCisd && !entry.ltfMss" class="text-zinc-400">—</span>
                </dd>
              </div>
              <div class="col-span-2">
                <dt class="text-[10px] uppercase text-zinc-400">Entry</dt>
                <dd class="whitespace-pre-wrap">{{ entry.ltfEntry || '—' }}</dd>
              </div>
            </dl>
            <div v-if="entry.ltfImages?.length" class="grid gap-2 lg:min-h-0 lg:flex-1 lg:overflow-auto">
              <button
                v-for="(img, i) in entry.ltfImages"
                :key="img.id"
                type="button"
                class="block w-full cursor-zoom-in overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-950"
                @click="openImages(img)"
              >
                <img :src="img.imageUrl" :alt="`LTF ${i + 1}`" class="mx-auto max-h-[42vh] w-full object-contain lg:max-h-none" />
              </button>
            </div>
          </section>
        </div>

        <section
          v-if="entry.tags.length > 0"
          class="shrink-0 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:p-5"
        >
          <h2 class="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">Tags</h2>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="(tag, i) in entry.tags"
              :key="`${tag}-${i}`"
              class="inline-flex rounded-full px-2.5 py-1 text-xs font-medium uppercase tracking-wide"
              :class="getTagClass(tag)"
            >
              {{ tag }}
            </span>
          </div>
        </section>

        <footer class="border-t border-zinc-200 pt-6 text-center text-xs text-zinc-400 dark:border-zinc-800 lg:hidden">
          Trading Journal · Chỉ xem
        </footer>
      </article>
    </main>

    <ImageLightbox
      v-if="showLightbox && lightboxSources.length > 0"
      :sources="lightboxSources"
      :start-index="lightboxIndex"
      alt="Chart"
      @close="showLightbox = false"
    >
      <template #caption="{ index }">
        <LightboxCaption v-if="entry" :entry="entry" :slot="allDetailImages[index]?.slot" />
      </template>
    </ImageLightbox>
  </div>
</template>
