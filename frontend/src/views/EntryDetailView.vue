<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { fetchEntry } from '@/api/journal'
import ImageLightbox from '@/components/ImageLightbox.vue'
import type { JournalEntry } from '@/types/journal'
import { isoToDisplay } from '@/utils/date'

const route = useRoute()

const entry = ref<JournalEntry | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const copied = ref(false)
const lightboxIndex = ref(0)
const showLightbox = ref(false)

const imageUrls = computed(() => entry.value?.images.map((img) => img.imageUrl) ?? [])

const entryId = computed(() => Number(route.params.id))

const shareUrl = computed(() =>
  typeof window !== 'undefined'
    ? `${window.location.origin}/detail/${entryId.value}`
    : '',
)

function pnlClass(pnl: number | null) {
  if (pnl == null || pnl === 0) return 'text-zinc-500'
  return pnl > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
}

function directionClass(direction: string) {
  return direction === 'LONG'
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-rose-600 dark:text-rose-400'
}

function formatPnl(pnl: number | null) {
  if (pnl == null) return '—'
  return `${pnl >= 0 ? '+' : ''}${pnl}`
}

function formatRr(rr: number | null) {
  if (rr == null) return '—'
  return String(rr)
}

async function loadEntry() {
  loading.value = true
  error.value = null
  entry.value = null

  if (!Number.isFinite(entryId.value) || entryId.value <= 0) {
    error.value = 'ID giao dịch không hợp lệ'
    loading.value = false
    return
  }

  try {
    entry.value = await fetchEntry(entryId.value)
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
watch(entryId, loadEntry)
</script>

<template>
  <div class="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <header class="border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <RouterLink
          to="/"
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

    <main class="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div v-if="loading" class="py-24 text-center text-sm text-zinc-400">Đang tải...</div>

      <div
        v-else-if="error"
        class="rounded-xl border border-rose-200 bg-rose-50 px-6 py-12 text-center dark:border-rose-900 dark:bg-rose-950/40"
      >
        <p class="text-sm text-rose-700 dark:text-rose-300">{{ error }}</p>
        <RouterLink
          to="/"
          class="mt-4 inline-block text-xs font-medium text-zinc-500 underline hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          Về nhật ký
        </RouterLink>
      </div>

      <article v-else-if="entry" class="space-y-8">
        <header class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              #{{ entry.no }}
            </span>
            <span class="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
              {{ entry.session }}
            </span>
            <span
              class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              :class="directionClass(entry.direction)"
            >
              {{ entry.direction }}
            </span>
            <span class="text-xs text-zinc-400">{{ isoToDisplay(entry.date) }}</span>
          </div>

          <h1 class="text-3xl font-bold tracking-tight sm:text-4xl">
            {{ entry.pair || '—' }}
          </h1>

          <div class="flex flex-wrap gap-3">
            <div class="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div class="text-[10px] font-medium uppercase tracking-wide text-zinc-400">R:R</div>
              <div class="mt-0.5 text-xl font-semibold tabular-nums">{{ formatRr(entry.rr) }}</div>
            </div>
            <div class="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
              <div class="text-[10px] font-medium uppercase tracking-wide text-zinc-400">PnL</div>
              <div :class="['mt-0.5 text-xl font-semibold tabular-nums', pnlClass(entry.pnl)]">
                {{ formatPnl(entry.pnl) }}
              </div>
            </div>
          </div>
        </header>

        <section
          v-if="entry.note.trim()"
          class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <h2 class="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">Note</h2>
          <p class="whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            {{ entry.note }}
          </p>
        </section>

        <section v-if="entry.images.length > 0" class="space-y-4">
          <h2 class="text-xs font-semibold uppercase tracking-wide text-zinc-400">Charts</h2>
          <div
            v-for="(img, i) in entry.images"
            :key="img.id"
            class="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div class="bg-zinc-100 dark:bg-zinc-950">
              <button
                type="button"
                class="block w-full cursor-zoom-in"
                @click="lightboxIndex = i; showLightbox = true"
              >
                <img
                  :src="img.imageUrl"
                  :alt="`Chart ${i + 1}`"
                  class="mx-auto max-h-[70vh] w-full object-contain"
                  loading="lazy"
                />
              </button>
            </div>
          </div>
        </section>

        <footer class="border-t border-zinc-200 pt-6 text-center text-xs text-zinc-400 dark:border-zinc-800">
          Trading Journal · Chỉ xem
        </footer>
      </article>
    </main>

    <ImageLightbox
      v-if="showLightbox && imageUrls.length > 0"
      :sources="imageUrls"
      :start-index="lightboxIndex"
      alt="Chart"
      @close="showLightbox = false"
    />
  </div>
</template>
