<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { fetchNewsCalendar } from '@/api/news'
import { resetBackgroundToDefault } from '@/composables/useBackground'
import {
  IMPACT_OPTIONS,
  currencyFlag,
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

function impactClass(impact: NewsImpact): string {
  switch (normalizeImpact(impact)) {
    case 'High':
      return 'bg-red-600'
    case 'Medium':
      return 'bg-orange-300'
    case 'Low':
      return 'bg-emerald-500'
    case 'Holiday':
      return 'bg-sky-400'
    default:
      return 'bg-zinc-300'
  }
}

function impactLabel(impact: NewsImpact): string {
  switch (normalizeImpact(impact)) {
    case 'High':
      return 'Cao'
    case 'Medium':
      return 'Trung bình'
    case 'Low':
      return 'Thấp'
    case 'Holiday':
      return 'Nghỉ lễ'
    default:
      return String(impact)
  }
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
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div class="min-w-0">
          <h1 class="truncate text-base font-semibold tracking-tight">Economic Calendar</h1>
          <p class="truncate text-[11px] text-zinc-400">
            Tin tức tuần này
            <span v-if="fetchedAt">· cập nhật {{ fetchedLabel() }}</span>
          </p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 text-xs text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            :disabled="loading"
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
            Làm mới
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
      <!-- Filters -->
      <section
        class="mb-5 space-y-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-4"
      >
        <div class="flex flex-wrap items-center gap-2">
          <div class="relative min-w-[200px] flex-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" />
            </svg>
            <input
              v-model="search"
              type="search"
              placeholder="Tìm sự kiện, currency..."
              class="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-8 pr-3 text-sm outline-none ring-indigo-500/30 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-950"
            />
          </div>

          <select
            v-model="selectedDay"
            class="rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs dark:border-zinc-700 dark:bg-zinc-950"
          >
            <option value="all">Tất cả ngày</option>
            <option v-for="day in dayOptions" :key="day.key" :value="day.key">
              {{ day.label }} ({{ day.count }})
            </option>
          </select>

          <label
            class="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-2 text-xs dark:border-zinc-700"
          >
            <input v-model="onlyUpcoming" type="checkbox" class="rounded border-zinc-300" />
            Chỉ sắp tới
          </label>

          <button
            type="button"
            class="rounded-lg border border-zinc-200 px-2.5 py-2 text-xs text-zinc-500 transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
            @click="resetFilters"
          >
            Reset filter
          </button>
        </div>

        <!-- Impact -->
        <div>
          <div class="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            Mức ảnh hưởng
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="impact in IMPACT_OPTIONS"
              :key="impact"
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition"
              :class="
                selectedImpacts.has(impact)
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
              "
              @click="toggleImpact(impact)"
            >
              <span class="inline-block h-2.5 w-2.5 rounded-sm" :class="impactClass(impact)" />
              {{ impactLabel(impact) }}
            </button>
          </div>
        </div>

        <!-- Currencies -->
        <div>
          <div class="mb-1.5 flex flex-wrap items-center gap-2">
            <span class="text-[10px] font-medium uppercase tracking-wide text-zinc-400">
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
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="code in availableCurrencies"
              :key="code"
              type="button"
              class="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs transition"
              :class="
                selectedCurrencies.has(code)
                  ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300'
                  : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'
              "
              :title="currencyName(code)"
              @click="toggleCurrency(code)"
            >
              <span class="text-sm leading-none">{{ currencyFlag(code) }}</span>
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

        <div class="flex flex-wrap items-center gap-3 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800">
          <span>
            Hiển thị
            <strong class="text-zinc-800 dark:text-zinc-200">{{ filtered.length }}</strong>
            / {{ events.length }} sự kiện
          </span>
          <span v-if="highTodayCount > 0" class="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
            <span class="inline-block h-2 w-2 rounded-sm bg-red-600" />
            {{ highTodayCount }} tin High hôm nay (sau filter)
          </span>
        </div>
      </section>

      <div v-if="loading && events.length === 0" class="py-16 text-center text-sm text-zinc-400">
        Đang tải lịch tin tức...
      </div>

      <div
        v-else-if="error"
        class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
      >
        {{ error }}
        <button type="button" class="ml-2 underline" @click="load">Thử lại</button>
      </div>

      <div
        v-else-if="filtered.length === 0"
        class="rounded-xl border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-zinc-700"
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

      <div v-else class="space-y-5">
        <section v-for="group in grouped" :key="group.key">
          <div
            class="sticky top-[57px] z-10 mb-2 flex items-center gap-2 rounded-lg bg-zinc-100/95 px-3 py-2 backdrop-blur dark:bg-zinc-900/95"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              class="h-3.5 w-3.5 text-zinc-400"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
            </svg>
            <h2 class="text-sm font-semibold capitalize">{{ group.label }}</h2>
            <span class="text-[11px] text-zinc-400">{{ group.items.length }} sự kiện</span>
          </div>

          <div
            class="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
          >
            <!-- Desktop header -->
            <div
              class="hidden grid-cols-[72px_88px_56px_minmax(0,1.4fr)_72px_72px_72px] gap-2 border-b border-zinc-100 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:border-zinc-800 sm:grid"
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
                class="grid grid-cols-1 gap-2 px-3 py-2.5 transition sm:grid-cols-[72px_88px_56px_minmax(0,1.4fr)_72px_72px_72px] sm:items-center sm:gap-2"
                :class="[
                  isPast(item.date) ? 'opacity-55' : '',
                  isSoon(item.date) ? 'bg-amber-50/70 dark:bg-amber-950/20' : '',
                ]"
              >
                <div class="flex items-center gap-2 sm:block">
                  <span
                    class="font-mono text-xs tabular-nums text-zinc-700 dark:text-zinc-200"
                    :class="isSoon(item.date) ? 'font-semibold text-amber-700 dark:text-amber-300' : ''"
                  >
                    {{ formatTime(item.date) }}
                  </span>
                  <span
                    v-if="isSoon(item.date)"
                    class="rounded bg-amber-200/80 px-1.5 py-0.5 text-[9px] font-medium uppercase text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 sm:mt-1 sm:inline-block"
                  >
                    Sắp tới
                  </span>
                </div>

                <div class="flex items-center gap-1.5">
                  <span class="text-base leading-none" :title="currencyName(item.country)">
                    {{ currencyFlag(item.country) }}
                  </span>
                  <span class="text-xs font-semibold tracking-wide">{{ item.country }}</span>
                </div>

                <div class="flex items-center gap-1.5" :title="impactLabel(item.impact)">
                  <span class="inline-block h-3 w-3 rounded-sm" :class="impactClass(item.impact)" />
                  <span class="text-[10px] text-zinc-400 sm:hidden">{{ impactLabel(item.impact) }}</span>
                </div>

                <div class="min-w-0">
                  <div class="text-sm font-medium leading-snug">{{ item.title }}</div>
                </div>

                <div class="grid grid-cols-3 gap-2 text-xs sm:contents">
                  <div class="sm:text-right">
                    <div class="text-[9px] uppercase text-zinc-400 sm:hidden">Actual</div>
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
                  <div class="sm:text-right">
                    <div class="text-[9px] uppercase text-zinc-400 sm:hidden">Forecast</div>
                    <div class="tabular-nums text-zinc-600 dark:text-zinc-300">
                      {{ displayValue(item.forecast) }}
                    </div>
                  </div>
                  <div class="sm:text-right">
                    <div class="text-[9px] uppercase text-zinc-400 sm:hidden">Previous</div>
                    <div class="tabular-nums text-zinc-500">
                      {{ displayValue(item.previous) }}
                    </div>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <p class="mt-6 text-center text-[11px] text-zinc-400">
        Nguồn:
        <a
          href="https://nfs.faireconomy.media/ff_calendar_thisweek.json"
          target="_blank"
          rel="noopener noreferrer"
          class="underline hover:text-zinc-600"
        >
          FairEconomy / Forex Factory calendar
        </a>
        · giờ hiển thị theo timezone máy bạn
      </p>
    </main>
  </div>
</template>
