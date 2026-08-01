import { ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
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

const settings = ref<BackgroundSettings>({ ...DEFAULT_BACKGROUND })
const loading = ref(false)
const saving = ref(false)
let activeSlug: string | null = null

function persistLocal(slug: string, value: BackgroundSettings) {
  localStorage.setItem(`background:${slug}`, JSON.stringify(value))
}

function apply(value: BackgroundSettings) {
  applyBackgroundToDocument(value, getCurrentTheme())
}

export async function loadBackgroundForSlug(slug: string) {
  activeSlug = slug
  loading.value = true

  const cached = localStorage.getItem(`background:${slug}`)
  if (cached) {
    try {
      settings.value = JSON.parse(cached) as BackgroundSettings
      apply(settings.value)
    } catch {
      /* ignore */
    }
  } else {
    settings.value = { ...DEFAULT_BACKGROUND }
    apply(settings.value)
  }

  try {
    const remote = await backgroundApi.fetchBackground(slug)
    const local = settings.value
    if (remote.type !== 'default') {
      settings.value = remote
    } else if (local.type !== 'default') {
      settings.value = local
    } else {
      settings.value = remote
    }
    persistLocal(slug, settings.value)
    apply(settings.value)
  } catch {
    /* offline — keep cache */
  } finally {
    loading.value = false
  }
}

export function resetBackgroundToDefault() {
  activeSlug = null
  settings.value = { ...DEFAULT_BACKGROUND }
  apply(settings.value)
}

/** Gọi 1 lần khi boot — áp dụng default trước khi vào journal */
export async function initBackground() {
  apply(settings.value)
}

export function useBackground(slugSource?: MaybeRefOrGetter<string | null | undefined>) {
  const { theme } = useTheme()

  watch(theme, () => apply(settings.value))

  if (slugSource) {
    watch(
      () => toValue(slugSource),
      (slug) => {
        if (slug) void loadBackgroundForSlug(slug)
        else resetBackgroundToDefault()
      },
      { immediate: true },
    )
  }

  async function syncToServer(value: BackgroundSettings) {
    if (!getAuthToken() || !activeSlug) return value
    try {
      return await backgroundApi.updateBackground(activeSlug, value)
    } catch {
      return value
    }
  }

  async function save(next: BackgroundSettings) {
    saving.value = true
    try {
      settings.value = next
      apply(next)
      if (activeSlug) persistLocal(activeSlug, next)
      const synced = await syncToServer(next)
      settings.value = synced
      if (activeSlug) persistLocal(activeSlug, synced)
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
    if (!getAuthToken() || !activeSlug) throw new Error('Đăng nhập để upload ảnh nền')
    saving.value = true
    try {
      const result = await backgroundApi.uploadBackgroundImage(
        activeSlug,
        file,
        fit ?? settings.value.fit ?? 'cover',
        overlay ?? settings.value.overlay ?? 0,
      )
      settings.value = result
      apply(result)
      persistLocal(activeSlug, result)
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
