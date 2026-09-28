import { request } from './client'
import type { NewsCalendarResponse } from '@/types/news'

export function fetchNewsCalendar() {
  return request<NewsCalendarResponse>('/api/news/calendar')
}
