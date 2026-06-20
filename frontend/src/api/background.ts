import { request } from '@/api/client'
import type { BackgroundSettings } from '@/types/background'

export function fetchBackground() {
  return request<BackgroundSettings>('/api/settings/background')
}

export function updateBackground(settings: BackgroundSettings) {
  return request<BackgroundSettings>('/api/settings/background', {
    method: 'PUT',
    body: JSON.stringify(settings),
  })
}

export function uploadBackgroundImage(file: File, fit?: string, overlay?: number) {
  const form = new FormData()
  form.append('image', file)
  if (fit) form.append('fit', fit)
  if (overlay != null) form.append('overlay', String(overlay))
  return request<BackgroundSettings>('/api/settings/background/image', {
    method: 'POST',
    body: form,
  })
}
