<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import CurrencyFlag from '@/components/CurrencyFlag.vue'
import ImpactStars from '@/components/ImpactStars.vue'
import { fetchNewsCalendar } from '@/api/news'
import { resetBackgroundToDefault } from '@/composables/useBackground'
import {
  IMPACT_OPTIONS,
  currencyName,
  type NewsEvent,
  type NewsImpact,
} from '@/types/news'

resetBackgroundToDefault()

const FILTER_STORAGE_KEY = 'news-calendar-filters'

interface StoredFilters {
  search: string
  impacts: string[]
  currencies: string[]
  day: string
  onlyUpcoming: boolean
}

const DEFAULT_FILTERS: StoredFilters = {
  search: '',
  impacts: ['High', 'Medium', 'Low'],
  currencies: ['USD'],
  day: 'all',
  onlyUpcoming: false,
}

function loadStoredFilters(): StoredFilters {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_FILTERS }
    const parsed = JSON.parse(raw) as Partial<StoredFilters>
    return {
      search: typeof parsed.search === 'string' ? parsed.search : DEFAULT_FILTERS.search,
      impacts: Array.isArray(parsed.impacts) ? parsed.impacts.map(String) : [...DEFAULT_FILTERS.impacts],
      currencies: Array.isArray(parsed.currencies)
        ? parsed.currencies.map((c) => String(c).toUpperCase())
        : [...DEFAULT_FILTERS.currencies],
      day: typeof parsed.day === 'string' ? parsed.day : DEFAULT_FILTERS.day,
      onlyUpcoming: typeof parsed.onlyUpcoming === 'boolean' ? parsed.onlyUpcoming : false,
    }
  } catch {
    return { ...DEFAULT_FILTERS }
  }
}

const stored = loadStoredFilters()

const events = ref<NewsEvent[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const fetchedAt = ref<number | null>(null)
const nowTick = ref(Date.now())

const search = ref(stored.search)
const selectedImpacts = ref<Set<string>>(new Set(stored.impacts))
const selectedCurrencies = ref<Set<string>>(new Set(stored.currencies))
const selectedDay = ref<string>(stored.day)
const onlyUpcoming = ref(stored.onlyUpcoming)

watch(
  [search, selectedImpacts, selectedCurrencies, selectedDay, onlyUpcoming],
  () => {
    const payload: StoredFilters = {
      search: search.value,
      impacts: [...selectedImpacts.value],
      currencies: [...selectedCurrencies.value],
      day: selectedDay.value,
      onlyUpcoming: onlyUpcoming.value,
    }
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(payload))
  },
  { deep: true },
)

let tickTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  tickTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 30_000)
  await load()
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
})

async function load() {
  loading.value = true
  error.value = null
  try {
    const data = await fetchNewsCalendar()
    events.value = data.events
    fetchedAt.value = data.fetchedAt
    // Ngày đã lưu có thể hết hạn khi sang tuần mới
    if (
      selectedDay.value !== 'all' &&
      !dayOptions.value.some((d) => d.key === selectedDay.value)
    ) {
      selectedDay.value = 'all'
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không tải được tin tức'
  } finally {
    loading.value = false
  }
}

const availableCurrencies = computed(() => {
  const set = new Set<string>()
  for (const e of events.value) {
    if (e.country) set.add(e.country.toUpperCase())
  }
  return [...set].sort((a, b) => a.localeCompare(b))
})

const dayOptions = computed(() => {
  const map = new Map<string, { key: string; label: string; count: number }>()
  for (const e of events.value) {
    const key = dayKey(e.date)
    if (!map.has(key)) {
      map.set(key, { key, label: formatDayLabel(e.date), count: 0 })
    }
    map.get(key)!.count += 1
  }
  return [...map.values()]
})

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  const now = nowTick.value

  return events.value.filter((e) => {
    if (!selectedImpacts.value.has(normalizeImpact(e.impact))) return false
    if (!selectedCurrencies.value.has(e.country.toUpperCase())) return false
    if (selectedDay.value !== 'all' && dayKey(e.date) !== selectedDay.value) return false
    if (onlyUpcoming.value && new Date(e.date).getTime() < now) return false
    if (q) {
      const hay = `${e.title} ${e.country} ${e.forecast} ${e.previous} ${e.actual ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})

const grouped = computed(() => {
  const groups: { key: string; label: string; items: NewsEvent[] }[] = []
  const index = new Map<string, (typeof groups)[number]>()

  for (const e of filtered.value) {
    const key = dayKey(e.date)
    let group = index.get(key)
    if (!group) {
      group = { key, label: formatDayLabel(e.date), items: [] }
      index.set(key, group)
      groups.push(group)
    }
    group.items.push(e)
  }

  return groups
})

const todayKey = computed(() => {
  const d = new Date(nowTick.value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
})

const highTodayCount = computed(
  () =>
    filtered.value.filter(
      (e) => normalizeImpact(e.impact) === 'High' && dayKey(e.date) === todayKey.value,
    ).length,
)

function normalizeImpact(impact: NewsImpact): string {
  const v = String(impact || '').trim()
  if (/holiday/i.test(v)) return 'Holiday'
  if (/high/i.test(v)) return 'High'
  if (/medium|med/i.test(v)) return 'Medium'
  if (/low/i.test(v)) return 'Low'
  return v || 'Low'
}

function dayKey(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function displayValue(value: string | undefined): string {
  const v = (value ?? '').trim()
  return v || '—'
}

function isPast(iso: string): boolean {
  return new Date(iso).getTime() < nowTick.value
}

function isSoon(iso: string): boolean {
  const t = new Date(iso).getTime() - nowTick.value
  return t >= 0 && t <= 60 * 60 * 1000
}

function toggleImpact(impact: string) {
  const next = new Set(selectedImpacts.value)
  if (next.has(impact)) next.delete(impact)
  else next.add(impact)
  selectedImpacts.value = next
}

function toggleCurrency(code: string) {
  const next = new Set(selectedCurrencies.value)
  if (next.has(code)) next.delete(code)
  else next.add(code)
  selectedCurrencies.value = next
}

function selectAllCurrencies() {
  selectedCurrencies.value = new Set(availableCurrencies.value)
}

function clearCurrencies() {
  selectedCurrencies.value = new Set()
}

function selectMajorCurrencies() {
  const majors = ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD']
  selectedCurrencies.value = new Set(
    availableCurrencies.value.filter((c) => majors.includes(c)),
  )
}

function resetFilters() {
  search.value = DEFAULT_FILTERS.search
  selectedImpacts.value = new Set(DEFAULT_FILTERS.impacts)
  selectedCurrencies.value = new Set(DEFAULT_FILTERS.currencies)
  selectedDay.value = DEFAULT_FILTERS.day
  onlyUpcoming.value = DEFAULT_FILTERS.onlyUpcoming
}

function fetchedLabel(): string {
  if (!fetchedAt.value) return ''
  return new Date(fetchedAt.value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <div class="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <header
      class="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/85"
    >
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2 sm:gap-3 sm:px-6 sm:py-3">
        <div class="min-w-0">
          <h1 class="truncate text-sm font-semibold tracking-tight sm:text-base">Economic Calendar</h1>
          <p class="truncate text-[10px] text-zinc-400 sm:text-[11px]">
            Tin tức tuần này
            <span v-if="fetchedAt">· cập nhật {{ fetchedLabel() }}</span>
          </p>
        </div>
        <div class="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-50 sm:h-8 sm:w-auto sm:gap-1.5 sm:px-2.5 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            :disabled="loading"
            :aria-label="'Làm mới'"
            @click="load"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="h-3.5 w-3.5"
              :class="loading ? 'animate-spin' : ''"
            >
              <path d="M21 12a9 9 0 1 1-2.64-6.36" />
              <path d="M21 3v6h-6" />
            </svg>
            <span class="hidden text-xs sm:inline">Làm mới</span>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-3 py-3 sm:px-6 sm:py-6">
      <!-- Filters -->
      <section
        class="mb-3 space-y-2 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:mb-5 sm:space-y-3 sm:p-4"
      >
        <div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <div class="relative min-w-0 flex-1 basis-full sm:min-w-[200px] sm:basis-auto">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              v-model="search"
              type="search"
              placeholder="Tìm sự kiện, currency..."
              class="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-7 pr-2 text-xs outline-none ring-indigo-500/30 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950 sm:py-2 sm:pl-8 sm:pr-3 sm:text-sm"
            />
          </div>

          <select
            v-model="selectedDay"
            class="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] dark:border-zinc-700 dark:bg-zinc-950 sm:px-2.5 sm:py-2 sm:text-xs"
          >
            <option value="all">Tất cả ngày</option>
            <option v-for="day in dayOptions" :key="day.key" :value="day.key">
              {{ day.label }} ({{ day.count }})
            </option>
          </select>

          <label
            class="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px] dark:border-zinc-700 sm:gap-2 sm:px-2.5 sm:py-2 sm:text-xs"
          >
            <input v-model="onlyUpcoming" type="checkbox" class="rounded border-zinc-300" />
            Sắp tới
          </label>

          <button
            type="button"
            class="rounded-lg border border-zinc-200 px-2 py-1.5 text-[11px] text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 sm:px-2.5 sm:py-2 sm:text-xs"
            @click="resetFilters"
          >
            Reset
          </button>
        </div>

        <!-- Impact -->
        <div>
          <div class="mb-1 text-[9px] font-medium uppercase tracking-wide text-zinc-400 sm:mb-1.5 sm:text-[10px]">
            Impact
          </div>
          <div class="flex flex-wrap gap-1 sm:gap-1.5">
            <button
              v-for="impact in IMPACT_OPTIONS"
              :key="impact"
              type="button"
              class="inline-flex items-center gap-1 rounded-md border px-1.5 py-1 transition sm:gap-1.5 sm:rounded-lg sm:px-2.5 sm:py-1.5"
              :class="
                selectedImpacts.has(impact)
                  ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/40'
                  : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
              "
              @click="toggleImpact(impact)"
            >
              <ImpactStars :impact="impact" :size="11" />
            </button>
          </div>
        </div>

        <!-- Currencies -->
        <div>
          <div class="mb-1 flex flex-wrap items-center gap-2 sm:mb-1.5">
            <span class="text-[9px] font-medium uppercase tracking-wide text-zinc-400 sm:text-[10px]">
              Currency
            </span>
            <button
              type="button"
              class="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400"
              @click="selectAllCurrencies"
            >
              Tất cả
            </button>
            <button
              type="button"
              class="text-[10px] text-indigo-600 hover:underline dark:text-indigo-400"
              @click="selectMajorCurrencies"
            >
              Major
            </button>
            <button
              type="button"
              class="text-[10px] text-zinc-400 hover:underline"
              @click="clearCurrencies"
            >
              Bỏ chọn
            </button>
          </div>
          <div class="flex flex-wrap gap-1 sm:gap-1.5">
            <button
              v-for="code in availableCurrencies"
              :key="code"
              type="button"
              class="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] transition sm:rounded-lg sm:px-2 sm:py-1 sm:text-xs"
              :class="
                selectedCurrencies.has(code)
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
              "
              :title="currencyName(code)"
              @click="toggleCurrency(code)"
            >
              <CurrencyFlag :code="code" :size="12" />
              <span class="font-medium">{{ code }}</span>
            </button>
            <span
              v-if="availableCurrencies.length === 0 && !loading"
              class="text-xs text-zinc-400"
            >
              Chưa có dữ liệu currency
            </span>
          </div>
        </div>

        <div
          class="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-2 text-[11px] text-zinc-500 dark:border-zinc-800 sm:gap-3 sm:pt-3 sm:text-xs"
        >
          <span>
            <strong class="text-zinc-800 dark:text-zinc-200">{{ filtered.length }}</strong>
            / {{ events.length }}
          </span>
          <span
            v-if="highTodayCount > 0"
            class="inline-flex items-center gap-1 text-red-600 dark:text-red-400"
          >
            <ImpactStars impact="High" :size="10" />
            {{ highTodayCount }} High hôm nay
          </span>
        </div>
      </section>

      <div v-if="loading && events.length === 0" class="py-12 text-center text-sm text-zinc-400">
        Đang tải lịch tin tức...
      </div>

      <div
        v-else-if="error"
        class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
      >
        {{ error }}
        <button type="button" class="ml-2 underline" @click="load">Thử lại</button>
      </div>

      <div
        v-else-if="filtered.length === 0"
        class="rounded-xl border border-dashed border-zinc-300 px-4 py-10 text-center dark:border-zinc-700"
      >
        <p class="text-sm text-zinc-500">Không có sự kiện khớp filter.</p>
        <button
          type="button"
          class="mt-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
          @click="resetFilters"
        >
          Xóa filter
        </button>
      </div>

      <div v-else class="space-y-3 sm:space-y-5">
        <section v-for="group in grouped" :key="group.key">
          <div
            class="sticky top-[45px] z-10 mb-1.5 flex items-center gap-1.5 rounded-md bg-zinc-100/95 px-2 py-1.5 backdrop-blur dark:bg-zinc-900/95 sm:top-[57px] sm:mb-2 sm:gap-2 sm:rounded-lg sm:px-3 sm:py-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="h-3 w-3 text-zinc-400 sm:h-3.5 sm:w-3.5"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <h2 class="text-xs font-semibold capitalize sm:text-sm">{{ group.label }}</h2>
            <span class="text-[10px] text-zinc-400 sm:text-[11px]">{{ group.items.length }}</span>
          </div>

          <div
            class="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-xl"
          >
            <!-- Desktop header -->
            <div
              class="hidden grid-cols-[64px_80px_64px_minmax(0,1.4fr)_72px_72px_72px] gap-2 border-b border-zinc-100 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-800 sm:grid"
            >
              <div>Giờ</div>
              <div>Currency</div>
              <div>Impact</div>
              <div>Sự kiện</div>
              <div class="text-right">Actual</div>
              <div class="text-right">Forecast</div>
              <div class="text-right">Previous</div>
            </div>

            <ul class="divide-y divide-zinc-100 dark:divide-zinc-800">
              <li
                v-for="(item, idx) in group.items"
                :key="`${group.key}-${idx}-${item.title}`"
                class="px-2 py-1.5 transition sm:grid sm:grid-cols-[64px_80px_64px_minmax(0,1.4fr)_72px_72px_72px] sm:items-center sm:gap-2 sm:px-3 sm:py-2.5"
                :class="[
                  isPast(item.date) ? 'opacity-55' : '',
                  isSoon(item.date) ? 'bg-amber-50/70 dark:bg-amber-950/20' : '',
                ]"
              >
                <!-- Mobile compact row -->
                <div class="flex items-start gap-2 sm:contents">
                  <div class="flex w-10 shrink-0 flex-col sm:w-auto sm:block">
                    <span
                      class="font-mono text-[11px] tabular-nums leading-tight text-zinc-700 dark:text-zinc-200 sm:text-xs"
                      :class="isSoon(item.date) ? 'font-semibold text-amber-700 dark:text-amber-300' : ''"
                    >
                      {{ formatTime(item.date) }}
                    </span>
                    <span
                      v-if="isSoon(item.date)"
                      class="mt-0.5 hidden rounded bg-amber-200/80 px-1 py-px text-[8px] font-medium uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 sm:inline-block"
                    >
                      Soon
                    </span>
                  </div>

                  <div class="flex w-12 shrink-0 items-center gap-1 sm:w-auto sm:gap-1.5">
                    <CurrencyFlag :code="item.country" :size="12" />
                    <span class="text-[10px] font-semibold tracking-wide sm:text-xs">{{
                      item.country
                    }}</span>
                  </div>

                  <div class="flex w-[3.25rem] shrink-0 items-center sm:w-auto">
                    <ImpactStars :impact="item.impact" :size="11" />
                  </div>

                  <div class="min-w-0 flex-1">
                    <div class="text-[12px] font-medium leading-snug sm:text-sm">{{ item.title }}</div>
                    <!-- Mobile values inline -->
                    <div
                      class="mt-0.5 flex flex-wrap gap-x-2 gap-y-0 text-[10px] tabular-nums text-zinc-500 sm:hidden"
                    >
                      <span>
                        <span class="text-zinc-400">A</span>
                        <span
                          :class="
                            item.actual
                              ? 'ml-0.5 font-semibold text-zinc-800 dark:text-zinc-100'
                              : 'ml-0.5'
                          "
                          >{{ displayValue(item.actual) }}</span
                        >
                      </span>
                      <span>
                        <span class="text-zinc-400">F</span>
                        <span class="ml-0.5">{{ displayValue(item.forecast) }}</span>
                      </span>
                      <span>
                        <span class="text-zinc-400">P</span>
                        <span class="ml-0.5">{{ displayValue(item.previous) }}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <!-- Desktop values -->
                <div class="hidden text-xs sm:block sm:text-right">
                  <div
                    class="tabular-nums"
                    :class="
                      item.actual
                        ? 'font-semibold text-zinc-900 dark:text-zinc-100'
                        : 'text-zinc-400'
                    "
                  >
                    {{ displayValue(item.actual) }}
                  </div>
                </div>
                <div class="hidden text-xs tabular-nums text-zinc-600 dark:text-zinc-300 sm:block sm:text-right">
                  {{ displayValue(item.forecast) }}
                </div>
                <div class="hidden text-xs tabular-nums text-zinc-500 sm:block sm:text-right">
                  {{ displayValue(item.previous) }}
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <p class="mt-4 text-center text-[10px] text-zinc-400 sm:mt-6 sm:text-[11px]">
        Nguồn:
        <a
          href="https://nfs.faireconomy.media/ff_calendar_thisweek.json"
          target="_blank"
          rel="noopener noreferrer"
          class="underline hover:text-zinc-600"
        >
          FairEconomy / Forex Factory calendar
        </a>
        · giờ theo timezone máy bạn
      </p>
    </main>
  </div>
</template>
