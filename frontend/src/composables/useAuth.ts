import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import type { AuthRole } from '@/api/auth'
import { getAuthToken, setAuthToken } from '@/api/client'

const username = ref<string | null>(null)
const role = ref<AuthRole | null>(null)
const slug = ref<string | null>(null)
const ready = ref(false)

async function restoreSession() {
  const token = getAuthToken()
  if (!token) {
    ready.value = true
    return
  }
  try {
    const me = await authApi.fetchMe()
    username.value = me.username
    role.value = me.role
    slug.value = me.slug
  } catch {
    setAuthToken(null)
    username.value = null
    role.value = null
    slug.value = null
  } finally {
    ready.value = true
  }
}

const initPromise = restoreSession()

export function waitForAuth() {
  return initPromise
}

export function useAuth() {
  const isAuthenticated = computed(() => username.value !== null)
  const isRoot = computed(() => role.value === 'root')
  const isUser = computed(() => role.value === 'user')

  async function login(user: string, password: string) {
    const result = await authApi.login(user, password)
    setAuthToken(result.token)
    username.value = result.username
    role.value = result.role
    slug.value = result.slug
    return result
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    setAuthToken(null)
    username.value = null
    role.value = null
    slug.value = null
  }

  function canEditSlug(targetSlug: string) {
    if (role.value === 'root') return true
    return role.value === 'user' && slug.value === targetSlug
  }

  return {
    username,
    role,
    slug,
    ready,
    isAuthenticated,
    isRoot,
    isUser,
    login,
    logout,
    canEditSlug,
  }
}
