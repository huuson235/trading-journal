<script setup lang="ts">
import { ref, watch } from 'vue'
import { changePassword } from '@/api/auth'

const open = defineModel<boolean>('open', { default: false })

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const error = ref<string | null>(null)
const success = ref(false)
const loading = ref(false)

watch(open, (value) => {
  if (!value) return
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
  error.value = null
  success.value = false
})

async function onSubmit() {
  error.value = null
  success.value = false

  if (newPassword.value.length < 4) {
    error.value = 'Password mới phải có ít nhất 4 ký tự'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Xác nhận password không khớp'
    return
  }

  loading.value = true
  try {
    await changePassword(currentPassword.value, newPassword.value)
    success.value = true
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không đổi được password'
  } finally {
    loading.value = false
  }
}

function onClose() {
  open.value = false
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      @click.self="onClose"
    >
      <form
        class="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        @submit.prevent="onSubmit"
      >
        <h2 class="mb-1 text-base font-semibold">Đổi password</h2>
        <p class="mb-4 text-xs text-zinc-500">Nhập password hiện tại và password mới.</p>

        <div class="mb-3">
          <label class="mb-1 block text-xs font-medium text-zinc-500">Password hiện tại</label>
          <input
            v-model="currentPassword"
            type="password"
            autocomplete="current-password"
            required
            class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div class="mb-3">
          <label class="mb-1 block text-xs font-medium text-zinc-500">Password mới</label>
          <input
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            required
            minlength="4"
            class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <div class="mb-4">
          <label class="mb-1 block text-xs font-medium text-zinc-500">Xác nhận password mới</label>
          <input
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            required
            minlength="4"
            class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
          />
        </div>

        <p v-if="error" class="mb-3 text-xs text-rose-600 dark:text-rose-400">{{ error }}</p>
        <p v-if="success" class="mb-3 text-xs text-emerald-600 dark:text-emerald-400">
          Đã đổi password thành công.
        </p>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            @click="onClose"
          >
            {{ success ? 'Đóng' : 'Hủy' }}
          </button>
          <button
            type="submit"
            class="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            :disabled="loading || success"
          >
            {{ loading ? 'Đang lưu...' : 'Đổi password' }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
