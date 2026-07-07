import { get, post } from './request'

export interface UserInfo {
  id: number
  email: string | null
  phone: string | null
  name: string
  avatar: string | null
  role: string
  permissions?: import('@/constants/permissions').AdminPermission[] | null
}

export interface UpdateProfilePayload {
  name?: string
  avatar?: string | null
}

export interface ChangePasswordPayload {
  currentPassword: string
  newPassword: string
}

export interface AuthResult {
  accessToken: string
  expiresIn: string
  tokenType: string
  user: UserInfo
}

export const login = (account: string, password: string) =>
  post<AuthResult>('/auth/login', { account, password })

export const logout = () => post<null>('/auth/logout')

export const getMe = () => get<UserInfo>('/auth/me')

export const updateProfile = (data: UpdateProfilePayload) =>
  post<UserInfo>('/auth/profile/update', data)

export const changePassword = (data: ChangePasswordPayload) =>
  post<null>('/auth/password/change', data)
