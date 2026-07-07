import type { Product } from '@/types/product'
import { del, get, post } from './request'

export interface BrowseHistoryItem {
  productId: number
  viewedAt: string
  product: Product
}

export const recordBrowseHistory = (productId: number) =>
  post<{ success: boolean }>('/browse-history', { productId })

export const getBrowseHistory = () => get<BrowseHistoryItem[]>('/browse-history')

export const deleteBrowseHistoryItem = (productId: number) =>
  del<{ success: boolean }>(`/browse-history/${productId}`)

export const clearBrowseHistory = () => del<{ success: boolean }>('/browse-history')
