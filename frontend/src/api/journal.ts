import { request } from './client'
import type { ImageSlot, JournalEntry, TradePayload } from '@/types/journal'

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

export function toEntryBody(entry: Partial<TradePayload>) {
  return {
    date: entry.date,
    session: entry.session,
    pair: entry.pair,
    direction: entry.direction,
    rrIdea: entry.rrIdea,
    rrReal: entry.rrReal,
    checklist: entry.checklist,
    pnl: entry.pnl,
    result: entry.result,
    note: entry.note,
    tags: entry.tags,
    visible: entry.visible,
    htfCtc: entry.htfCtc,
    htfBias: entry.htfBias,
    htfPda: entry.htfPda,
    htfDol: entry.htfDol,
    mtfCtc: entry.mtfCtc,
    mtfPda: entry.mtfPda,
    mtfModel: entry.mtfModel,
    mtfSweep: entry.mtfSweep,
    mtfCisd: entry.mtfCisd,
    mtfMss: entry.mtfMss,
    ltfSweep: entry.ltfSweep,
    ltfCisd: entry.ltfCisd,
    ltfMss: entry.ltfMss,
    ltfEntry: entry.ltfEntry,
  }
}

export function createEntry(slug: string, data?: Partial<TradePayload>) {
  return request<JournalEntry>(`${base(slug)}/entries`, {
    method: 'POST',
    body: JSON.stringify(data ? toEntryBody(data) : {}),
  })
}

export function updateEntry(slug: string, id: number, entry: Partial<TradePayload>) {
  return request<JournalEntry>(`${base(slug)}/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(toEntryBody(entry)),
  })
}

export function deleteEntry(slug: string, id: number) {
  return request<void>(`${base(slug)}/entries/${id}`, { method: 'DELETE' })
}

export function uploadImage(slug: string, id: number, file: File, slot: ImageSlot = 'htf') {
  const form = new FormData()
  form.append('image', file)
  form.append('slot', slot)
  return request<JournalEntry>(`${base(slug)}/entries/${id}/images?slot=${encodeURIComponent(slot)}`, {
    method: 'POST',
    body: form,
  })
}

export function deleteImage(slug: string, id: number, imageId: number) {
  return request<JournalEntry>(`${base(slug)}/entries/${id}/images/${imageId}`, {
    method: 'DELETE',
  })
}
