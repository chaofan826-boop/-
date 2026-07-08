import type { LocalizedTitle } from '@/types/product'

export type HotProductsPeriod = 'day' | 'month' | 'year' | 'all'

export type HotProductsSortBy = 'quantity' | 'revenue'

export type DashboardCurrency = 'USD' | 'CNY'

export interface HotProductRankItem {
  rank: number
  productId: number
  spuCode: string
  title: LocalizedTitle
  mainImage: string | null
  quantitySold: number
  revenueUsd: number
  revenueCny: number
}

export interface HotProductsResult {
  period: HotProductsPeriod
  sortBy?: HotProductsSortBy
  currency?: DashboardCurrency
  date: string
  startDate: string
  endDate: string
  list: HotProductRankItem[]
}

export interface HotProductsQuery {
  period: HotProductsPeriod
  sortBy?: HotProductsSortBy
  currency?: DashboardCurrency
  date?: string
}

export interface DashboardOverview {
  totalUsers: number
  todaySalesUsd: number
  todaySalesCny: number
  totalSalesUsd: number
  totalSalesCny: number
  pendingShipmentCount: number
  date: string
}

export interface DashboardOrderTrendDay {
  date: string
  label: string
  orderUserCount: number
  orderCount: number
  orderAmountUsd: number
  orderAmountCny: number
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
