import { get, post } from './request'

export type UserCouponStatus = 'available' | 'used' | 'expired'

export interface CouponAmounts {
  USD?: number
  CNY?: number
}

export interface Coupon {
  id: number
  title: { zh: string; en: string }
  discountAmounts: CouponAmounts
  minOrderAmounts: CouponAmounts | null
  categoryIds: number[] | null
  totalQuantity: number | null
  claimedCount: number
  perUserLimit: number
  claimStartAt: string
  claimEndAt: string
  validityDays: number
  showOnHome: boolean
  status: string
  sortOrder: number
  userClaimedCount?: number
  canClaim?: boolean
}

export interface UserCoupon {
  id: number
  userId: number
  couponId: number
  status: UserCouponStatus
  claimedAt: string
  expiresAt: string
  usedAt?: string | null
  orderNo?: string | null
  coupon: Coupon
  applicable?: boolean
  discountPreview?: number
  eligibleSubtotal?: number
  ineligibleReason?: string | null
}

export const getHomeClaimableCoupons = () => get<Coupon[]>('/coupons/claimable/home')

export const getClaimableCoupons = () => get<Coupon[]>('/coupons/claimable')

export const claimCoupon = (id: number) => post<UserCoupon>(`/coupons/${id}/claim`)

export const getMyCoupons = (status?: UserCouponStatus) =>
  get<UserCoupon[]>('/coupons/mine', { params: status ? { status } : undefined })

export const getApplicableCoupons = (orderNo: string) =>
  get<UserCoupon[]>(`/orders/${orderNo}/applicable-coupons`)
