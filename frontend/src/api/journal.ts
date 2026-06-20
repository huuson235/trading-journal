import { request } from './client'
import type { JournalEntry, Session } from '@/types/journal'

export type TimeframeSlot = 'htf' | 'mtf' | 'ltf'

export function fetchEntries() {
  return request<JournalEntry[]>('/api/entries')
}

export function fetchEntry(id: number) {
  return request<JournalEntry>(`/api/entries/${id}`)
}

export function fetchPairs() {
  return request<string[]>('/api/pairs')
}

export function createEntry(data?: Partial<JournalEntry>) {
  return request<JournalEntry>('/api/entries', {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  })
}

export function updateEntry(id: number, entry: JournalEntry) {
  return request<JournalEntry>(`/api/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      date: entry.date,
      session: entry.session,
      pair: entry.pair,
      rr: entry.rr,
      pnl: entry.pnl,
      note: entry.note,
      htf: { text: entry.htf.text },
      mtf: { text: entry.mtf.text },
      ltf: { text: entry.ltf.text },
    }),
  })
}

export function deleteEntry(id: number) {
  return request<void>(`/api/entries/${id}`, { method: 'DELETE' })
}

export function uploadImage(id: number, slot: TimeframeSlot, file: File) {
  const form = new FormData()
  form.append('image', file)
  return request<JournalEntry>(`/api/entries/${id}/images/${slot}`, {
    method: 'POST',
    body: form,
  })
}

export function deleteImage(id: number, slot: TimeframeSlot) {
  return request<JournalEntry>(`/api/entries/${id}/images/${slot}`, {
    method: 'DELETE',
  })
}

export type { Session }
