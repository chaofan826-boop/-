export interface ProductPricingItem {
  productId: number
  productSkuId: number
  originalPrice: number
  salePrice: number
  promotionType?: 'flash_sale' | 'discount' | null
  promotionTitle?: { zh: string; en: string } | null
}
