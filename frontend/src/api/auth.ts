import { request } from './client'

export type AuthRole = 'root' | 'user'

export interface AuthUser {
  token: string
  username: string
  role: AuthRole
  slug: string | null
}

export interface PublicAccount {
  username: string
  slug: string
}

export function login(username: string, password: string) {
  return request<AuthUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function logout() {
  return request<void>('/api/auth/logout', { method: 'POST' })
}

export function fetchMe() {
  return request<{ username: string; role: AuthRole; slug: string | null }>('/api/auth/me')
}

export function fetchPublicAccounts() {
  return request<PublicAccount[]>('/api/auth/accounts')
}
