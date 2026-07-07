import type { PaginatedResult } from '@/types/api'
import type { BatchDeleteResult } from '@/types/batch-delete'
import type {
  CreateProductPayload,
  Product,
  ProductQuery,
  ProductStatus,
  UpdateProductPayload,
} from '@/types/product'
import { del, get, patch, post } from './request'

export const getProducts = (params?: ProductQuery) =>
  get<PaginatedResult<Product>>('/products', { params })

export const getProduct = (id: number) => get<Product>(`/products/${id}`)

export const createProduct = (data: CreateProductPayload) =>
  post<Product>('/products/create', data)

export const updateProduct = (data: UpdateProductPayload) =>
  post<Product>('/products/update', data)

export const deleteProduct = (id: number) => del<null>(`/products/${id}`)

export const batchDeleteProducts = (ids: number[]) =>
  post<BatchDeleteResult>('/products/batch-delete', { ids })

export const updateProductStatus = (id: number, status: ProductStatus) =>
  patch<Product>(`/products/${id}/status`, { status })
