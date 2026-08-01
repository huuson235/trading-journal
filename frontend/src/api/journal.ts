import { request } from './client'
import type { Direction, JournalEntry, Session } from '@/types/journal'

function base(slug: string) {
  return `/api/u/${encodeURIComponent(slug)}`
}

export function fetchEntries(slug: string) {
  return request<JournalEntry[]>(`${base(slug)}/entries`)
}

export function fetchEntry(slug: string, id: number) {
  return request<JournalEntry>(`${base(slug)}/entries/${id}`)
}

export function fetchPairs(slug: string) {
  return request<string[]>(`${base(slug)}/pairs`)
}

export function fetchTags(slug: string) {
  return request<string[]>(`${base(slug)}/tags`)
}

export function createEntry(slug: string, data?: Partial<JournalEntry>) {
  return request<JournalEntry>(`${base(slug)}/entries`, {
    method: 'POST',
    body: JSON.stringify(data ?? {}),
  })
}

export function updateEntry(slug: string, id: number, entry: JournalEntry) {
  return request<JournalEntry>(`${base(slug)}/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      date: entry.date,
      session: entry.session,
      pair: entry.pair,
      direction: entry.direction,
      rr: entry.rr,
      pnl: entry.pnl,
      tags: entry.tags,
      visible: entry.visible,
    }),
  })
}

export function deleteEntry(slug: string, id: number) {
  return request<void>(`${base(slug)}/entries/${id}`, { method: 'DELETE' })
}

export function uploadImage(slug: string, id: number, file: File) {
  const form = new FormData()
  form.append('image', file)
  return request<JournalEntry>(`${base(slug)}/entries/${id}/images`, {
    method: 'POST',
    body: form,
  })
}

export function deleteImage(slug: string, id: number, imageId: number) {
  return request<JournalEntry>(`${base(slug)}/entries/${id}/images/${imageId}`, {
    method: 'DELETE',
  })
}

export type { Session, Direction }
