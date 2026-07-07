import { del, get, post } from './request'
import type { ShippingAddress, ShippingAddressPayload } from '@/utils/shipping-address'

export type { ShippingAddress, ShippingAddressPayload }

export const getShippingAddresses = () => get<ShippingAddress[]>('/addresses')

export const createShippingAddress = (data: ShippingAddressPayload) =>
  post<ShippingAddress>('/addresses/create', data)

export const updateShippingAddress = (data: ShippingAddressPayload & { id: number }) =>
  post<ShippingAddress>('/addresses/update', data)

export const setDefaultShippingAddress = (id: number) =>
  post<ShippingAddress>('/addresses/set-default', { id })

export const deleteShippingAddress = (id: number) => del<{ id: number }>(`/addresses/${id}`)
