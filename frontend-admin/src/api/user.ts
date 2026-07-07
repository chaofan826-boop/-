import { del, get, post } from './request'
import type { AdminPermission } from '@/constants/permissions'

export type UserStatus = 'active' | 'frozen'

export interface AdminUser {
  id: number
  email: string | null
  phone: string | null
  name: string
  avatar: string | null
  role: string
  permissions?: AdminPermission[] | null
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

export interface CreateSubAdminPayload {
  account: string
  password: string
  name: string
  permissions: AdminPermission[]
}

export const getUsers = (params?: { keyword?: string; status?: UserStatus }) =>
  get<AdminUserListResult>('/users', { params })

export const getSubAdmins = () => get<AdminUserListResult>('/users/admin/sub-admins')

export const createSubAdmin = (data: CreateSubAdminPayload) =>
  post<AdminUser>('/users/admin/create-sub-admin', data)

export const updateSubAdminPermissions = (data: {
  userId: number
  permissions: AdminPermission[]
}) => post<AdminUser>('/users/admin/sub-admins/permissions', data)

export const resetUserPassword = (data: ResetPasswordPayload) =>
  post<ResetPasswordResult>('/users/admin/reset-password', data)

export const updateUserStatus = (data: { userId: number; status: UserStatus }) =>
  post<{ userId: number; status: UserStatus }>('/users/admin/update-status', data)

export const deleteUser = (userId: number) => del<{ userId: number; account: string }>(`/users/${userId}`)
