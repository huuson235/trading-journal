<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '@/composables/useAuth'

const open = defineModel<boolean>('open', { default: false })

const { login } = useAuth()

const formUser = ref('')
const formPass = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function onSubmit() {
  error.value = null
  loading.value = true
  try {
    await login(formUser.value.trim(), formPass.value)
    formPass.value = ''
    open.value = false
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Đăng nhập thất bại'
  } finally {
    loading.value = false
  }
}

function onClose() {
  open.value = false
  error.value = null
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
        <h2 class="mb-1 text-base font-semibold">Đăng nhập</h2>
        <p class="mb-4 text-xs text-zinc-500">Đăng nhập để chỉnh sửa nhật ký giao dịch</p>

        <div class="mb-3">
          <label class="mb-1 block text-xs font-medium text-zinc-500">Username</label>
          <input
            v-model="formUser"
            type="text"
            autocomplete="username"
            class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            required
          />
        </div>

        <div class="mb-4">
          <label class="mb-1 block text-xs font-medium text-zinc-500">Password</label>
          <input
            v-model="formPass"
            type="password"
            autocomplete="current-password"
            class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            required
          />
        </div>

        <p v-if="error" class="mb-3 text-xs text-rose-600 dark:text-rose-400">{{ error }}</p>

        <div class="flex justify-end gap-2">
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            @click="onClose"
          >
            Hủy
          </button>
          <button
            type="submit"
            class="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            :disabled="loading"
          >
            {{ loading ? 'Đang đăng nhập...' : 'Đăng nhập' }}
          </button>
        </div>
      </form>
    </div>
  </Teleport>
</template>
