import type { ProductPricingItem } from '@/types/pricing'
import { post } from './request'

export const quoteProductPricing = (
  items: Array<{ productId: number; productSkuId: number }>,
  currency: string,
) => post<ProductPricingItem[]>('/promotions/pricing', { items, currency })
