<script setup lang="ts">
import { computed, ref } from 'vue'

const model = defineModel<string>({ required: true })

const props = defineProps<{
  suggestions: string[]
  inputClass?: string
  placeholder?: string
  readonly?: boolean
}>()

const isOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  const query = model.value.trim().toUpperCase()
  const unique = [...new Set(props.suggestions.map((p) => p.toUpperCase()).filter(Boolean))]
  if (!query) return unique.slice(0, 8)
  return unique.filter((p) => p.includes(query)).slice(0, 8)
})

function selectPair(pair: string) {
  model.value = pair
  isOpen.value = false
  inputRef.value?.blur()
}

function onInput() {
  if (props.readonly) return
  isOpen.value = true
}

function onFocus() {
  if (props.readonly) return
  if (filtered.value.length > 0) isOpen.value = true
}

function onBlur() {
  window.setTimeout(() => {
    isOpen.value = false
  }, 150)
}
</script>

<template>
  <div class="relative">
    <input
      ref="inputRef"
      v-model="model"
      type="text"
      :placeholder="placeholder ?? 'EURUSD'"
      :readonly="readonly"
      :class="[inputClass, readonly ? 'cursor-default opacity-80' : '']"
      autocomplete="off"
      @input="onInput"
      @focus="onFocus"
      @blur="onBlur"
    />

    <ul
      v-if="!readonly && isOpen && filtered.length > 0"
      class="absolute left-0 right-0 top-full z-30 mt-0.5 max-h-32 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
    >
      <li v-for="pair in filtered" :key="pair">
        <button
          type="button"
          class="w-full px-2 py-1 text-left text-[11px] uppercase hover:bg-zinc-100 dark:hover:bg-zinc-700 sm:text-xs"
          @mousedown.prevent="selectPair(pair)"
        >
          {{ pair }}
        </button>
      </li>
    </ul>
  </div>
</template>
