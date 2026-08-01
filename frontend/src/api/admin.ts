import { request } from './client'

export interface Account {
  id: number
  username: string
  slug: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export function fetchAccounts() {
  return request<Account[]>('/api/admin/accounts')
}

export function createAccount(data: { username: string; password: string; slug?: string }) {
  return request<Account>('/api/admin/accounts', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateAccount(
  id: number,
  data: { username?: string; password?: string; active?: boolean },
) {
  return request<Account>(`/api/admin/accounts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteAccount(id: number) {
  return request<void>(`/api/admin/accounts/${id}`, { method: 'DELETE' })
}
