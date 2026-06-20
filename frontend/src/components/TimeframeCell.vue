<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TimeframeNote } from '@/types/journal'
import type { TimeframeSlot } from '@/api/journal'
import ImageLightbox from './ImageLightbox.vue'

const model = defineModel<TimeframeNote>({ required: true })

const props = defineProps<{
  entryId: number
  timeframe: TimeframeSlot
  imagesExpanded?: boolean
  uploadHandler?: (entryId: number, slot: TimeframeSlot, file: File) => Promise<void>
  removeImageHandler?: (entryId: number, slot: TimeframeSlot) => Promise<void>
  readonly?: boolean
}>()

const isFocused = ref(false)
const showLightbox = ref(false)
const uploading = ref(false)

const inputClass =
  'min-w-0 flex-1 border-0 bg-transparent p-0 text-[11px] leading-none text-zinc-700 placeholder:text-zinc-400 focus:outline-none focus:ring-0 dark:text-zinc-300 dark:placeholder:text-zinc-500'

const hasImage = computed(() => Boolean(previewUrl.value))

const previewUrl = computed(
  () => model.value.thumbUrl ?? model.value.imageUrl,
)

const fullImageUrl = computed(() => {
  const url = model.value.imageUrl
  if (!url || url.startsWith('blob:')) return url
  return url
})

function revokeBlob(url: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url)
}

async function handleFile(file: File) {
  if (!props.uploadHandler) return
  uploading.value = true
  const blob = URL.createObjectURL(file)
  try {
    revokeBlob(model.value.imageUrl)
    revokeBlob(model.value.thumbUrl)
    model.value.imageUrl = blob
    model.value.thumbUrl = blob
    await props.uploadHandler(props.entryId, props.timeframe, file)
  } catch {
    revokeBlob(model.value.imageUrl)
    revokeBlob(model.value.thumbUrl)
    model.value.imageUrl = null
    model.value.thumbUrl = null
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
}

async function removeImage() {
  revokeBlob(model.value.imageUrl)
  revokeBlob(model.value.thumbUrl)
  model.value.imageUrl = null
  model.value.thumbUrl = null
  if (props.removeImageHandler) {
    await props.removeImageHandler(props.entryId, props.timeframe)
  }
}
</script>

<template>
  <div
    class="group/cell rounded border border-transparent transition-colors"
    :class="[
      imagesExpanded ? 'flex min-w-0 flex-col gap-1 px-1 py-1' : 'flex min-w-0 items-center gap-1 px-1 py-0.5',
      isFocused
        ? 'border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900/60'
        : 'hover:border-zinc-200 hover:bg-zinc-50/80 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/40',
    ]"
    tabindex="0"
    @focusin="isFocused = true"
    @focusout="isFocused = false"
    @paste="onPaste"
  >
    <template v-if="imagesExpanded">
      <div v-if="hasImage" class="relative w-full">
        <button
          type="button"
          class="flex w-full items-center justify-center overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800/80"
          :disabled="uploading"
          title="Xem ảnh gốc"
          @click.stop="showLightbox = true"
        >
          <img
            :src="previewUrl!"
            alt="Chart"
            class="max-h-32 w-full object-contain"
            :class="{ 'opacity-50': uploading }"
            loading="lazy"
          />
        </button>
        <button
          v-if="!readonly"
          type="button"
          class="absolute right-0.5 top-0.5 hidden h-4 w-4 items-center justify-center rounded-full bg-zinc-800 text-[9px] text-white group-hover/cell:flex dark:bg-zinc-200 dark:text-zinc-900"
          title="Xóa ảnh"
          @click.stop="removeImage"
        >
          ×
        </button>
      </div>

      <label
        v-else-if="!readonly"
        class="flex h-8 w-full cursor-pointer items-center justify-center rounded border border-dashed border-zinc-300 text-[10px] text-zinc-400 hover:border-indigo-400 hover:text-indigo-500 dark:border-zinc-600"
        title="Upload hoặc Ctrl+V"
      >
        + Paste / Upload
        <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
      </label>

      <input
        v-model="model.text"
        type="text"
        placeholder="..."
        :readonly="readonly"
        :class="[inputClass, readonly ? 'cursor-default opacity-80' : '']"
        @paste="onPaste"
      />
    </template>

    <template v-else>
      <div v-if="hasImage" class="relative shrink-0">
        <button
          type="button"
          class="block h-5 w-5 overflow-hidden rounded border border-zinc-200 dark:border-zinc-600"
          :disabled="uploading"
          title="Xem ảnh gốc"
          @click.stop="showLightbox = true"
        >
          <img
            :src="previewUrl!"
            alt="Chart"
            class="h-full w-full object-cover"
            :class="{ 'opacity-50': uploading }"
            loading="lazy"
          />
        </button>
        <button
          v-if="!readonly"
          type="button"
          class="absolute -right-1 -top-1 hidden h-3 w-3 items-center justify-center rounded-full bg-zinc-800 text-[8px] leading-none text-white group-hover/cell:flex dark:bg-zinc-200 dark:text-zinc-900"
          title="Xóa ảnh"
          @click.stop="removeImage"
        >
          ×
        </button>
      </div>

      <label
        v-else-if="!readonly"
        class="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded border border-dashed border-zinc-300 text-[9px] text-zinc-400 hover:border-indigo-400 hover:text-indigo-500 dark:border-zinc-600"
        :class="{ 'opacity-100': isFocused, 'opacity-60 group-hover/cell:opacity-100': !isFocused }"
        title="Upload hoặc Ctrl+V"
      >
        +
        <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
      </label>

      <span
        v-else-if="readonly && !hasImage"
        class="flex h-5 w-5 shrink-0 items-center justify-center text-[9px] text-zinc-300 dark:text-zinc-600"
      >
        —
      </span>

      <input
        v-model="model.text"
        type="text"
        placeholder="..."
        :readonly="readonly"
        :class="[inputClass, readonly ? 'cursor-default opacity-80' : '']"
        @paste="onPaste"
      />
    </template>

    <ImageLightbox
      v-if="showLightbox && fullImageUrl"
      :src="fullImageUrl"
      @close="showLightbox = false"
    />
  </div>
</template>
