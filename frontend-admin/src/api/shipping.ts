import { post, get } from './request'

export type ShippingCarrier = 'DHL' | 'UPS'

export interface Shipping {
  id: number
  orderId: number
  trackingNumber: string
  carrier: ShippingCarrier
  status: string
  shippedAt: string | null
  createdAt: string
}

export interface CreateShippingPayload {
  orderNo: string
  trackingNumber: string
  carrier: ShippingCarrier
}

export const createShipping = (data: CreateShippingPayload) =>
  post<Shipping>('/shipping/create', data)

export const trackShipping = (orderNo: string) =>
  get<{
    orderNo: string
    trackingNumber: string
    carrier: ShippingCarrier
    status: string
    shippedAt: string | null
    events: TrackingEvent[]
  }>(`/shipping/track/${orderNo}`)

export interface TrackingEvent {
  time: string
  location: string
  description: string
  status: string
}
