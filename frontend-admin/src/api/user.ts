import { get } from './request'

export interface User {
  id: number
  email: string
  name: string
  role: string
}

export const getUsers = () => get<User[]>('/users')
