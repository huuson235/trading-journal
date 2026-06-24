<script setup lang="ts">
import { computed, ref } from 'vue'
import JournalTable from '@/components/JournalTable.vue'
import JournalToolbar from '@/components/JournalToolbar.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import BackgroundToggle from '@/components/BackgroundToggle.vue'
import LoginModal from '@/components/LoginModal.vue'
import { useJournal } from '@/composables/useJournal'
import { useAuth } from '@/composables/useAuth'

const { username, isAuthenticated, logout } = useAuth()
const showLogin = ref(false)

const {
  entries,
  visibleEntries,
  dateFrom,
  dateTo,
  sortField,
  sortDirection,
  setSort,
  resetToCurrentWeek,
  resetToCurrentMonth,
  pairSuggestions,
  loading,
  error,
  totalPnl,
  winCount,
  statsEntries,
  addEntry,
  removeEntry,
  uploadImage,
  removeImage,
  reload,
} = useJournal()

const totalClass = computed(() => {
  if (totalPnl.value > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (totalPnl.value < 0) return 'text-rose-600 dark:text-rose-400'
  return 'text-zinc-500'
})

const readonly = computed(() => !isAuthenticated.value)
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div class="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <h1 class="truncate text-base font-semibold tracking-tight sm:text-lg">
              Trading Journal
            </h1>
            <span
              v-if="readonly"
              class="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              Chỉ xem
            </span>
          </div>
          <p class="hidden text-xs text-zinc-500 sm:block">
            {{ readonly ? 'Đăng nhập để chỉnh sửa nhật ký' : 'Ghi nhật ký giao dịch — paste ảnh chart bằng Ctrl+V' }}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <div class="hidden items-center gap-3 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-800 sm:flex">
            <div>
              <span class="text-zinc-400">PnL</span>
              <span :class="['ml-1.5 font-semibold tabular-nums', totalClass]">
                {{ totalPnl >= 0 ? '+' : '' }}{{ totalPnl.toFixed(1) }}
              </span>
            </div>
            <div class="h-4 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div>
              <span class="text-zinc-400">Win</span>
              <span class="ml-1.5 font-semibold tabular-nums">{{ winCount }}/{{ statsEntries.length }}</span>
            </div>
          </div>

          <button
            v-if="isAuthenticated"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 sm:px-4 sm:py-2 sm:text-sm"
            :disabled="loading"
            @click="addEntry"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5 sm:h-4 sm:w-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Thêm dòng
          </button>

          <template v-if="isAuthenticated">
            <span class="hidden text-xs text-zinc-500 sm:inline">{{ username }}</span>
            <button
              type="button"
              class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              @click="logout"
            >
              Đăng xuất
            </button>
          </template>
          <button
            v-else
            type="button"
            class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            @click="showLogin = true"
          >
            Đăng nhập
          </button>

          <BackgroundToggle />
          <ThemeToggle />
        </div>
      </div>

      <div class="flex items-center gap-4 border-t border-zinc-100 px-4 py-2 text-xs dark:border-zinc-800/80 sm:hidden">
        <div>
          <span class="text-zinc-400">PnL </span>
          <span :class="['font-semibold tabular-nums', totalClass]">
            {{ totalPnl >= 0 ? '+' : '' }}{{ totalPnl.toFixed(1) }}
          </span>
        </div>
        <div>
          <span class="text-zinc-400">Win </span>
          <span class="font-semibold tabular-nums">{{ winCount }}/{{ statsEntries.length }}</span>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6">
      <div
        v-if="error"
        class="mb-4 flex items-center justify-between rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300"
      >
        <span>{{ error }}</span>
        <button type="button" class="text-xs underline" @click="reload">Thử lại</button>
      </div>

      <div v-if="loading" class="py-16 text-center text-sm text-zinc-400">
        Đang tải...
      </div>

      <template v-else>
        <JournalToolbar
          v-model:date-from="dateFrom"
          v-model:date-to="dateTo"
          :sort-field="sortField"
          :sort-direction="sortDirection"
          :result-count="visibleEntries.length"
          :total-count="entries.length"
          @reset-week="resetToCurrentWeek"
          @reset-month="resetToCurrentMonth"
          @sort="setSort"
        />

        <JournalTable
          :entries="visibleEntries"
          :pair-suggestions="pairSuggestions"
          :sort-field="sortField"
          :sort-direction="sortDirection"
          :has-any-entries="entries.length > 0"
          :readonly="readonly"
          :upload-handler="uploadImage"
          :remove-image-handler="removeImage"
          @sort="setSort"
          @remove="removeEntry"
        />
      </template>
    </main>

    <LoginModal v-model:open="showLogin" />
  </div>
</template>
