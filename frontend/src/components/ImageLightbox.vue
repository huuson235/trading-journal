<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps<{
  src: string
  alt?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const loadedSrc = ref<string | null>(null)
const loading = ref(true)
const failed = ref(false)

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

watch(
  () => props.src,
  (src) => {
    if (src) loadFullImage(src)
  },
  { immediate: true },
)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('close')
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      @click.self="emit('close')"
    >
      <button
        type="button"
        class="absolute right-4 top-4 rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
        @click="emit('close')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <div v-if="loading" class="text-sm text-white/80">Đang tải ảnh gốc...</div>
      <div v-else-if="failed" class="text-sm text-rose-300">Không tải được ảnh gốc</div>
      <img
        v-else-if="loadedSrc"
        :src="loadedSrc"
        :alt="alt ?? 'Chart'"
        class="max-h-[90vh] max-w-full rounded-lg object-contain shadow-2xl"
      />
    </div>
  </Teleport>
</template>
