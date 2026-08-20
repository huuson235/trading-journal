export type Timeframe = 'W-H4-M15' | 'D-H1-M5' | 'MARCO' | 'SWING-H4' | 'SWING-H1' | ''
export type TradeResult = 'Take profit' | 'Stop loss' | 'BE' | ''
export type Ctc = 'bullish' | 'bearish' | 'sideways' | ''
export type Bias = 'bullish' | 'bearish' | 'no_bias' | ''
export type MtfModel = 'CRT' | 'I-E' | 'E-E' | 'Unicorn' | ''
export type ImageSlot = 'htf' | 'mtf' | 'ltf'
export type Direction = 'LONG' | 'SHORT'

export interface EntryImage {
  id: number
  slot?: ImageSlot
  imageUrl: string
  thumbUrl: string | null
}

export interface JournalEntry {
  id: number
  no: number
  date: string
  createdAt: string
  session: Session
  timeframe: Timeframe
  pair: string
  direction: Direction
  rrIdea: number | null
  rrReal: number | null
  checklist: boolean
  pnl: number | null
  result: TradeResult
  note: string
  tags: string[]
  visible: boolean
  htfCtc: Ctc
  htfBias: Bias
  htfPda: string
  htfDol: string
  mtfCtc: Ctc
  mtfPda: string
  mtfModel: MtfModel
  mtfSweep: boolean
  mtfCisd: boolean
  mtfMss: boolean
  ltfSweep: boolean
  ltfCisd: boolean
  ltfMss: boolean
  ltfEntry: string
  ltfExist: boolean
  htfImages: EntryImage[]
  mtfImages: EntryImage[]
  ltfImages: EntryImage[]
  images: EntryImage[]
}

export const SESSIONS: Session[] = ['London', 'Asia', 'New York AM', 'New York PM', 'No session']
export const TIMEFRAMES: Exclude<Timeframe, ''>[] = ['W-H4-M15', 'D-H1-M5', 'MARCO', 'SWING-H4', 'SWING-H1']
export const SWING_TIMEFRAMES: Exclude<Timeframe, ''>[] = ['SWING-H4', 'SWING-H1']

export function timeframeHasLtf(timeframe: Timeframe | string | null | undefined) {
  return !SWING_TIMEFRAMES.includes(timeframe as Exclude<Timeframe, ''>)
}
export const RESULTS: Exclude<TradeResult, ''>[] = ['Take profit', 'Stop loss', 'BE']
export const CTC_OPTIONS: Exclude<Ctc, ''>[] = ['bullish', 'bearish', 'sideways']
export const BIAS_OPTIONS: Exclude<Bias, ''>[] = ['bullish', 'bearish', 'no_bias']
export const MTF_MODELS: Exclude<MtfModel, ''>[] = ['CRT', 'I-E', 'E-E', 'Unicorn']
export const DIRECTIONS: Direction[] = ['LONG', 'SHORT']

export type TradePayload = Omit<
  JournalEntry,
  'id' | 'no' | 'createdAt' | 'htfImages' | 'mtfImages' | 'ltfImages' | 'images'
>

export type SortField = 'date' | 'pnl' | 'rrIdea' | 'rrReal' | 'pair' | 'result' | 'session'
export type SortDirection = 'asc' | 'desc'
