import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMe, login as loginApi, logout as logoutApi, register as registerApi, type UserInfo } from '@/api/auth'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const user = ref<UserInfo | null>(null)

  async function login(account: string, password: string) {
    const res = await loginApi(account, password)
    token.value = res.accessToken
    user.value = res.user
    localStorage.setItem('token', res.accessToken)
  }

  async function register(data: { email?: string; phone?: string; password: string; name: string }) {
    const res = await registerApi(data)
    token.value = res.accessToken
    user.value = res.user
    localStorage.setItem('token', res.accessToken)
  }

  async function logout() {
    try {
      if (token.value) await logoutApi()
    } finally {
      token.value = ''
      user.value = null
      localStorage.removeItem('token')
    }
  }

  async function fetchProfile() {
    if (!token.value) return
    user.value = await getMe()
  }

  return { token, user, login, register, logout, fetchProfile }
})
