<script setup lang="ts">
import { ref, watch } from 'vue'
import { displayToIso, isoToDisplay } from '@/utils/date'

const model = defineModel<string>({ required: true })

defineProps<{
  inputClass?: string
  placeholder?: string
  readonly?: boolean
}>()

const display = ref(isoToDisplay(model.value))
const invalid = ref(false)
const pickerRef = ref<HTMLInputElement | null>(null)

watch(
  () => model.value,
  (iso) => {
    const next = isoToDisplay(iso)
    if (next !== display.value) display.value = next
  },
)

function onInput() {
  invalid.value = false
}

function onBlur() {
  if (!display.value.trim()) {
    invalid.value = true
    return
  }
  const iso = displayToIso(display.value)
  if (!iso) {
    invalid.value = true
    display.value = isoToDisplay(model.value)
    return
  }
  invalid.value = false
  model.value = iso
  display.value = isoToDisplay(iso)
}

function onPickerChange(e: Event) {
  const iso = (e.target as HTMLInputElement).value
  if (!iso) return
  invalid.value = false
  model.value = iso
  display.value = isoToDisplay(iso)
}

function openPicker() {
  const picker = pickerRef.value
  if (!picker) return
  if (typeof picker.showPicker === 'function') {
    picker.showPicker()
  } else {
    picker.click()
  }
}
</script>

<template>
  <div class="relative flex min-w-0 items-center gap-0.5">
    <input
      v-model="display"
      type="text"
      inputmode="numeric"
      :placeholder="placeholder ?? 'DD/MM/YYYY'"
      :readonly="readonly"
      :class="[inputClass, 'min-w-0 flex-1 pr-0.5', invalid ? 'text-rose-500' : '', readonly ? 'cursor-default opacity-80' : '']"
      @input="onInput"
      @blur="onBlur"
    />
    <button
      v-if="!readonly"
      type="button"
      class="shrink-0 rounded p-0.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
      title="Chọn ngày"
      @click="openPicker"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    </button>
    <input
      ref="pickerRef"
      type="date"
      :value="model"
      class="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
      tabindex="-1"
      @change="onPickerChange"
    />
  </div>
</template>
