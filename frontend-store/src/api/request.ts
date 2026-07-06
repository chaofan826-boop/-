import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'
import type { ApiResponse } from '@/types/api'

const request: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
})

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

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
      localStorage.removeItem('token')
      if (!router.currentRoute.value.meta.public) {
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

export default request
