<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  sources: string[]
  startIndex?: number
  alt?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const currentIndex = ref(0)
const loadedSrc = ref<string | null>(null)
const loading = ref(true)
const failed = ref(false)

const currentSrc = computed(() => props.sources[currentIndex.value] ?? null)
const hasMultiple = computed(() => props.sources.length > 1)
const canPrev = computed(() => currentIndex.value > 0)
const canNext = computed(() => currentIndex.value < props.sources.length - 1)

function loadFullImage(src: string) {
  loading.value = true
  failed.value = false
  loadedSrc.value = null

  const img = new Image()
  img.onload = () => {
    loadedSrc.value = src
    loading.value = false
  }
  img.onerror = () => {
    loading.value = false
    failed.value = true
  }
  img.src = src
}

function goPrev() {
  if (!canPrev.value) return
  currentIndex.value--
}

function goNext() {
  if (!canNext.value) return
  currentIndex.value++
}

function onBackdropClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.dataset.lightboxSide === 'prev') {
    goPrev()
    return
  }
  if (target.dataset.lightboxSide === 'next') {
    goNext()
    return
  }
  if (target.dataset.lightboxBackdrop === 'true') {
    emit('close')
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
  else if (e.key === 'ArrowLeft') goPrev()
  else if (e.key === 'ArrowRight') goNext()
}

watch(
  () => props.startIndex,
  (idx) => {
    currentIndex.value = idx ?? 0
  },
  { immediate: true },
)

watch(currentSrc, (src) => {
  if (src) loadFullImage(src)
}, { immediate: true })

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex bg-black/70 backdrop-blur-sm"
      data-lightbox-backdrop="true"
      @click="onBackdropClick"
    >
      <!-- Vùng click trái -->
      <div
        v-if="hasMultiple && canPrev"
        data-lightbox-side="prev"
        class="flex w-[18%] min-w-[48px] max-w-[120px] cursor-w-resize items-center justify-start pl-2 sm:pl-4"
        title="Ảnh trước (←)"
      >
        <span
          data-lightbox-side="prev"
          class="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20"
        >
          <svg data-lightbox-side="prev" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5 sm:h-6 sm:w-6">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </span>
      </div>
      <div v-else class="w-[18%] min-w-[48px] max-w-[120px] shrink-0" />

      <!-- Ảnh giữa -->
      <div class="relative flex min-w-0 flex-1 items-center justify-center px-2 py-4">
        <button
          type="button"
          class="absolute right-2 top-2 z-10 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20 sm:right-0 sm:top-0"
          @click.stop="emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <p
          v-if="hasMultiple"
          class="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-full bg-black/40 px-2.5 py-0.5 text-xs tabular-nums text-white/90"
        >
          {{ currentIndex + 1 }} / {{ sources.length }}
        </p>

        <div v-if="loading" class="text-sm text-white/80">Đang tải ảnh...</div>
        <div v-else-if="failed" class="text-sm text-rose-300">Không tải được ảnh</div>
        <img
          v-else-if="loadedSrc"
          :src="loadedSrc"
          :alt="alt ?? 'Chart'"
          class="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
          @click.stop
        />
      </div>

      <!-- Vùng click phải -->
      <div
        v-if="hasMultiple && canNext"
        data-lightbox-side="next"
        class="flex w-[18%] min-w-[48px] max-w-[120px] cursor-e-resize items-center justify-end pr-2 sm:pr-4"
        title="Ảnh sau (→)"
      >
        <span
          data-lightbox-side="next"
          class="rounded-full bg-white/10 p-2 text-white/80 transition hover:bg-white/20"
        >
          <svg data-lightbox-side="next" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5 sm:h-6 sm:w-6">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>
      </div>
      <div v-else class="w-[18%] min-w-[48px] max-w-[120px] shrink-0" />
    </div>
  </Teleport>
</template>
