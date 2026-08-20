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
    class="rounded-lg border-2 border-dashed px-4 py-5 text-center outline-none transition"
    :class="
      dragging
        ? 'border-[#1976D2] bg-blue-50 dark:bg-blue-950/30'
        : 'border-gray-300 bg-gray-50/80 dark:border-zinc-600 dark:bg-zinc-800/50'
    "
    tabindex="0"
    @dragenter.prevent="dragging = true"
    @dragover.prevent="dragging = true"
    @dragleave.prevent="dragging = false"
    @drop.prevent="onDrop"
    @paste="onPaste"
  >
    <label class="flex cursor-pointer flex-col items-center gap-1">
      <span class="flex h-10 w-10 items-center justify-center text-[#1976D2]">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-8 w-8">
          <path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
        </svg>
      </span>
      <span class="text-sm font-medium text-[#1976D2]">{{ title }}</span>
      <span class="text-xs text-gray-400">{{ subtitle }}</span>
      <input type="file" accept="image/*" multiple class="hidden" @change="onFileChange" />
    </label>

    <div
      v-if="existing.length > 0 || pending.length > 0"
      class="mt-4 flex flex-wrap justify-center gap-2"
    >
      <div
        v-for="(img, index) in existing"
        :key="img.id"
        class="relative"
      >
        <button
          type="button"
          class="block h-16 w-16 overflow-hidden rounded-md border border-gray-200 bg-white dark:border-zinc-600"
          @click="openLightbox(index)"
        >
          <img :src="img.thumbUrl ?? img.imageUrl" alt="Chart" class="h-full w-full object-cover" />
        </button>
        <button
          type="button"
          class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs text-white"
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
          class="block h-16 w-16 overflow-hidden rounded-md border border-blue-200 bg-white"
          @click="openLightbox(existing.length + index)"
        >
          <img :src="url" alt="Preview" class="h-full w-full object-cover" />
        </button>
        <button
          type="button"
          class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-xs text-white"
          title="Bỏ ảnh"
          @click="removePending(index)"
        >
          ×
        </button>
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
