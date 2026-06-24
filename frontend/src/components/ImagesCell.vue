<script setup lang="ts">
import { computed, ref } from 'vue'
import type { EntryImage } from '@/types/journal'
import ImageLightbox from './ImageLightbox.vue'

const props = defineProps<{
  entryId: number
  images: EntryImage[]
  readonly?: boolean
  uploadHandler?: (entryId: number, file: File) => Promise<void>
  removeImageHandler?: (entryId: number, imageId: number) => Promise<void>
}>()

const isFocused = ref(false)
const uploading = ref(false)
const showLightbox = ref(false)
const lightboxIndex = ref(0)

const imageUrls = computed(() => props.images.map((img) => img.imageUrl))

async function handleFile(file: File) {
  if (!props.uploadHandler) return
  uploading.value = true
  try {
    await props.uploadHandler(props.entryId, file)
  } finally {
    uploading.value = false
  }
}

function onPaste(e: ClipboardEvent) {
  if (props.readonly) return
  const items = e.clipboardData?.items
  if (!items) return

  for (const item of items) {
    if (item.type.startsWith('image/')) {
      e.preventDefault()
      const file = item.getAsFile()
      if (file) handleFile(file)
      return
    }
  }
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
  ;(e.target as HTMLInputElement).value = ''
}

async function removeImage(imageId: number) {
  if (props.removeImageHandler) {
    await props.removeImageHandler(props.entryId, imageId)
  }
}

function openLightbox(index: number) {
  lightboxIndex.value = index
  showLightbox.value = true
}
</script>

<template>
  <div
    class="group/cell flex w-full min-w-0 flex-nowrap items-center gap-1 rounded border border-transparent px-1 py-1 transition-colors"
    :class="
      isFocused
        ? 'border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/60'
        : 'hover:border-zinc-200 hover:bg-zinc-50/80 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/40'
    "
    tabindex="0"
    @focusin="isFocused = true"
    @focusout="isFocused = false"
    @paste="onPaste"
  >
    <div
      v-for="(img, index) in images"
      :key="img.id"
      class="relative shrink-0"
    >
      <button
        type="button"
        class="block h-6 w-6 overflow-hidden rounded border border-zinc-200 dark:border-zinc-600"
        :disabled="uploading"
        title="Xem ảnh"
        @click.stop="openLightbox(index)"
      >
        <img
          :src="img.thumbUrl ?? img.imageUrl"
          alt="Chart"
          class="h-full w-full object-cover"
          loading="lazy"
        />
      </button>
      <button
        v-if="!readonly"
        type="button"
        class="absolute -right-1 -top-1 hidden h-3 w-3 items-center justify-center rounded-full bg-zinc-800 text-[8px] leading-none text-white group-hover/cell:flex dark:bg-zinc-200 dark:text-zinc-900"
        title="Xóa ảnh"
        @click.stop="removeImage(img.id)"
      >
        ×
      </button>
    </div>

    <label
      v-if="!readonly"
      class="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded border border-dashed border-zinc-300 text-[9px] text-zinc-400 hover:border-indigo-400 hover:text-indigo-500 dark:border-zinc-600"
      :class="{ 'opacity-50': uploading, 'opacity-60 group-hover/cell:opacity-100': !uploading && !isFocused, 'opacity-100': isFocused }"
      title="Paste ảnh (Ctrl+V)"
    >
      +
      <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
    </label>

    <span
      v-else-if="readonly && images.length === 0"
      class="text-[10px] text-zinc-300 dark:text-zinc-600"
    >
      —
    </span>

    <ImageLightbox
      v-if="showLightbox && imageUrls.length > 0"
      :sources="imageUrls"
      :start-index="lightboxIndex"
      alt="Chart"
      @close="showLightbox = false"
    />
  </div>
</template>
