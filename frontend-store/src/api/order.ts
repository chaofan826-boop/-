import { get, post, del } from './request'
import type { PaymentMethod } from '@/utils/payment-method'

export interface OrderItem {
  id: number
  productId: number
  productSkuId: number | null
  quantity: number
  price: number
  product?: { title: { zh: string }; mainImage?: string | null }
  productSku?: { skuCode: string; color: string | null; size: string | null }
}

export interface Order {
  orderNo: string
  totalAmount: number
  status: string
  shippingAddress: string
  paymentMethod?: PaymentMethod | null
  payExpiresAt?: string | null
  items: OrderItem[]
  createdAt: string
}

export const getOrders = () => get<Order[]>('/orders')

export const getOrder = (orderNo: string) => get<Order>(`/orders/${orderNo}`)

export const createOrder = (data: {
  shippingAddress: string
  items: { productSkuId: number; quantity: number; currency?: string }[]
}) => post<Order>('/orders', data)

export const payOrder = (orderNo: string, paymentMethod: PaymentMethod) =>
  post<Order>(`/orders/${orderNo}/pay`, { paymentMethod })

export const cancelOrder = (orderNo: string) => post<Order>(`/orders/${orderNo}/cancel`)

export const deleteOrder = (orderNo: string) => del<{ orderNo: string }>(`/orders/${orderNo}`)
