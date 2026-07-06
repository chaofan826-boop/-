import type { LocalizedTitle } from '@/types/product'

export type HotProductsPeriod = 'day' | 'month' | 'year'

export interface HotProductRankItem {
  rank: number
  productId: number
  spuCode: string
  title: LocalizedTitle
  mainImage: string | null
  quantitySold: number
  revenue: number
}

export interface HotProductsResult {
  period: HotProductsPeriod
  date: string
  startDate: string
  endDate: string
  list: HotProductRankItem[]
}

export interface HotProductsQuery {
  period: HotProductsPeriod
  date?: string
}

export interface DashboardOverview {
  totalUsers: number
  todaySales: number
  totalSales: number
  pendingShipmentCount: number
  date: string
}
