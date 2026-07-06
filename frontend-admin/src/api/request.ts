import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { getActivePinia } from 'pinia'
import router from '@/router'
import { useUserStore } from '@/stores/user'
import type { ApiResponse } from '@/types/api'
import { clearToken, getToken } from '@/utils/token'

const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

function resolveToken(): string {
  try {
    const pinia = getActivePinia()
    if (pinia) {
      const storeToken = useUserStore(pinia).token
      if (storeToken) return storeToken
    }
  } catch {
    // Pinia not ready yet
  }
  return getToken()
}

function attachAuthHeader(config: AxiosRequestConfig, token: string) {
  const value = `Bearer ${token}`
  if (!config.headers) {
    config.headers = {}
  }
  if (typeof (config.headers as axios.AxiosHeaders).set === 'function') {
    ;(config.headers as axios.AxiosHeaders).set('Authorization', value)
  } else {
    ;(config.headers as Record<string, string>).Authorization = value
  }
}

request.interceptors.request.use((config) => {
  const token = resolveToken()
  if (token) {
    attachAuthHeader(config, token)
  }
  return config
})

function clearAuthState() {
  try {
    const pinia = getActivePinia()
    if (pinia) {
      const store = useUserStore(pinia)
      store.token = ''
      store.user = null
    }
  } catch {
    // ignore
  }
  clearToken()
}

request.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    const res = response.data
    if (res.code !== 0) {
      ElMessage.error(res.message || 'Request failed')
      return Promise.reject(new Error(res.message))
    }
    return res.data as never
  },
  (error) => {
    const res = error.response?.data as ApiResponse | undefined
    const message = res?.message || error.message || 'Request failed'
    if (error.response?.status === 401) {
      clearAuthState()
      if (router.currentRoute.value.path !== '/login') {
        router.push('/login')
      }
    }
    ElMessage.error(Array.isArray(message) ? message[0] : message)
    return Promise.reject(error)
  },
)

export function get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request.get(url, config)
}

export function post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request.post(url, data, config)
}

export function patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request.patch(url, data, config)
}

export function del<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
  return request.delete(url, config)
}

export default request
