import type { LocalizedTitle } from './product'

export interface HomeProductCard {
  id: number
  spuCode: string
  title: LocalizedTitle
  mainImage: string | null
  salesCount: number
  skus: Array<{
    id: number
    prices: Record<string, number>
    stock: number
    status: string
  }>
}

export interface FlashSaleItem {
  product: HomeProductCard
  originalPrice: number
  salePrice: number
  discountPercent: number
  soldCount: number
  flashStock: number
  soldPercent: number
}

export interface FlashSaleSection {
  id: number
  title: LocalizedTitle
  endsAt: string
  items: FlashSaleItem[]
}

export interface PromotionBlock {
  id: number
  title: LocalizedTitle
  subtitle: LocalizedTitle | null
  discountPercent: number
  endAt: string
  items: Array<{
    product: HomeProductCard
    originalPrice: number
    salePrice: number
    discountPercent: number
  }>
}

export interface HotRankItem {
  rank: number
  product: HomeProductCard
  salesCount: number
  heatLabel: string
}

export interface HomeFeatured {
  flashSale: FlashSaleSection | null
  promotions: PromotionBlock[]
  hotRanking: HotRankItem[]
  featured: FeaturedSection | null
}

export interface FeaturedSection {
  id: number
  title: LocalizedTitle
  products: HomeProductCard[]
}
