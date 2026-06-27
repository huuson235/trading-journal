export type Session = 'Asia' | 'London' | 'NYA' | 'NYL' | 'NYP'
export type Direction = 'LONG' | 'SHORT'

export interface EntryImage {
  id: number
  imageUrl: string
  thumbUrl: string | null
}

export interface JournalEntry {
  id: number
  no: number
  date: string
  createdAt: string
  session: Session
  pair: string
  direction: Direction
  rr: number | null
  pnl: number | null
  tags: string[]
  visible: boolean
  images: EntryImage[]
}

export const SESSIONS: Session[] = ['Asia', 'London', 'NYA', 'NYL', 'NYP']
export const DIRECTIONS: Direction[] = ['LONG', 'SHORT']

export type SortField = 'date' | 'pnl' | 'rr' | 'pair' | 'result'
export type SortDirection = 'asc' | 'desc'
