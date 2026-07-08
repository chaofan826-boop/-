export type CouponStatus = 'active' | 'inactive'

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
  status: CouponStatus
  sortOrder: number
  createdAt: string
}
