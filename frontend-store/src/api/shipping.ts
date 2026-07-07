import { get } from './request'

export type ShippingCarrier = 'DHL' | 'UPS'

export interface TrackingEvent {
  time: string
  location: string
  description: string
  status: string
}

export interface ShippingTrack {
  orderNo: string
  trackingNumber: string
  carrier: ShippingCarrier
  status: string
  shippedAt: string | null
  events: TrackingEvent[]
}

export const trackShipping = (orderNo: string) =>
  get<ShippingTrack>(`/shipping/track/${orderNo}`)
