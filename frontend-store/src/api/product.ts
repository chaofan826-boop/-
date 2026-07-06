import type { PaginatedResult } from '@/types/api'
import type { Category, CategoryQuery, Product, ProductQuery } from '@/types/product'
import { get } from './request'

export const getProducts = (params?: ProductQuery) =>
  get<PaginatedResult<Product>>('/products', { params: { status: 'active', ...params } })

export const getProduct = (id: number) => get<Product>(`/products/${id}`)

export const getCategories = (params?: CategoryQuery) =>
  get<Category[]>('/categories', { params: { status: 'active', ...params } })

export const getCategory = (id: number) => get<Category>(`/categories/${id}`)

export function getSkuPrice(sku: { prices: Record<string, number> }, currency: string): number {
  const price = sku.prices[currency] ?? sku.prices['USD'] ?? Object.values(sku.prices)[0]
  return Number(price ?? 0)
}

export function getMinPrice(product: Product, currency: string): number {
  if (!product.skus?.length) return 0
  return Math.min(...product.skus.map((s) => getSkuPrice(s, currency)))
}

export function formatSpec(sku: { color?: string | null; size?: string | null }): string {
  return [sku.color, sku.size].filter(Boolean).join(' / ')
}

export function formatSalesCount(count: number, locale: 'zh' | 'en' = 'zh') {
  const n = Math.max(0, Number(count) || 0)
  if (locale === 'zh') {
    if (n >= 10000) return `已售 ${(n / 10000).toFixed(1)}万+`
    return `已售 ${n}`
  }
  if (n >= 10000) return `${(n / 10000).toFixed(1)}k+ sold`
  return `${n} sold`
}
