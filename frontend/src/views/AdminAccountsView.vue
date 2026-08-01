<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ThemeToggle from '@/components/ThemeToggle.vue'
import * as adminApi from '@/api/admin'
import type { Account } from '@/api/admin'
import { useAuth } from '@/composables/useAuth'
import { resetBackgroundToDefault } from '@/composables/useBackground'

const router = useRouter()
const { isRoot, username, logout } = useAuth()

resetBackgroundToDefault()

const accounts = ref<Account[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const formError = ref<string | null>(null)
const saving = ref(false)

const newUsername = ref('')
const newPassword = ref('')
const newSlug = ref('')

const editId = ref<number | null>(null)
const editUsername = ref('')
const editPassword = ref('')

onMounted(async () => {
  if (!isRoot.value) {
    router.replace({ name: 'home' })
    return
  }
  await load()
})

async function load() {
  loading.value = true
  error.value = null
  try {
    accounts.value = await adminApi.fetchAccounts()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không tải được accounts'
  } finally {
    loading.value = false
  }
}

async function onCreate() {
  formError.value = null
  saving.value = true
  try {
    await adminApi.createAccount({
      username: newUsername.value.trim(),
      password: newPassword.value,
      slug: newSlug.value.trim() || undefined,
    })
    newUsername.value = ''
    newPassword.value = ''
    newSlug.value = ''
    await load()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Không tạo được account'
  } finally {
    saving.value = false
  }
}

function startEdit(account: Account) {
  editId.value = account.id
  editUsername.value = account.username
  editPassword.value = ''
}

function cancelEdit() {
  editId.value = null
  editUsername.value = ''
  editPassword.value = ''
}

async function saveEdit(id: number) {
  formError.value = null
  saving.value = true
  try {
    await adminApi.updateAccount(id, {
      username: editUsername.value.trim(),
      password: editPassword.value || undefined,
    })
    cancelEdit()
    await load()
  } catch (e) {
    formError.value = e instanceof Error ? e.message : 'Không cập nhật được'
  } finally {
    saving.value = false
  }
}

async function toggleActive(account: Account) {
  try {
    await adminApi.updateAccount(account.id, { active: !account.active })
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không cập nhật được'
  }
}

async function onDelete(account: Account) {
  if (
    !window.confirm(
      `Xóa account "${account.username}"?\nDatabase sẽ được đổi tên (không xóa hẳn).`,
    )
  ) {
    return
  }
  try {
    await adminApi.deleteAccount(account.id)
    await load()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Không xóa được'
  }
}

async function onLogout() {
  await logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
    <header class="border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div class="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div class="flex items-center gap-3">
          <RouterLink
            :to="{ name: 'home' }"
            class="text-base font-semibold tracking-tight hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            Trading Journal
          </RouterLink>
          <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Root
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span class="hidden text-xs text-zinc-500 sm:inline">{{ username }}</span>
          <button
            type="button"
            class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            @click="onLogout"
          >
            Đăng xuất
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Quản lý accounts</h1>
        <p class="mt-1 text-sm text-zinc-500">
          Mỗi account có database và uploads riêng. Root chỉ quản lý — không có journal.
        </p>
      </div>

      <section class="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Tạo account</h2>
        <form class="grid gap-3 sm:grid-cols-2" @submit.prevent="onCreate">
          <div>
            <label class="mb-1 block text-xs text-zinc-500">Username</label>
            <input
              v-model="newUsername"
              required
              class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-zinc-500">Password</label>
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="4"
              class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <div class="sm:col-span-2">
            <label class="mb-1 block text-xs text-zinc-500">Slug (tùy chọn, URL journal)</label>
            <input
              v-model="newSlug"
              placeholder="vd: trader-a"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
          <p v-if="formError" class="sm:col-span-2 text-xs text-rose-600 dark:text-rose-400">
            {{ formError }}
          </p>
          <div class="sm:col-span-2">
            <button
              type="submit"
              class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              :disabled="saving"
            >
              {{ saving ? 'Đang tạo...' : 'Tạo account' }}
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 class="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Danh sách</h2>
        <div v-if="loading" class="py-8 text-center text-sm text-zinc-400">Đang tải...</div>
        <div
          v-else-if="error"
          class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {{ error }}
        </div>
        <div
          v-else-if="accounts.length === 0"
          class="rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-400 dark:border-zinc-700"
        >
          Chưa có account.
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="account in accounts"
            :key="account.id"
            class="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            :class="{ 'opacity-60': !account.active }"
          >
            <div v-if="editId !== account.id" class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ account.username }}</span>
                  <span
                    class="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
                    :class="
                      account.active
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    "
                  >
                    {{ account.active ? 'Active' : 'Disabled' }}
                  </span>
                </div>
                <div class="mt-0.5 text-xs text-zinc-400">
                  /u/{{ account.slug }} · id {{ account.id }}
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-1.5">
                <RouterLink
                  :to="{ name: 'journal', params: { slug: account.slug } }"
                  class="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Mở journal
                </RouterLink>
                <button
                  type="button"
                  class="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  @click="startEdit(account)"
                >
                  Sửa
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  @click="toggleActive(account)"
                >
                  {{ account.active ? 'Vô hiệu' : 'Kích hoạt' }}
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-rose-200 px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/40"
                  @click="onDelete(account)"
                >
                  Xóa
                </button>
              </div>
            </div>
            <form v-else class="grid gap-2 sm:grid-cols-2" @submit.prevent="saveEdit(account.id)">
              <div>
                <label class="mb-1 block text-xs text-zinc-500">Username</label>
                <input
                  v-model="editUsername"
                  required
                  class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div>
                <label class="mb-1 block text-xs text-zinc-500">Password mới (để trống = giữ)</label>
                <input
                  v-model="editPassword"
                  type="password"
                  minlength="4"
                  class="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                />
              </div>
              <div class="flex gap-2 sm:col-span-2">
                <button
                  type="submit"
                  class="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                  :disabled="saving"
                >
                  Lưu
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-700"
                  @click="cancelEdit"
                >
                  Hủy
                </button>
              </div>
            </form>
          </li>
        </ul>
      </section>
    </main>
  </div>
</template>
