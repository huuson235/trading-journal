import { ref, computed, watch, onMounted, type MaybeRefOrGetter, toValue } from 'vue'
import type { JournalEntry, SortDirection, SortField } from '@/types/journal'
import * as journalApi from '@/api/journal'
import { getAuthToken } from '@/api/client'
import { debounce } from '@/utils/debounce'
import {
  getCurrentMonthRange,
  getCurrentWeekRange,
  getPreviousMonthRange,
  getPreviousWeekRange,
} from '@/utils/date'
import { filterEntriesByDate, sortEntries, toggleSort } from '@/utils/entriesView'
import { useAuth } from '@/composables/useAuth'

export function useJournal(slugSource: MaybeRefOrGetter<string>) {
  const { canEditSlug } = useAuth()

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

  function currentSlug() {
    return toValue(slugSource)
  }

  function queueSave(entry: JournalEntry) {
    const slug = currentSlug()
    if (skipSave || !entry.id || !getAuthToken() || !canEditSlug(slug)) return

    const existing = saveTimers.get(entry.id)
    if (existing) clearTimeout(existing)

    saveTimers.set(
      entry.id,
      setTimeout(async () => {
        try {
          const updated = await journalApi.updateEntry(slug, entry.id, entry)
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
      tagSuggestions.value = await journalApi.fetchTags(currentSlug())
    } catch {
      /* ignore */
    }
  }

  async function refreshPairs() {
    try {
      pairSuggestions.value = await journalApi.fetchPairs(currentSlug())
    } catch {
      /* ignore */
    }
  }

  async function loadEntries() {
    loading.value = true
    error.value = null
    skipSave = true
    try {
      const slug = currentSlug()
      const [data, pairs, tags] = await Promise.all([
        journalApi.fetchEntries(slug),
        journalApi.fetchPairs(slug),
        journalApi.fetchTags(slug),
      ])
      entries.value = data
      pairSuggestions.value = pairs
      tagSuggestions.value = tags
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Không tải được dữ liệu'
      entries.value = []
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

  const visibleEntries = computed(() => {
    const filtered = filterEntriesByDate(entries.value, dateFrom.value, dateTo.value)
    return sortEntries(filtered, sortField.value, sortDirection.value)
  })

  const statsEntries = computed(() => visibleEntries.value.filter((e) => e.visible))

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

  function resetToPreviousWeek() {
    const range = getPreviousWeekRange()
    dateFrom.value = range.from
    dateTo.value = range.to
  }

  function resetToCurrentMonth() {
    const range = getCurrentMonthRange()
    dateFrom.value = range.from
    dateTo.value = range.to
  }

  function resetToPreviousMonth() {
    const range = getPreviousMonthRange()
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
    const slug = currentSlug()
    if (!canEditSlug(slug)) return
    try {
      const entry = await journalApi.createEntry(slug)
      entries.value.unshift(entry)
      await refreshPairs()
      await refreshTags()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Không thêm được dòng'
    }
  }

  async function removeEntry(id: number) {
    const slug = currentSlug()
    if (!canEditSlug(slug)) return
    const entry = entries.value.find((e) => e.id === id)
    const summary = entry
      ? [entry.no ? `#${entry.no}` : '', entry.pair, entry.date].filter(Boolean).join(' · ')
      : ''

    const message = summary
      ? `Xóa giao dịch ${summary}?\nHành động này không thể hoàn tác.`
      : 'Xóa giao dịch này?\nHành động này không thể hoàn tác.'

    if (!window.confirm(message)) return

    try {
      await journalApi.deleteEntry(slug, id)
      entries.value = entries.value.filter((e) => e.id !== id)
      await refreshPairs()
      await refreshTags()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Không xóa được dòng'
    }
  }

  async function uploadImage(entryId: number, file: File) {
    const slug = currentSlug()
    if (!canEditSlug(slug)) return
    const updated = await journalApi.uploadImage(slug, entryId, file)
    const idx = entries.value.findIndex((e) => e.id === entryId)
    if (idx !== -1) entries.value[idx] = updated
  }

  async function removeImage(entryId: number, imageId: number) {
    const slug = currentSlug()
    if (!canEditSlug(slug)) return
    const updated = await journalApi.deleteImage(slug, entryId, imageId)
    const idx = entries.value.findIndex((e) => e.id === entryId)
    if (idx !== -1) entries.value[idx] = updated
  }

  watch(
    () => toValue(slugSource),
    () => {
      loadEntries()
    },
  )

  onMounted(loadEntries)

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
    resetToPreviousWeek,
    resetToCurrentMonth,
    resetToPreviousMonth,
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
