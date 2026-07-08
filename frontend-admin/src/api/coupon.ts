import { del, get, post } from './request'
import type { Coupon, CouponAmounts, CouponStatus } from '@/types/coupon'

export type { Coupon, CouponAmounts, CouponStatus }

export const getCoupons = (params?: { status?: CouponStatus }) =>
  get<Coupon[]>('/coupons/admin/list', { params })

export const createCoupon = (data: Omit<Coupon, 'id' | 'claimedCount' | 'createdAt'>) =>
  post<Coupon>('/coupons/create', data)

export const updateCoupon = (data: Partial<Coupon> & { id: number }) =>
  post<Coupon>('/coupons/update', data)

export const deleteCoupon = (id: number) => del<{ id: number }>(`/coupons/${id}`)
