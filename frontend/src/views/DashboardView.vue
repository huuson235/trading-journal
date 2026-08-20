<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import JournalTable from '@/components/JournalTable.vue'
import JournalToolbar from '@/components/JournalToolbar.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import BackgroundToggle from '@/components/BackgroundToggle.vue'
import LoginModal from '@/components/LoginModal.vue'
import ChangePasswordModal from '@/components/ChangePasswordModal.vue'
import TradeFormModal from '@/components/TradeFormModal.vue'
import { useJournal, type SlotFiles } from '@/composables/useJournal'
import { useAuth } from '@/composables/useAuth'
import { useBackground } from '@/composables/useBackground'
import type { JournalEntry, TradePayload } from '@/types/journal'

const route = useRoute()
const router = useRouter()
const { username, isAuthenticated, isRoot, isUser, canEditSlug, logout } = useAuth()
const showLogin = ref(false)
const showChangePassword = ref(false)
const formOpen = ref(false)
const editingEntry = ref<JournalEntry | null>(null)
const saving = ref(false)

const journalSlug = computed(() => String(route.params.slug ?? ''))

useBackground(journalSlug)

const {
  entries,
  visibleEntries,
  dateFrom,
  dateTo,
  sortField,
  sortDirection,
  setSort,
  resetToCurrentWeek,
  resetToPreviousWeek,
  resetToCurrentMonth,
  resetToPreviousMonth,
  pairSuggestions,
  loading,
  error,
  totalPnl,
  totalRrReal,
  winCount,
  winRate,
  statsEntries,
  saveTrade,
  setVisible,
  removeEntry,
  reload,
} = useJournal(journalSlug)

function formatSigned(value: number, digits = 1) {
  const n = value.toFixed(digits)
  return `${value >= 0 ? '+' : ''}${n}`
}

const totalClass = computed(() => {
  if (totalPnl.value > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (totalPnl.value < 0) return 'text-rose-600 dark:text-rose-400'
  return 'text-zinc-500'
})

const rrRealClass = computed(() => {
  if (totalRrReal.value > 0) return 'text-emerald-600 dark:text-emerald-400'
  if (totalRrReal.value < 0) return 'text-rose-600 dark:text-rose-400'
  return 'text-zinc-500'
})

const canEdit = computed(() => canEditSlug(journalSlug.value))
const readonly = computed(() => !canEdit.value)

const winSummary = computed(() => {
  const total = statsEntries.value.length
  return `${winCount.value}/${total} (${winRate.value}%)`
})

function openNewTrade() {
  editingEntry.value = null
  formOpen.value = true
}

function openEdit(entry: JournalEntry) {
  if (!canEdit.value) return
  editingEntry.value = entry
  formOpen.value = true
}

async function onSave(payload: Partial<TradePayload>, files: SlotFiles, removedImageIds: number[]) {
  saving.value = true
  try {
    await saveTrade(payload, files, {
      id: editingEntry.value?.id,
      removedImageIds,
    })
    formOpen.value = false
    editingEntry.value = null
  } catch {
    /* error shown by useJournal */
  } finally {
    saving.value = false
  }
}

async function onLogout() {
  await logout()
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="min-h-screen">
    <header class="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
      <div class="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div class="min-w-0">
          <div class="flex items-center gap-2">
            <RouterLink
              :to="{ name: 'home' }"
              class="truncate text-base font-semibold tracking-tight hover:text-indigo-600 sm:text-lg dark:hover:text-indigo-400"
            >
              Trading Journal
            </RouterLink>
            <span class="truncate rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {{ journalSlug }}
            </span>
            <span
              v-if="readonly"
              class="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
            >
              Chỉ xem
            </span>
          </div>
          <p class="hidden text-xs text-zinc-500 sm:block">
            {{ readonly ? 'Đăng nhập tài khoản này để chỉnh sửa' : 'Ghi nhật ký giao dịch — nhấn New Trade để mở form' }}
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <div class="hidden items-center gap-x-2 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs dark:border-zinc-800 sm:flex">
            <template v-if="canEdit">
              <span class="text-zinc-400">PnL</span>
              <span :class="['font-semibold tabular-nums', totalClass]">
                {{ formatSigned(totalPnl) }}
              </span>
              <span class="text-zinc-300 dark:text-zinc-600">/</span>
            </template>
            <span class="text-zinc-400">Total R:R real</span>
            <span :class="['font-semibold tabular-nums', rrRealClass]">
              {{ formatSigned(totalRrReal) }}
            </span>
            <span class="text-zinc-300 dark:text-zinc-600">/</span>
            <span class="text-zinc-400">Win</span>
            <span class="font-semibold tabular-nums">{{ winSummary }}</span>
          </div>

          <button
            v-if="canEdit"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-[#1976D2] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#1565C0] sm:px-4 sm:py-2 sm:text-sm"
            :disabled="loading"
            @click="openNewTrade"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5 sm:h-4 sm:w-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Trade
          </button>

          <RouterLink
            v-if="isRoot"
            :to="{ name: 'admin' }"
            class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Accounts
          </RouterLink>

          <template v-if="isAuthenticated">
            <span class="hidden text-xs text-zinc-500 sm:inline">{{ username }}</span>
            <button
              v-if="isUser"
              type="button"
              class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              @click="showChangePassword = true"
            >
              Đổi MK
            </button>
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
            class="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            @click="showLogin = true"
          >
            Đăng nhập
          </button>

          <BackgroundToggle v-if="canEdit" />
          <ThemeToggle />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-zinc-100 px-4 py-2 text-xs dark:border-zinc-800/80 sm:hidden">
        <template v-if="canEdit">
          <span class="text-zinc-400">PnL</span>
          <span :class="['font-semibold tabular-nums', totalClass]">
            {{ formatSigned(totalPnl) }}
          </span>
          <span class="text-zinc-300 dark:text-zinc-600">/</span>
        </template>
        <span class="text-zinc-400">R:R real</span>
        <span :class="['font-semibold tabular-nums', rrRealClass]">
          {{ formatSigned(totalRrReal) }}
        </span>
        <span class="text-zinc-300 dark:text-zinc-600">/</span>
        <span class="text-zinc-400">Win</span>
        <span class="font-semibold tabular-nums">{{ winSummary }}</span>
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
          @reset-previous-week="resetToPreviousWeek"
          @reset-month="resetToCurrentMonth"
          @reset-previous-month="resetToPreviousMonth"
          @sort="setSort"
        />

        <JournalTable
          :entries="visibleEntries"
          :sort-field="sortField"
          :sort-direction="sortDirection"
          :has-any-entries="entries.length > 0"
          :slug="journalSlug"
          :readonly="readonly"
          @sort="setSort"
          @remove="removeEntry"
          @edit="openEdit"
          @toggle-visible="setVisible"
        />
      </template>
    </main>

    <LoginModal v-model:open="showLogin" />
    <ChangePasswordModal v-model:open="showChangePassword" />
    <TradeFormModal
      v-model:open="formOpen"
      :entry="editingEntry"
      :pair-suggestions="pairSuggestions"
      :saving="saving"
      @save="onSave"
    />
  </div>
</template>
