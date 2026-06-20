export type BackgroundType = 'default' | 'solid' | 'pattern' | 'image'

export type BackgroundPattern = 'dots' | 'grid' | 'diagonal'

export type BackgroundFit = 'cover' | 'contain' | 'tile'

export interface BackgroundSettings {
  type: BackgroundType
  color?: string
  pattern?: BackgroundPattern
  opacity?: number
  baseColor?: string
  imageUrl?: string
  filename?: string
  fit?: BackgroundFit
  overlay?: number
}

export const DEFAULT_BACKGROUND: BackgroundSettings = { type: 'default' }

export const PATTERN_OPTIONS: { id: BackgroundPattern; label: string }[] = [
  { id: 'dots', label: 'Chấm' },
  { id: 'grid', label: 'Lưới' },
  { id: 'diagonal', label: 'Chéo' },
]

export const SOLID_PRESETS = [
  '#fafafa',
  '#f4f4f5',
  '#e0e7ff',
  '#d1fae5',
  '#09090b',
  '#18181b',
  '#1e1b4b',
  '#14532d',
]

export const FIT_OPTIONS: { id: BackgroundFit; label: string }[] = [
  { id: 'cover', label: 'Phủ kín' },
  { id: 'contain', label: 'Vừa khung' },
  { id: 'tile', label: 'Lặp lại' },
]
