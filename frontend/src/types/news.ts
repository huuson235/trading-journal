export type NewsImpact = 'Holiday' | 'Low' | 'Medium' | 'High' | string

export interface NewsEvent {
  title: string
  country: string
  date: string
  impact: NewsImpact
  forecast: string
  previous: string
  actual?: string
}

export interface NewsCalendarResponse {
  events: NewsEvent[]
  fetchedAt: number
  source: string
}

export const IMPACT_OPTIONS = ['High', 'Medium', 'Low', 'Holiday'] as const

export const CURRENCY_META: Record<
  string,
  { flag: string; name: string }
> = {
  USD: { flag: '🇺🇸', name: 'United States' },
  EUR: { flag: '🇪🇺', name: 'Eurozone' },
  GBP: { flag: '🇬🇧', name: 'United Kingdom' },
  JPY: { flag: '🇯🇵', name: 'Japan' },
  AUD: { flag: '🇦🇺', name: 'Australia' },
  CAD: { flag: '🇨🇦', name: 'Canada' },
  CHF: { flag: '🇨🇭', name: 'Switzerland' },
  NZD: { flag: '🇳🇿', name: 'New Zealand' },
  CNY: { flag: '🇨🇳', name: 'China' },
  CNH: { flag: '🇨🇳', name: 'China' },
  HKD: { flag: '🇭🇰', name: 'Hong Kong' },
  SGD: { flag: '🇸🇬', name: 'Singapore' },
  SEK: { flag: '🇸🇪', name: 'Sweden' },
  NOK: { flag: '🇳🇴', name: 'Norway' },
  DKK: { flag: '🇩🇰', name: 'Denmark' },
  PLN: { flag: '🇵🇱', name: 'Poland' },
  TRY: { flag: '🇹🇷', name: 'Turkey' },
  MXN: { flag: '🇲🇽', name: 'Mexico' },
  ZAR: { flag: '🇿🇦', name: 'South Africa' },
  INR: { flag: '🇮🇳', name: 'India' },
  KRW: { flag: '🇰🇷', name: 'South Korea' },
  BRL: { flag: '🇧🇷', name: 'Brazil' },
  RUB: { flag: '🇷🇺', name: 'Russia' },
}

export function currencyFlag(code: string): string {
  return CURRENCY_META[code.toUpperCase()]?.flag ?? '🏳️'
}

export function currencyName(code: string): string {
  return CURRENCY_META[code.toUpperCase()]?.name ?? code
}
