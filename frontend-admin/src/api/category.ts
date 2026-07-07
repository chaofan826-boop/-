import type {
  Category,
  CategoryQuery,
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from '@/types/category'
import type { BatchDeleteResult } from '@/types/batch-delete'
import { del, get, post } from './request'

export const getCategories = (params?: CategoryQuery) =>
  get<Category[]>('/categories', { params })

export const getCategory = (id: number) => get<Category>(`/categories/${id}`)

export const createCategory = (data: CreateCategoryPayload) =>
  post<Category>('/categories/create', data)

export const updateCategory = (data: UpdateCategoryPayload) =>
  post<Category>('/categories/update', data)

export const deleteCategory = (id: number) => del<null>(`/categories/${id}`)

export const batchDeleteCategories = (ids: number[]) =>
  post<BatchDeleteResult>('/categories/batch-delete', { ids })
