<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import LoginModal from '@/components/LoginModal.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { fetchPublicAccounts, type PublicAccount } from '@/api/auth'
import { useAuth } from '@/composables/useAuth'
import { resetBackgroundToDefault } from '@/composables/useBackground'

const router = useRouter()
const { isAuthenticated, isRoot, username, slug, logout } = useAuth()
const showLogin = ref(false)
const accounts = ref<PublicAccount[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

resetBackgroundToDefault()

onMounted(async () => {
  if (isRoot.value) {
    router.replace({ name: 'admin' })
    return
  }
  if (isAuthenticated.value && slug.value) {
    router.replace({ name: 'journal', params: { slug: slug.value } })
    return
  }

  try {
    accounts.value = await fetchPublicAccounts()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không tải được danh sách journal'
  } finally {
    loading.value = false
  }
})

async function onLogout() {
  await logout()
}
</script>

<template>
  <div class="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <header class="border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div class="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <h1 class="text-base font-semibold tracking-tight">Trading Journal</h1>
        <div class="flex items-center gap-2">
          <template v-if="isAuthenticated">
            <span class="text-xs text-zinc-500">{{ username }}</span>
            <button
              type="button"
              class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              @click="onLogout"
            >
              Đăng xuất
            </button>
          </template>
          <button
            v-else
            type="button"
            class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
            @click="showLogin = true"
          >
            Đăng nhập
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div class="mb-8">
        <h2 class="text-2xl font-semibold tracking-tight">Chọn journal</h2>
        <p class="mt-1 text-sm text-zinc-500">
          Mỗi tài khoản có nhật ký riêng. Đăng nhập để chỉnh sửa journal của bạn.
        </p>
      </div>

      <div v-if="loading" class="py-12 text-center text-sm text-zinc-400">Đang tải...</div>
      <div
        v-else-if="error"
        class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
      >
        {{ error }}
      </div>
      <div
        v-else-if="accounts.length === 0"
        class="rounded-xl border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700"
      >
        <p class="text-sm text-zinc-500">Chưa có account nào.</p>
        <p class="mt-1 text-xs text-zinc-400">Đăng nhập root để tạo account trên trang quản lý.</p>
        <button
          type="button"
          class="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          @click="showLogin = true"
        >
          Đăng nhập
        </button>
      </div>
      <ul v-else class="space-y-2">
        <li v-for="account in accounts" :key="account.slug">
          <RouterLink
            :to="{ name: 'journal', params: { slug: account.slug } }"
            class="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-4 py-3 transition hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30"
          >
            <div>
              <div class="text-sm font-medium">{{ account.username }}</div>
              <div class="text-xs text-zinc-400">/u/{{ account.slug }}</div>
            </div>
            <span class="text-xs text-indigo-600 dark:text-indigo-400">Xem →</span>
          </RouterLink>
        </li>
      </ul>
    </main>

    <LoginModal v-model:open="showLogin" />
  </div>
</template>
