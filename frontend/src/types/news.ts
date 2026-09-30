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

/** iso = mã quốc gia ISO 3166-1 alpha-2 (dùng cho ảnh cờ) */
export const CURRENCY_META: Record<string, { iso: string; name: string }> = {
  USD: { iso: 'us', name: 'United States' },
  EUR: { iso: 'eu', name: 'Eurozone' },
  GBP: { iso: 'gb', name: 'United Kingdom' },
  JPY: { iso: 'jp', name: 'Japan' },
  AUD: { iso: 'au', name: 'Australia' },
  CAD: { iso: 'ca', name: 'Canada' },
  CHF: { iso: 'ch', name: 'Switzerland' },
  NZD: { iso: 'nz', name: 'New Zealand' },
  CNY: { iso: 'cn', name: 'China' },
  CNH: { iso: 'cn', name: 'China' },
  HKD: { iso: 'hk', name: 'Hong Kong' },
  SGD: { iso: 'sg', name: 'Singapore' },
  SEK: { iso: 'se', name: 'Sweden' },
  NOK: { iso: 'no', name: 'Norway' },
  DKK: { iso: 'dk', name: 'Denmark' },
  PLN: { iso: 'pl', name: 'Poland' },
  TRY: { iso: 'tr', name: 'Turkey' },
  MXN: { iso: 'mx', name: 'Mexico' },
  ZAR: { iso: 'za', name: 'South Africa' },
  INR: { iso: 'in', name: 'India' },
  KRW: { iso: 'kr', name: 'South Korea' },
  BRL: { iso: 'br', name: 'Brazil' },
  RUB: { iso: 'ru', name: 'Russia' },
}

export function currencyIso(code: string): string | null {
  return CURRENCY_META[code.toUpperCase()]?.iso ?? null
}

export function currencyFlagUrl(code: string): string | null {
  const iso = currencyIso(code)
  if (!iso) return null
  // flagcdn: h20 ổn định trên mọi trình duyệt (không dùng emoji)
  return `https://flagcdn.com/h20/${iso}.png`
}

export function currencyName(code: string): string {
  return CURRENCY_META[code.toUpperCase()]?.name ?? code
}
