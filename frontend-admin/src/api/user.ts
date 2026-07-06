import { del, get, post } from './request'

export type UserStatus = 'active' | 'frozen'

export interface AdminUser {
  id: number
  email: string | null
  phone: string | null
  name: string
  avatar: string | null
  role: string
  status: UserStatus
  region: string | null
  account: string
  isOnline: boolean
  lastActiveAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ResetPasswordPayload {
  userId: number
  newPassword: string
}

export interface ResetPasswordResult {
  userId: number
  account: string
  newPassword: string
}

export interface AdminUserListResult {
  list: AdminUser[]
  total: number
}

export const getUsers = (params?: { keyword?: string; status?: UserStatus }) =>
  get<AdminUserListResult>('/users', { params })

export const resetUserPassword = (data: ResetPasswordPayload) =>
  post<ResetPasswordResult>('/users/admin/reset-password', data)

export const updateUserStatus = (data: { userId: number; status: UserStatus }) =>
  post<{ userId: number; status: UserStatus }>('/users/admin/update-status', data)

export const deleteUser = (userId: number) => del<{ userId: number; account: string }>(`/users/${userId}`)
