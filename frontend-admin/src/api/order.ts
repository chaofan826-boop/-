import { get, patch, del, post } from './request'
import type { BatchDeleteStringResult } from '@/types/batch-delete'

export interface OrderItem {
  id: number
  productId: number
  productSkuId: number | null
  quantity: number
  price: number
  product?: {
    title?: { zh?: string; en?: string }
    mainImage?: string | null
  }
  productSku?: {
    skuCode?: string
    color?: string | null
    size?: string | null
    specValues?: Record<string, string> | null
  }
}

export interface OrderUsedCoupon {
  userCouponId: number
  couponId: number
  title: { zh?: string; en?: string }
  discountAmounts: { USD?: number; CNY?: number }
  minOrderAmounts: { USD?: number; CNY?: number } | null
  status: string
  usedAt: string | null
  discountApplied: number
}

export interface Order {
  orderNo: string
  userId: number
  totalAmount: number
  status: string
  shippingAddress: string
  paymentMethod?: string | null
  payExpiresAt?: string | null
  currency?: string
  userCouponId?: number | null
  couponDiscount?: number
  usedCoupon?: OrderUsedCoupon | null
  items: OrderItem[]
  user?: { name: string; email: string | null; phone?: string | null; region?: string | null }
  createdAt: string
}

export interface QueryOrdersParams {
  keyword?: string
  status?: string
  paymentMethod?: string
  couponUsed?: 'yes' | 'no'
  startDate?: string
  endDate?: string
}

export const getOrders = (params?: QueryOrdersParams) => get<Order[]>('/orders', { params })
export const getOrder = (orderNo: string) => get<Order>(`/orders/${orderNo}`)
export const updateOrderStatus = (orderNo: string, status: string) =>
  patch<Order>(`/orders/${orderNo}/status`, { status })

export interface UpdateOrderPayload {
  shippingAddress?: string
  status?: string
  items?: { id: number; quantity: number; price: number }[]
}

export const updateOrder = (orderNo: string, data: UpdateOrderPayload) =>
  patch<Order>(`/orders/${orderNo}`, data)

export const deleteOrder = (orderNo: string) => del<{ orderNo: string }>(`/orders/${orderNo}`)

export const batchDeleteOrders = (orderNos: string[]) =>
  post<BatchDeleteStringResult>('/orders/batch-delete', { orderNos })
