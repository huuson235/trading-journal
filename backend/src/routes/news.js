import { Router } from 'express'

const router = Router()

const SOURCE_URL = 'https://nfs.faireconomy.media/ff_calendar_thisweek.json'
const CACHE_TTL_MS = 60_000

let cache = {
  data: null,
  fetchedAt: 0,
  error: null,
}

async function fetchCalendar() {
  const now = Date.now()
  if (cache.data && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data
  }

  const res = await fetch(SOURCE_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'trading-journal-news/1.0',
    },
  })

  if (!res.ok) {
    if (cache.data) return cache.data
    throw new Error(`Không tải được lịch tin tức (HTTP ${res.status})`)
  }

  const data = await res.json()
  if (!Array.isArray(data)) {
    throw new Error('Định dạng dữ liệu tin tức không hợp lệ')
  }

  cache = { data, fetchedAt: now, error: null }
  return data
}

router.get('/calendar', async (_req, res) => {
  try {
    const events = await fetchCalendar()
    res.set('Cache-Control', 'public, max-age=30')
    res.json({
      events,
      fetchedAt: cache.fetchedAt,
      source: SOURCE_URL,
    })
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Không tải được lịch tin tức',
    })
  }
})

export default router
