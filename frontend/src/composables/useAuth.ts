import { ref, computed } from 'vue'
import * as authApi from '@/api/auth'
import { getAuthToken, setAuthToken } from '@/api/client'

const username = ref<string | null>(null)
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
  } catch {
    setAuthToken(null)
    username.value = null
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

  async function login(user: string, password: string) {
    const result = await authApi.login(user, password)
    setAuthToken(result.token)
    username.value = result.username
  }

  async function logout() {
    try {
      await authApi.logout()
    } catch {
      /* ignore */
    }
    setAuthToken(null)
    username.value = null
  }

  return {
    username,
    ready,
    isAuthenticated,
    login,
    logout,
  }
}
