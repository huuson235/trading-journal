const STORAGE_KEY = 'authToken'

let authToken: string | null =
  typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null

export function getAuthToken() {
  return authToken
}

export function setAuthToken(token: string | null) {
  authToken = token
  if (token) sessionStorage.setItem(STORAGE_KEY, token)
  else sessionStorage.removeItem(STORAGE_KEY)
}

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers)
  if (authToken) headers.set('Authorization', `Bearer ${authToken}`)
  if (options?.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}
