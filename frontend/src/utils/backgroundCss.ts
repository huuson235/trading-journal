import type { BackgroundPattern, BackgroundSettings } from '@/types/background'
import type { Theme } from '@/composables/useTheme'

const DEFAULT_LIGHT = '#fafafa'
const DEFAULT_DARK = '#09090b'

function hexWithAlpha(hex: string, alpha: number): string {
  const normalized = hex.replace('#', '')
  const full =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized.slice(0, 6)
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
    return `rgba(113, 113, 122, ${alpha})`
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function patternImage(pattern: BackgroundPattern, color: string, opacity: number): string {
  const c = hexWithAlpha(color, opacity)
  switch (pattern) {
    case 'grid':
      return `linear-gradient(${c} 1px, transparent 1px), linear-gradient(90deg, ${c} 1px, transparent 1px)`
    case 'diagonal':
      return `repeating-linear-gradient(-45deg, ${c}, ${c} 1px, transparent 1px, transparent 10px)`
    default:
      return `radial-gradient(${c} 1.2px, transparent 1.2px)`
  }
}

function patternSize(pattern: BackgroundPattern): string {
  switch (pattern) {
    case 'grid':
      return '20px 20px'
    case 'diagonal':
      return 'auto'
    default:
      return '16px 16px'
  }
}

function clearCustomBackground(body: HTMLElement) {
  body.removeAttribute('data-bg-custom')
  for (const prop of ['--app-bg-color', '--app-bg-image', '--app-bg-size', '--app-bg-repeat']) {
    body.style.removeProperty(prop)
  }
}

export function applyBackgroundToDocument(settings: BackgroundSettings, theme: Theme) {
  const body = document.body
  if (settings.type === 'default') {
    clearCustomBackground(body)
    return
  }

  body.setAttribute('data-bg-custom', 'true')
  const baseDefault = theme === 'dark' ? DEFAULT_DARK : DEFAULT_LIGHT

  if (settings.type === 'solid') {
    body.style.setProperty('--app-bg-color', settings.color || baseDefault)
    body.style.setProperty('--app-bg-image', 'none')
    body.style.removeProperty('--app-bg-size')
    body.style.removeProperty('--app-bg-repeat')
    return
  }

  if (settings.type === 'pattern') {
    const pattern = settings.pattern || 'dots'
    const base = settings.baseColor || baseDefault
    body.style.setProperty('--app-bg-color', base)
    body.style.setProperty(
      '--app-bg-image',
      patternImage(pattern, settings.color || '#71717a', settings.opacity ?? 0.15),
    )
    body.style.setProperty('--app-bg-size', patternSize(pattern))
    body.style.setProperty('--app-bg-repeat', 'repeat')
    return
  }

  if (settings.type === 'image' && settings.imageUrl) {
    const overlay = settings.overlay ?? 0
    const fit = settings.fit || 'cover'
    let bgImage = `url("${settings.imageUrl}")`
    if (overlay > 0) {
      const overlayColor =
        theme === 'dark' ? `rgba(0,0,0,${overlay})` : `rgba(255,255,255,${overlay})`
      bgImage = `linear-gradient(${overlayColor}, ${overlayColor}), url("${settings.imageUrl}")`
    }
    body.style.setProperty('--app-bg-color', baseDefault)
    body.style.setProperty('--app-bg-image', bgImage)
    body.style.setProperty('--app-bg-size', fit === 'tile' ? 'auto' : fit)
    body.style.setProperty('--app-bg-repeat', fit === 'tile' ? 'repeat' : 'no-repeat')
  }
}

export function getCurrentTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}
