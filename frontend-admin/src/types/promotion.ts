export interface LocalizedTitle {
  zh: string
  en: string
}

export type PromotionType = 'featured' | 'flash_sale' | 'discount'
export type PromotionStatus = 'active' | 'inactive'

export type ProductSalePrices = Record<string, { USD?: number; CNY?: number }>

export interface Promotion {
  id: number
  type: PromotionType
  title: LocalizedTitle
  subtitle: LocalizedTitle | null
  discountPercent: number
  productIds: number[]
  salePrices: ProductSalePrices | null
  flashStock: number | null
  startAt: string
  endAt: string
  sortOrder: number
  status: PromotionStatus
  createdAt: string
  updatedAt: string
}

export interface PromotionQuery {
  status?: PromotionStatus
  type?: PromotionType
}

export interface CreatePromotionPayload {
  type: PromotionType
  title: LocalizedTitle
  subtitle?: LocalizedTitle | null
  discountPercent?: number
  productIds: number[]
  salePrices?: ProductSalePrices | null
  flashStock?: number | null
  startAt: string
  endAt: string
  sortOrder?: number
  status?: PromotionStatus
}

export interface UpdatePromotionPayload extends CreatePromotionPayload {
  id: number
}

export const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  featured: '臻品推荐',
  flash_sale: '限时秒杀',
  discount: '新人专享',
}
