import { get, post } from './request'

export interface UserInfo {
  id: number
  email: string | null
  phone: string | null
  name: string
  role: string
}

export interface AuthResult {
  accessToken: string
  user: UserInfo
}

export const login = (account: string, password: string) =>
  post<AuthResult>('/auth/login', { account, password })

export const register = (data: { email?: string; phone?: string; password: string; name: string }) =>
  post<AuthResult>('/auth/register', data)

export const logout = () => post<null>('/auth/logout')

export const getMe = () => get<UserInfo>('/auth/me')
