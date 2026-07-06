import { get, post } from './request'

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
  id: number
  totalAmount: number
  status: string
  shippingAddress: string
  items: OrderItem[]
  createdAt: string
}

export const getOrders = () => get<Order[]>('/orders')

export const getOrder = (id: number) => get<Order>(`/orders/${id}`)

export const createOrder = (data: {
  shippingAddress: string
  items: { productSkuId: number; quantity: number; currency?: string }[]
}) => post<Order>('/orders', data)
