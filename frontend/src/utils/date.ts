/** ISO YYYY-MM-DD ↔ hiển thị DD/MM/YYYY */

export function isoToDisplay(iso: string): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function displayToIso(display: string): string | null {
  const trimmed = display.trim()
  const match = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const date = new Date(iso + 'T00:00:00')
  if (date.getFullYear() !== year || date.getMonth() + 1 !== month || date.getDate() !== day) {
    return null
  }
  return iso
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function todayDisplay(): string {
  return isoToDisplay(todayIso())
}

function toIsoLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Tuần hiện tại: Thứ 2 → Chủ nhật */
export function getCurrentWeekRange(): { from: string; to: string } {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day

  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  monday.setHours(0, 0, 0, 0)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return { from: toIsoLocal(monday), to: toIsoLocal(sunday) }
}

/** Tháng hiện tại: ngày 1 → cuối tháng */
export function getCurrentMonthRange(): { from: string; to: string } {
  const now = new Date()
  const first = new Date(now.getFullYear(), now.getMonth(), 1)
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: toIsoLocal(first), to: toIsoLocal(last) }
}

export function isIsoInRange(iso: string, from: string, to: string): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const start = from <= to ? from : to
  const end = from <= to ? to : from
  return iso >= start && iso <= end
}
