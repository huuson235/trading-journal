import { ref, watch } from 'vue'
import * as backgroundApi from '@/api/background'
import { getAuthToken } from '@/api/client'
import { useTheme } from '@/composables/useTheme'
import {
  DEFAULT_BACKGROUND,
  type BackgroundFit,
  type BackgroundPattern,
  type BackgroundSettings,
  type BackgroundType,
} from '@/types/background'
import { applyBackgroundToDocument, getCurrentTheme } from '@/utils/backgroundCss'

const STORAGE_KEY = 'background'

const settings = ref<BackgroundSettings>({ ...DEFAULT_BACKGROUND })
const loading = ref(false)
const saving = ref(false)
let initialized = false

function persistLocal(value: BackgroundSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

function apply(value: BackgroundSettings) {
  applyBackgroundToDocument(value, getCurrentTheme())
}

async function syncToServer(value: BackgroundSettings) {
  if (!getAuthToken()) return value
  try {
    return await backgroundApi.updateBackground(value)
  } catch {
    return value
  }
}

export async function initBackground() {
  if (initialized) return
  initialized = true

  const cached = localStorage.getItem(STORAGE_KEY)
  if (cached) {
    try {
      settings.value = JSON.parse(cached) as BackgroundSettings
      apply(settings.value)
    } catch {
      /* ignore */
    }
  }

  loading.value = true
  try {
    const remote = await backgroundApi.fetchBackground()
    const cached = settings.value
    if (remote.type !== 'default') {
      settings.value = remote
    } else if (cached.type !== 'default') {
      settings.value = cached
    } else {
      settings.value = remote
    }
    persistLocal(settings.value)
    apply(settings.value)
  } catch {
    /* offline — keep cache */
  } finally {
    loading.value = false
  }
}

export function useBackground() {
  const { theme } = useTheme()

  watch(theme, () => apply(settings.value))

  async function save(next: BackgroundSettings) {
    saving.value = true
    try {
      settings.value = next
      apply(next)
      persistLocal(next)
      const synced = await syncToServer(next)
      settings.value = synced
      persistLocal(synced)
      apply(synced)
    } finally {
      saving.value = false
    }
  }

  async function setType(type: BackgroundType) {
    if (type === 'default') return save({ type: 'default' })
    if (type === 'solid') {
      return save({
        type: 'solid',
        color: settings.value.color || (theme.value === 'dark' ? '#18181b' : '#fafafa'),
      })
    }
    if (type === 'pattern') {
      return save({
        type: 'pattern',
        pattern: settings.value.pattern || 'dots',
        color: settings.value.color || '#71717a',
        opacity: settings.value.opacity ?? 0.15,
        baseColor: settings.value.baseColor,
      })
    }
    if (type === 'image') {
      if (settings.value.imageUrl) {
        return save({
          type: 'image',
          imageUrl: settings.value.imageUrl,
          filename: settings.value.filename,
          fit: settings.value.fit || 'cover',
          overlay: settings.value.overlay ?? 0,
        })
      }
      settings.value = {
        type: 'image',
        fit: settings.value.fit || 'cover',
        overlay: settings.value.overlay ?? 0,
      }
      return
    }
  }

  async function setSolidColor(color: string) {
    await save({ type: 'solid', color })
  }

  async function setPattern(opts: {
    pattern?: BackgroundPattern
    color?: string
    opacity?: number
    baseColor?: string
  }) {
    await save({
      type: 'pattern',
      pattern: opts.pattern ?? settings.value.pattern ?? 'dots',
      color: opts.color ?? settings.value.color ?? '#71717a',
      opacity: opts.opacity ?? settings.value.opacity ?? 0.15,
      baseColor: opts.baseColor ?? settings.value.baseColor,
    })
  }

  async function setImageOptions(opts: { fit?: BackgroundFit; overlay?: number }) {
    if (settings.value.type !== 'image' || !settings.value.imageUrl) return
    await save({
      type: 'image',
      imageUrl: settings.value.imageUrl,
      filename: settings.value.filename,
      fit: opts.fit ?? settings.value.fit ?? 'cover',
      overlay: opts.overlay ?? settings.value.overlay ?? 0,
    })
  }

  async function uploadImage(file: File, fit?: BackgroundFit, overlay?: number) {
    if (!getAuthToken()) throw new Error('Đăng nhập để upload ảnh nền')
    saving.value = true
    try {
      const result = await backgroundApi.uploadBackgroundImage(
        file,
        fit ?? settings.value.fit ?? 'cover',
        overlay ?? settings.value.overlay ?? 0,
      )
      settings.value = result
      apply(result)
      persistLocal(result)
      return result
    } finally {
      saving.value = false
    }
  }

  return {
    settings,
    loading,
    saving,
    save,
    setType,
    setSolidColor,
    setPattern,
    setImageOptions,
    uploadImage,
  }
}
