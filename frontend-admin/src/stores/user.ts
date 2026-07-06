import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getMe, login as loginApi, logout as logoutApi, updateProfile as updateProfileApi, type UserInfo } from '@/api/auth'
import { clearToken, getToken, setToken } from '@/utils/token'

export const useUserStore = defineStore('user', () => {
  const token = ref(getToken())
  const user = ref<UserInfo | null>(null)

  async function login(account: string, password: string) {
    const res = await loginApi(account, password)
    token.value = res.accessToken
    user.value = res.user
    setToken(res.accessToken)
  }

  async function logout() {
    try {
      if (token.value) await logoutApi()
    } catch {
      // Token may already be invalid
    } finally {
      token.value = ''
      user.value = null
      clearToken()
    }
  }

  async function fetchProfile() {
    if (!token.value) return
    user.value = await getMe()
  }

  async function updateProfile(data: { name?: string; avatar?: string | null }) {
    const updated = await updateProfileApi(data)
    user.value = updated
    return updated
  }

  function syncTokenFromStorage() {
    token.value = getToken()
  }

  return { token, user, login, logout, fetchProfile, updateProfile, syncTokenFromStorage }
})
