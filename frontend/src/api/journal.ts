import { request } from './client'
import type { Direction, JournalEntry, Session } from '@/types/journal'

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
      direction: entry.direction,
      rr: entry.rr,
      pnl: entry.pnl,
      note: entry.note,
      visible: entry.visible,
    }),
  })
}

export function deleteEntry(id: number) {
  return request<void>(`/api/entries/${id}`, { method: 'DELETE' })
}

export function uploadImage(id: number, file: File) {
  const form = new FormData()
  form.append('image', file)
  return request<JournalEntry>(`/api/entries/${id}/images`, {
    method: 'POST',
    body: form,
  })
}

export function deleteImage(id: number, imageId: number) {
  return request<JournalEntry>(`/api/entries/${id}/images/${imageId}`, {
    method: 'DELETE',
  })
}

export type { Session, Direction }
