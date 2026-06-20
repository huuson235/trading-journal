<script setup lang="ts">
import { useBackground } from '@/composables/useBackground'
import { useAuth } from '@/composables/useAuth'
import {
  FIT_OPTIONS,
  PATTERN_OPTIONS,
  SOLID_PRESETS,
  type BackgroundType,
} from '@/types/background'

const open = defineModel<boolean>('open', { default: false })

const { isAuthenticated } = useAuth()
const { settings, saving, setType, setSolidColor, setPattern, setImageOptions, uploadImage } =
  useBackground()

const types: { id: BackgroundType; label: string }[] = [
  { id: 'default', label: 'Mặc định' },
  { id: 'solid', label: 'Màu' },
  { id: 'pattern', label: 'Pattern' },
  { id: 'image', label: 'Ảnh' },
]

let uploadInput: HTMLInputElement | null = null

function setUploadRef(el: unknown) {
  uploadInput = el as HTMLInputElement | null
}

function onClose() {
  open.value = false
}

async function onTypeChange(type: BackgroundType) {
  await setType(type)
}

async function onImagePick(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    await uploadImage(file, settings.value.fit, settings.value.overlay)
  } catch (err) {
    alert(err instanceof Error ? err.message : 'Không upload được ảnh')
  }
  input.value = ''
}

function triggerUpload() {
  uploadInput?.click()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      @click.self="onClose"
    >
      <div
        class="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
      >
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold">Nền trang</h2>
            <p class="mt-0.5 text-xs text-zinc-500">Tùy chỉnh và lưu cho lần sau</p>
          </div>
          <button
            type="button"
            class="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800"
            @click="onClose"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="mb-4 flex flex-wrap gap-1.5">
          <button
            v-for="t in types"
            :key="t.id"
            type="button"
            class="rounded-lg px-3 py-1.5 text-xs font-medium transition"
            :class="
              settings.type === t.id
                ? 'bg-indigo-600 text-white'
                : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
            "
            :disabled="saving"
            @click="onTypeChange(t.id)"
          >
            {{ t.label }}
          </button>
        </div>

        <div v-if="settings.type === 'solid'" class="space-y-3">
          <label class="block text-xs font-medium text-zinc-500">Màu nền</label>
          <div class="flex items-center gap-3">
            <input
              type="color"
              :value="settings.color || '#fafafa'"
              class="h-10 w-14 cursor-pointer rounded-lg border border-zinc-200 bg-transparent dark:border-zinc-700"
              :disabled="saving"
              @input="setSolidColor(($event.target as HTMLInputElement).value)"
            />
            <span class="font-mono text-xs text-zinc-500">{{ settings.color || '#fafafa' }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="color in SOLID_PRESETS"
              :key="color"
              type="button"
              class="h-7 w-7 rounded-full border border-zinc-200 transition hover:scale-110 dark:border-zinc-600"
              :style="{ backgroundColor: color }"
              :title="color"
              :disabled="saving"
              @click="setSolidColor(color)"
            />
          </div>
        </div>

        <div v-else-if="settings.type === 'pattern'" class="space-y-4">
          <div>
            <label class="mb-1.5 block text-xs font-medium text-zinc-500">Kiểu pattern</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="p in PATTERN_OPTIONS"
                :key="p.id"
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs transition"
                :class="
                  settings.pattern === p.id
                    ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                    : 'border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'
                "
                :disabled="saving"
                @click="setPattern({ pattern: p.id })"
              >
                {{ p.label }}
              </button>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium text-zinc-500">Màu pattern</label>
            <div class="flex items-center gap-3">
              <input
                type="color"
                :value="settings.color || '#71717a'"
                class="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700"
                :disabled="saving"
                @input="setPattern({ color: ($event.target as HTMLInputElement).value })"
              />
              <input
                type="range"
                min="0.05"
                max="0.5"
                step="0.05"
                :value="settings.opacity ?? 0.15"
                class="flex-1"
                :disabled="saving"
                @input="setPattern({ opacity: Number(($event.target as HTMLInputElement).value) })"
              />
              <span class="w-8 text-right text-xs tabular-nums text-zinc-500">
                {{ Math.round((settings.opacity ?? 0.15) * 100) }}%
              </span>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-xs font-medium text-zinc-500">Màu nền (tùy chọn)</label>
            <input
              type="color"
              :value="settings.baseColor || (settings.type === 'pattern' ? '#fafafa' : '#fafafa')"
              class="h-9 w-12 cursor-pointer rounded-lg border border-zinc-200 dark:border-zinc-700"
              :disabled="saving"
              @input="setPattern({ baseColor: ($event.target as HTMLInputElement).value })"
            />
          </div>
        </div>

        <div v-else-if="settings.type === 'image'" class="space-y-4">
          <div
            v-if="settings.imageUrl"
            class="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700"
          >
            <img :src="settings.imageUrl" alt="Nền" class="h-32 w-full object-cover" />
          </div>

          <input
            :ref="setUploadRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="onImagePick"
          />

          <button
            v-if="isAuthenticated"
            type="button"
            class="w-full rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-xs text-zinc-600 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-zinc-600 dark:text-zinc-300"
            :disabled="saving"
            @click="triggerUpload"
          >
            {{ settings.imageUrl ? 'Đổi ảnh nền' : 'Chọn ảnh từ máy' }}
          </button>
          <p v-else class="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-800">
            Đăng nhập để upload ảnh nền (lưu trên server)
          </p>

          <div v-if="settings.imageUrl">
            <label class="mb-1.5 block text-xs font-medium text-zinc-500">Cách hiển thị</label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="f in FIT_OPTIONS"
                :key="f.id"
                type="button"
                class="rounded-lg px-3 py-1.5 text-xs transition"
                :class="
                  (settings.fit || 'cover') === f.id
                    ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                    : 'border border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300'
                "
                :disabled="saving"
                @click="setImageOptions({ fit: f.id })"
              >
                {{ f.label }}
              </button>
            </div>
          </div>

          <div v-if="settings.imageUrl">
            <label class="mb-1.5 block text-xs font-medium text-zinc-500">
              Lớp phủ {{ Math.round((settings.overlay ?? 0) * 100) }}%
            </label>
            <input
              type="range"
              min="0"
              max="0.7"
              step="0.05"
              :value="settings.overlay ?? 0"
              class="w-full"
              :disabled="saving"
              @input="setImageOptions({ overlay: Number(($event.target as HTMLInputElement).value) })"
            />
          </div>
        </div>

        <p v-else class="text-xs text-zinc-500">
          Dùng nền mặc định theo theme sáng/tối.
        </p>

        <p v-if="saving" class="mt-4 text-center text-xs text-zinc-400">Đang lưu...</p>
      </div>
    </div>
  </Teleport>
</template>
