import type {
  DashboardOrderTrends,
  DashboardOrderTrendsQuery,
  DashboardOverview,
  HotProductsQuery,
  HotProductsResult,
} from '@/types/dashboard'
import { get } from './request'

export const getDashboardOverview = () => get<DashboardOverview>('/dashboard/overview')

export const getDashboardOrderTrends = (params?: DashboardOrderTrendsQuery) =>
  get<DashboardOrderTrends>('/dashboard/order-trends', { params })

export const getHotProducts = (params: HotProductsQuery) =>
  get<HotProductsResult>('/dashboard/hot-products', { params })
