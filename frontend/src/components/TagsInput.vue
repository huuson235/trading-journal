<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getTagClass } from '@/utils/tagStyles'

const model = defineModel<string[]>({ required: true })

const props = defineProps<{
  suggestions: string[]
  readonly?: boolean
}>()

const draft = ref('')
const isOpen = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)
const editIndex = ref<number | null>(null)
const editDraft = ref('')
const editInputRef = ref<HTMLInputElement | null>(null)
const dragFrom = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)
const dropdownStyle = ref<Record<string, string>>({})

function updateDropdownPosition() {
  const el = inputRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  dropdownStyle.value = {
    top: `${rect.bottom + 2}px`,
    left: `${rect.left}px`,
    minWidth: `${Math.max(rect.width, 128)}px`,
  }
}

function openDropdown() {
  if (props.readonly) return
  isOpen.value = true
  nextTick(updateDropdownPosition)
}

watch(isOpen, (open) => {
  if (open) nextTick(updateDropdownPosition)
})

function onScrollOrResize() {
  if (isOpen.value) updateDropdownPosition()
}

onMounted(() => {
  window.addEventListener('scroll', onScrollOrResize, true)
  window.addEventListener('resize', onScrollOrResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScrollOrResize, true)
  window.removeEventListener('resize', onScrollOrResize)
})

function normalizeTag(raw: string) {
  return raw.trim().toUpperCase()
}

const filtered = computed(() => {
  const query = normalizeTag(draft.value)
  const existing = new Set(model.value)
  const pool = [
    ...new Set([
      ...props.suggestions.map(normalizeTag),
      ...model.value.map(normalizeTag),
    ].filter(Boolean)),
  ].filter((t) => !existing.has(t))
  if (!query) return pool.slice(0, 10)
  return pool.filter((t) => t.includes(query)).slice(0, 10)
})

function addTag(raw: string) {
  const tag = normalizeTag(raw)
  if (!tag || model.value.includes(tag)) {
    draft.value = ''
    isOpen.value = false
    return
  }
  model.value = [...model.value, tag]
  draft.value = ''
  isOpen.value = false
}

function removeTag(index: number) {
  model.value = model.value.filter((_, i) => i !== index)
}

function onDraftKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault()
    if (draft.value.trim()) {
      addTag(draft.value)
    } else if (filtered.value.length === 1) {
      addTag(filtered.value[0]!)
    }
  } else if (e.key === 'Backspace' && !draft.value && model.value.length > 0) {
    removeTag(model.value.length - 1)
  } else if (e.key === 'Tab' && isOpen.value && filtered.value.length > 0) {
    e.preventDefault()
    addTag(filtered.value[0]!)
  }
}

function selectSuggestion(tag: string) {
  addTag(tag)
  inputRef.value?.focus()
}

function startEdit(index: number) {
  if (props.readonly) return
  editIndex.value = index
  editDraft.value = model.value[index]!
  nextTick(() => editInputRef.value?.focus())
}

function commitEdit() {
  if (editIndex.value === null) return
  const idx = editIndex.value
  const tag = normalizeTag(editDraft.value)
  if (!tag) {
    removeTag(idx)
  } else {
    const next = [...model.value]
    next[idx] = tag
    const seen = new Set<string>()
    model.value = next.filter((t) => {
      if (seen.has(t)) return false
      seen.add(t)
      return true
    })
  }
  editIndex.value = null
  editDraft.value = ''
}

function cancelEdit() {
  editIndex.value = null
  editDraft.value = ''
}

function onDragStart(index: number, e: DragEvent) {
  if (props.readonly || editIndex.value !== null) return
  dragFrom.value = index
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', String(index))
}

function onDragOver(index: number, e: DragEvent) {
  if (props.readonly || dragFrom.value === null) return
  e.preventDefault()
  dragOverIndex.value = index
}

function onDrop(index: number, e: DragEvent) {
  e.preventDefault()
  if (dragFrom.value === null || dragFrom.value === index) {
    dragFrom.value = null
    dragOverIndex.value = null
    return
  }
  const next = [...model.value]
  const [moved] = next.splice(dragFrom.value, 1)
  next.splice(index, 0, moved!)
  model.value = next
  dragFrom.value = null
  dragOverIndex.value = null
}

function onDragEnd() {
  dragFrom.value = null
  dragOverIndex.value = null
}

function onInputFocus() {
  openDropdown()
}

function onInputBlur() {
  window.setTimeout(() => {
    isOpen.value = false
    if (draft.value.trim()) addTag(draft.value)
  }, 150)
}

function onInput() {
  openDropdown()
}
</script>

<template>
  <div
    class="flex min-h-[1.75rem] flex-wrap items-center gap-0.5 rounded border border-transparent px-0.5 py-0.5 focus-within:border-zinc-200 dark:focus-within:border-zinc-700"
    :class="{ 'cursor-default': readonly }"
  >
    <template v-for="(tag, index) in model" :key="`${tag}-${index}`">
      <span
        v-if="editIndex !== index"
        :draggable="!readonly"
        class="group inline-flex max-w-full items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium uppercase tracking-wide sm:text-[11px]"
        :class="[
          getTagClass(tag),
          !readonly ? 'cursor-grab active:cursor-grabbing' : '',
          dragOverIndex === index && dragFrom !== null && dragFrom !== index
            ? 'ring-1 ring-indigo-400'
            : '',
          dragFrom === index ? 'opacity-50' : '',
        ]"
        @dragstart="onDragStart(index, $event)"
        @dragover="onDragOver(index, $event)"
        @drop="onDrop(index, $event)"
        @dragend="onDragEnd"
        @dblclick="startEdit(index)"
      >
        <span class="truncate">{{ tag }}</span>
        <button
          v-if="!readonly"
          type="button"
          class="ml-0.5 rounded px-0.5 opacity-60 hover:opacity-100"
          :class="getTagClass(tag).includes('text-white') ? 'text-white' : 'text-zinc-500 dark:text-zinc-300'"
          tabindex="-1"
          @mousedown.prevent="removeTag(index)"
        >
          ×
        </button>
      </span>
      <input
        v-else
        ref="editInputRef"
        v-model="editDraft"
        type="text"
        class="w-16 min-w-[3rem] rounded border border-indigo-400 bg-white px-1 py-0.5 text-[10px] uppercase sm:text-[11px] dark:bg-zinc-800"
        @keydown.enter.prevent="commitEdit"
        @keydown.escape.prevent="cancelEdit"
        @blur="commitEdit"
      />
    </template>

    <div v-if="!readonly" class="relative min-w-[2.5rem] flex-1">
      <input
        ref="inputRef"
        v-model="draft"
        type="text"
        placeholder="Tag..."
        class="w-full min-w-[3rem] border-0 bg-transparent py-0.5 text-[10px] uppercase placeholder:normal-case placeholder:text-zinc-400 focus:outline-none sm:text-[11px]"
        autocomplete="off"
        @input="onInput"
        @focus="onInputFocus"
        @blur="onInputBlur"
        @keydown="onDraftKeydown"
      />
      <Teleport to="body">
        <ul
          v-if="isOpen && filtered.length > 0"
          class="fixed z-[200] max-h-48 overflow-y-auto rounded-md border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-800"
          :style="dropdownStyle"
        >
          <li v-for="tag in filtered" :key="tag">
            <button
              type="button"
              class="flex w-full items-center px-2 py-1 hover:bg-zinc-100 dark:hover:bg-zinc-700"
              @mousedown.prevent="selectSuggestion(tag)"
            >
              <span
                class="rounded px-1.5 py-0.5 text-[11px] font-medium uppercase sm:text-xs"
                :class="getTagClass(tag)"
              >
                {{ tag }}
              </span>
            </button>
          </li>
        </ul>
      </Teleport>
    </div>
  </div>
</template>
