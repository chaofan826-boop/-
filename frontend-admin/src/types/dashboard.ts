import type { LocalizedTitle } from '@/types/product'

export type HotProductsPeriod = 'day' | 'month' | 'year' | 'all'

export type HotProductsSortBy = 'quantity' | 'revenue'

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
  sortBy?: HotProductsSortBy
  date: string
  startDate: string
  endDate: string
  list: HotProductRankItem[]
}

export interface HotProductsQuery {
  period: HotProductsPeriod
  sortBy?: HotProductsSortBy
  date?: string
}

export interface DashboardOverview {
  totalUsers: number
  todaySales: number
  totalSales: number
  pendingShipmentCount: number
  date: string
}

export interface DashboardOrderTrendDay {
  date: string
  label: string
  orderUserCount: number
  orderCount: number
  orderAmount: number
}

export interface DashboardOrderTrends {
  startDate: string
  endDate: string
  label?: string
  days: DashboardOrderTrendDay[]
}

export interface DashboardOrderTrendsQuery {
  startDate?: string
  endDate?: string
}
