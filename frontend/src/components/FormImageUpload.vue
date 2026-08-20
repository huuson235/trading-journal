<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import type { EntryImage } from '@/types/journal'
import ImageLightbox from './ImageLightbox.vue'

const pending = defineModel<File[]>('pending', { required: true })

const props = defineProps<{
  existing: EntryImage[]
  title: string
  subtitle: string
}>()

const emit = defineEmits<{
  removeExisting: [id: number]
}>()

const dragging = ref(false)
const previewUrls = ref<string[]>([])
const showLightbox = ref(false)
const lightboxIndex = ref(0)
const clipboardStatus = ref<'idle' | 'ok' | 'empty' | 'denied'>('idle')
let clipboardTimer: ReturnType<typeof setTimeout> | null = null

watch(
  pending,
  (files) => {
    previewUrls.value.forEach((url) => URL.revokeObjectURL(url))
    previewUrls.value = files.map((file) => URL.createObjectURL(file))
  },
  { immediate: true },
)

onUnmounted(() => {
  previewUrls.value.forEach((url) => URL.revokeObjectURL(url))
  if (clipboardTimer) clearTimeout(clipboardTimer)
})

const lightboxSources = computed(() => [
  ...props.existing.map((img) => img.imageUrl),
  ...previewUrls.value,
])

function addFiles(list: FileList | File[] | null | undefined) {
  if (!list) return
  const images = [...list].filter((file) => file.type.startsWith('image/'))
  if (images.length === 0) return
  pending.value = [...pending.value, ...images]
}

function onDrop(e: DragEvent) {
  dragging.value = false
  addFiles(e.dataTransfer?.files)
}

function onFileChange(e: Event) {
  addFiles((e.target as HTMLInputElement).files)
  ;(e.target as HTMLInputElement).value = ''
}

function setClipboardStatus(status: 'idle' | 'ok' | 'empty' | 'denied') {
  clipboardStatus.value = status
  if (clipboardTimer) clearTimeout(clipboardTimer)
  if (status !== 'idle') {
    clipboardTimer = setTimeout(() => {
      clipboardStatus.value = 'idle'
    }, 2500)
  }
}

async function pasteFromClipboard() {
  if (!navigator.clipboard?.read) {
    setClipboardStatus('denied')
    return
  }

  try {
    const items = await navigator.clipboard.read()
    const files: File[] = []
    for (const item of items) {
      const imageType = item.types.find((type) => type.startsWith('image/'))
      if (!imageType) continue
      const blob = await item.getType(imageType)
      const ext = imageType.split('/')[1]?.split('+')[0] || 'png'
      files.push(new File([blob], `clipboard-${Date.now()}-${files.length}.${ext}`, { type: blob.type || imageType }))
    }
    if (files.length === 0) {
      setClipboardStatus('empty')
      return
    }
    addFiles(files)
    setClipboardStatus('ok')
  } catch {
    setClipboardStatus('denied')
  }
}

function onPaste(e: ClipboardEvent) {
  const files: File[] = []
  for (const item of e.clipboardData?.items ?? []) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  if (files.length > 0) {
    e.preventDefault()
    addFiles(files)
    setClipboardStatus('ok')
  }
}

function removePending(index: number) {
  pending.value = pending.value.filter((_, i) => i !== index)
}

function openLightbox(index: number) {
  lightboxIndex.value = index
  showLightbox.value = true
}
</script>

<template>
  <div
    class="rounded-md border border-dashed px-2 py-1.5 outline-none transition"
    :class="
      dragging
        ? 'border-[#1976D2] bg-blue-50 dark:bg-blue-950/30'
        : 'border-gray-300 bg-gray-50/80 dark:border-zinc-600 dark:bg-zinc-800/50'
    "
    tabindex="0"
    :title="subtitle"
    @dragenter.prevent="dragging = true"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
    @paste="onPaste"
  >
    <div class="flex flex-wrap items-center gap-1.5">
      <label
        class="inline-flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-[#1976D2] hover:bg-blue-50 dark:hover:bg-blue-950/40"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
        </svg>
        {{ title }}
        <input type="file" accept="image/*" multiple class="hidden" @change="onFileChange" />
      </label>

      <button
        type="button"
        class="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-[#1976D2] hover:bg-blue-50 dark:hover:bg-blue-950/40"
        title="Dán ảnh đang copy trong clipboard"
        @click="pasteFromClipboard"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
        Clipboard
      </button>

      <span v-if="clipboardStatus === 'ok'" class="text-[10px] text-emerald-600 dark:text-emerald-400">Đã dán</span>
      <span v-else-if="clipboardStatus === 'empty'" class="text-[10px] text-amber-600 dark:text-amber-400">Không có ảnh</span>
      <span v-else-if="clipboardStatus === 'denied'" class="text-[10px] text-rose-600 dark:text-rose-400">Ctrl+V tại đây</span>

      <div
        v-if="existing.length > 0 || pending.length > 0"
        class="ml-auto flex flex-wrap items-center gap-1.5"
      >
        <div
          v-for="(img, index) in existing"
          :key="img.id"
          class="relative"
        >
          <button
            type="button"
            class="block h-9 w-9 overflow-hidden rounded border border-gray-200 bg-white dark:border-zinc-600"
            @click="openLightbox(index)"
          >
            <img :src="img.thumbUrl ?? img.imageUrl" alt="Chart" class="h-full w-full object-cover" />
          </button>
          <button
            type="button"
            class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[9px] leading-none text-white"
            title="Xóa ảnh"
            @click="emit('removeExisting', img.id)"
          >
            ×
          </button>
        </div>
        <div
          v-for="(url, index) in previewUrls"
          :key="url"
          class="relative"
        >
          <button
            type="button"
            class="block h-9 w-9 overflow-hidden rounded border border-blue-200 bg-white"
            @click="openLightbox(existing.length + index)"
          >
            <img :src="url" alt="Preview" class="h-full w-full object-cover" />
          </button>
          <button
            type="button"
            class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-600 text-[9px] leading-none text-white"
            title="Bỏ ảnh"
            @click="removePending(index)"
          >
            ×
          </button>
        </div>
      </div>
    </div>

    <ImageLightbox
      v-if="showLightbox && lightboxSources.length > 0"
      :sources="lightboxSources"
      :start-index="lightboxIndex"
      alt="Chart"
      @close="showLightbox = false"
    />
  </div>
</template>
