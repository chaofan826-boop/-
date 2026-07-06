import { get, patch } from './request'

export interface OrderItem {
  id: number
  productId: number
  quantity: number
  price: number
  product?: { name: string }
}

export interface Order {
  id: number
  userId: number
  totalAmount: number
  status: string
  shippingAddress: string
  items: OrderItem[]
  user?: { name: string; email: string }
  createdAt: string
}

export const getOrders = () => get<Order[]>('/orders')
export const getOrder = (id: number) => get<Order>(`/orders/${id}`)
export const updateOrderStatus = (id: number, status: string) =>
  patch<Order>(`/orders/${id}/status`, { status })
