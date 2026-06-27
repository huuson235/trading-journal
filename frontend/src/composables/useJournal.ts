import { ref, computed, watch, onMounted } from 'vue'
import type { JournalEntry, SortDirection, SortField } from '@/types/journal'
import * as journalApi from '@/api/journal'
import { getAuthToken } from '@/api/client'
import { debounce } from '@/utils/debounce'
import { getCurrentMonthRange, getCurrentWeekRange } from '@/utils/date'
import { filterEntriesByDate, sortEntries, toggleSort } from '@/utils/entriesView'
import { useAuth } from '@/composables/useAuth'

const entries = ref<JournalEntry[]>([])
const pairSuggestions = ref<string[]>([])
const tagSuggestions = ref<string[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const weekRange = getCurrentWeekRange()
const dateFrom = ref(weekRange.from)
const dateTo = ref(weekRange.to)
const sortField = ref<SortField>('date')
const sortDirection = ref<SortDirection>('desc')

let skipSave = true
const saveTimers = new Map<number, ReturnType<typeof setTimeout>>()

function queueSave(entry: JournalEntry) {
  if (skipSave || !entry.id || !getAuthToken()) return

  const existing = saveTimers.get(entry.id)
  if (existing) clearTimeout(existing)

  saveTimers.set(
    entry.id,
    setTimeout(async () => {
      try {
        const updated = await journalApi.updateEntry(entry.id, entry)
        const idx = entries.value.findIndex((e) => e.id === entry.id)
        if (idx === -1) return
        const current = entries.value[idx]!
        entries.value[idx] = {
          ...current,
          ...updated,
          images: updated.images,
        }
        await refreshPairs()
        await refreshTags()
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Lỗi lưu dữ liệu'
      } finally {
        saveTimers.delete(entry.id)
      }
    }, 500),
  )
}

const debouncedQueueAll = debounce(() => {
  for (const entry of entries.value) queueSave(entry)
}, 300)

watch(entries, debouncedQueueAll, { deep: true })

async function refreshTags() {
  try {
    tagSuggestions.value = await journalApi.fetchTags()
  } catch {
    /* ignore */
  }
}

async function refreshPairs() {
  try {
    pairSuggestions.value = await journalApi.fetchPairs()
  } catch {
    /* ignore */
  }
}

async function loadEntries() {
  loading.value = true
  error.value = null
  skipSave = true
  try {
    const [data, pairs, tags] = await Promise.all([
      journalApi.fetchEntries(),
      journalApi.fetchPairs(),
      journalApi.fetchTags(),
    ])
    entries.value = data
    pairSuggestions.value = pairs
    tagSuggestions.value = tags
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không tải được dữ liệu'
  } finally {
    loading.value = false
    setTimeout(() => {
      skipSave = false
    }, 100)
  }
}

function pnlValue(pnl: number | null | string | undefined): number {
  if (pnl == null || pnl === '') return 0
  const n = Number(pnl)
  return Number.isFinite(n) ? n : 0
}

export function useJournal() {
  const { isAuthenticated } = useAuth()
  onMounted(loadEntries)

  const visibleEntries = computed(() => {
    const filtered = filterEntriesByDate(entries.value, dateFrom.value, dateTo.value)
    return sortEntries(filtered, sortField.value, sortDirection.value)
  })

  /** Chỉ entry public (visible) trong khoảng ngày — dùng cho PnL / Win */
  const statsEntries = computed(() =>
    visibleEntries.value.filter((e) => e.visible),
  )

  const totalPnl = computed(() =>
    statsEntries.value.reduce((sum, e) => sum + pnlValue(e.pnl), 0),
  )

  const winCount = computed(() =>
    statsEntries.value.filter((e) => pnlValue(e.pnl) > 0).length,
  )

  function setSort(field: SortField) {
    const next = toggleSort(field, sortField.value, sortDirection.value)
    sortField.value = next.field
    sortDirection.value = next.direction
  }

  function resetToCurrentWeek() {
    const range = getCurrentWeekRange()
    dateFrom.value = range.from
    dateTo.value = range.to
  }

  function resetToCurrentMonth() {
    const range = getCurrentMonthRange()
    dateFrom.value = range.from
    dateTo.value = range.to
  }

  const allTagSuggestions = computed(() => {
    const fromEntries = entries.value.flatMap((e) => e.tags.map((t) => t.trim().toUpperCase()))
    return [...new Set([...tagSuggestions.value, ...fromEntries])]
  })

  const allPairSuggestions = computed(() => {
    const fromEntries = entries.value
      .map((e) => e.pair.trim().toUpperCase())
      .filter(Boolean)
    return [...new Set([...pairSuggestions.value, ...fromEntries])]
  })

  async function addEntry() {
    if (!isAuthenticated.value) return
    try {
      const entry = await journalApi.createEntry()
      entries.value.unshift(entry)
      await refreshPairs()
      await refreshTags()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Không thêm được dòng'
    }
  }

  async function removeEntry(id: number) {
    if (!isAuthenticated.value) return
    const entry = entries.value.find((e) => e.id === id)
    const summary = entry
      ? [
          entry.no ? `#${entry.no}` : '',
          entry.pair,
          entry.date,
        ]
          .filter(Boolean)
          .join(' · ')
      : ''

    const message = summary
      ? `Xóa giao dịch ${summary}?\nHành động này không thể hoàn tác.`
      : 'Xóa giao dịch này?\nHành động này không thể hoàn tác.'

    if (!window.confirm(message)) return

    try {
      await journalApi.deleteEntry(id)
      entries.value = entries.value.filter((e) => e.id !== id)
      await refreshPairs()
      await refreshTags()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Không xóa được dòng'
    }
  }

  async function uploadImage(entryId: number, file: File) {
    if (!isAuthenticated.value) return
    const updated = await journalApi.uploadImage(entryId, file)
    const idx = entries.value.findIndex((e) => e.id === entryId)
    if (idx !== -1) entries.value[idx] = updated
  }

  async function removeImage(entryId: number, imageId: number) {
    if (!isAuthenticated.value) return
    const updated = await journalApi.deleteImage(entryId, imageId)
    const idx = entries.value.findIndex((e) => e.id === entryId)
    if (idx !== -1) entries.value[idx] = updated
  }

  return {
    entries,
    visibleEntries,
    statsEntries,
    dateFrom,
    dateTo,
    sortField,
    sortDirection,
    setSort,
    resetToCurrentWeek,
    resetToCurrentMonth,
    pairSuggestions: allPairSuggestions,
    tagSuggestions: allTagSuggestions,
    loading,
    error,
    totalPnl,
    winCount,
    addEntry,
    removeEntry,
    uploadImage,
    removeImage,
    reload: loadEntries,
  }
}
