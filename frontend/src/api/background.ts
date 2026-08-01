import { request } from '@/api/client'
import type { BackgroundSettings } from '@/types/background'

function base(slug: string) {
  return `/api/u/${encodeURIComponent(slug)}`
}

export function fetchBackground(slug: string) {
  return request<BackgroundSettings>(`${base(slug)}/settings/background`)
}

export function updateBackground(slug: string, settings: BackgroundSettings) {
  return request<BackgroundSettings>(`${base(slug)}/settings/background`, {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}

export function uploadBackgroundImage(
  slug: string,
  file: File,
  fit?: string,
  overlay?: number,
) {
  const form = new FormData()
  form.append('image', file)
  if (fit) form.append('fit', fit)
  if (overlay != null) form.append('overlay', String(overlay))
  return request<BackgroundSettings>(`${base(slug)}/settings/background/image`, {
    method: 'POST',
    body: form,
  })
}
