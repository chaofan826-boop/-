import { get, patch, del } from './request'

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
  }
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

export interface UpdateOrderPayload {
  shippingAddress?: string
  status?: string
  items?: { id: number; quantity: number; price: number }[]
}

export const updateOrder = (id: number, data: UpdateOrderPayload) =>
  patch<Order>(`/orders/${id}`, data)

export const deleteOrder = (id: number) => del<{ id: number }>(`/orders/${id}`)
