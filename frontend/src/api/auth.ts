import { request } from './client'

export function login(username: string, password: string) {
  return request<{ token: string; username: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function logout() {
  return request<void>('/api/auth/logout', { method: 'POST' })
}

export function fetchMe() {
  return request<{ username: string }>('/api/auth/me')
}
