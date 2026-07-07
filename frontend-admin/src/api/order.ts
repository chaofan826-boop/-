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
  orderNo: string
  userId: number
  totalAmount: number
  status: string
  shippingAddress: string
  items: OrderItem[]
  user?: { name: string; email: string }
  createdAt: string
}

export const getOrders = () => get<Order[]>('/orders')
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
