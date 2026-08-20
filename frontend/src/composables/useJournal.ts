import { ref, computed, watch, onMounted, type MaybeRefOrGetter, toValue } from 'vue'
import type { ImageSlot, JournalEntry, SortDirection, SortField, TradePayload } from '@/types/journal'
import * as journalApi from '@/api/journal'
import { getAuthToken } from '@/api/client'
import {
  getCurrentMonthRange,
  getCurrentWeekRange,
  getPreviousMonthRange,
  getPreviousWeekRange,
} from '@/utils/date'
import { filterEntriesByDate, sortEntries, toggleSort } from '@/utils/entriesView'
import { useAuth } from '@/composables/useAuth'

export type SlotFiles = Record<ImageSlot, File[]>

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

  function currentSlug() {
    return toValue(slugSource)
  }

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

  function replaceEntry(updated: JournalEntry) {
    const idx = entries.value.findIndex((e) => e.id === updated.id)
    if (idx === -1) entries.value.unshift(updated)
    else entries.value[idx] = updated
  }

  async function loadEntries() {
    loading.value = true
    error.value = null
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
    }
  }

  function pnlValue(pnl: number | null | string | undefined): number {
    if (pnl == null || pnl === '') return 0
    const n = Number(pnl)
    return Number.isFinite(n) ? n : 0
  }

  function isWin(entry: JournalEntry): boolean {
    if (entry.result === 'Take profit') return true
    if (entry.result === 'Stop loss' || entry.result === 'BE') return false
    return pnlValue(entry.pnl) > 0
  }

  const visibleEntries = computed(() => {
    const filtered = filterEntriesByDate(entries.value, dateFrom.value, dateTo.value)
    return sortEntries(filtered, sortField.value, sortDirection.value)
  })

  const statsEntries = computed(() => visibleEntries.value.filter((e) => e.visible))

  const totalPnl = computed(() =>
    statsEntries.value.reduce((sum, e) => sum + pnlValue(e.pnl), 0),
  )

  const totalRrReal = computed(() =>
    statsEntries.value.reduce((sum, e) => sum + pnlValue(e.rrReal), 0),
  )

  const winCount = computed(() => statsEntries.value.filter(isWin).length)

  const winRate = computed(() => {
    const total = statsEntries.value.length
    if (total === 0) return 0
    return Math.round((winCount.value / total) * 100)
  })

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

  const allPairSuggestions = computed(() => {
    const fromEntries = entries.value
      .map((e) => e.pair.trim().toUpperCase())
      .filter(Boolean)
    return [...new Set([...pairSuggestions.value, ...fromEntries])]
  })

  const allTagSuggestions = computed(() => {
    const fromEntries = entries.value.flatMap((e) => e.tags.map((t) => t.trim().toUpperCase()))
    return [...new Set([...tagSuggestions.value, ...fromEntries])]
  })

  async function uploadSlotFiles(entryId: number, files: SlotFiles) {
    const slug = currentSlug()
    let latest: JournalEntry | null = null
    for (const slot of ['htf', 'mtf', 'ltf'] as const) {
      for (const file of files[slot]) {
        latest = await journalApi.uploadImage(slug, entryId, file, slot)
      }
    }
    return latest
  }

  async function saveTrade(
    payload: Partial<TradePayload>,
    files: SlotFiles = { htf: [], mtf: [], ltf: [] },
    options: { id?: number; removedImageIds?: number[] } = {},
  ) {
    const slug = currentSlug()
    if (!canEditSlug(slug) || !getAuthToken()) return null

    try {
      let entry: JournalEntry
      if (options.id) {
        entry = await journalApi.updateEntry(slug, options.id, payload)
        for (const imageId of options.removedImageIds ?? []) {
          entry = await journalApi.deleteImage(slug, options.id, imageId)
        }
      } else {
        entry = await journalApi.createEntry(slug, payload)
      }

      replaceEntry(entry)

      try {
        const uploaded = await uploadSlotFiles(entry.id, files)
        if (uploaded) {
          entry = uploaded
          replaceEntry(entry)
        }
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'Đã lưu giao dịch nhưng không tải được một số ảnh'
      }

      await refreshPairs()
      await refreshTags()
      return entry
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Không lưu được giao dịch'
      throw e
    }
  }

  async function setVisible(id: number, visible: boolean) {
    const slug = currentSlug()
    if (!canEditSlug(slug)) return
    const current = entries.value.find((e) => e.id === id)
    if (!current) return
    try {
      const updated = await journalApi.updateEntry(slug, id, { ...current, visible })
      replaceEntry(updated)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Không cập nhật được hiển thị'
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
    totalRrReal,
    winCount,
    winRate,
    saveTrade,
    setVisible,
    removeEntry,
    reload: loadEntries,
  }
}
