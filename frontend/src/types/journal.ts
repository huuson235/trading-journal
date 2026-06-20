export type Session = 'Asia' | 'London' | 'NYA' | 'NYL' | 'NYP'

export interface TimeframeNote {
  imageUrl: string | null
  thumbUrl: string | null
  text: string
}

export interface JournalEntry {
  id: number
  no: number
  date: string
  createdAt: string
  session: Session
  pair: string
  rr: number | null
  pnl: number | null
  note: string
  htf: TimeframeNote
  mtf: TimeframeNote
  ltf: TimeframeNote
}

export const SESSIONS: Session[] = ['Asia', 'London', 'NYA', 'NYL', 'NYP']

export type SortField = 'date' | 'pnl' | 'rr' | 'pair' | 'session'
export type SortDirection = 'asc' | 'desc'
