import type { JournalEntry, SortDirection, SortField } from '@/types/journal'
import { isIsoInRange } from '@/utils/date'

export function filterEntriesByDate(
  entries: JournalEntry[],
  from: string,
  to: string,
): JournalEntry[] {
  return entries.filter((e) => isIsoInRange(e.date, from, to))
}

function nullNumberOrder(value: number | null, dir: SortDirection): number {
  return value ?? (dir === 'asc' ? Infinity : -Infinity)
}

/** lose = -1, neutral = 0, win = 1 */
function resultOrder(pnl: number | null): number {
  if (pnl == null || pnl === 0) return 0
  return pnl > 0 ? 1 : -1
}

export function sortEntries(
  entries: JournalEntry[],
  field: SortField,
  direction: SortDirection,
): JournalEntry[] {
  const mul = direction === 'asc' ? 1 : -1

  return [...entries].sort((a, b) => {
    let cmp = 0

    switch (field) {
      case 'date':
        cmp = a.createdAt.localeCompare(b.createdAt)
        break
      case 'pnl':
        cmp = nullNumberOrder(a.pnl, direction) - nullNumberOrder(b.pnl, direction)
        break
      case 'rr':
        cmp = nullNumberOrder(a.rr, direction) - nullNumberOrder(b.rr, direction)
        break
      case 'pair':
        cmp = a.pair.localeCompare(b.pair, undefined, { sensitivity: 'base' })
        break
      case 'result':
        cmp = resultOrder(a.pnl) - resultOrder(b.pnl)
        break
    }

    return mul * cmp || a.id - b.id
  })
}

export function toggleSort(
  field: SortField,
  currentField: SortField,
  currentDirection: SortDirection,
): { field: SortField; direction: SortDirection } {
  if (currentField === field) {
    return { field, direction: currentDirection === 'asc' ? 'desc' : 'asc' }
  }
  return { field, direction: field === 'date' || field === 'result' ? 'desc' : 'asc' }
}
