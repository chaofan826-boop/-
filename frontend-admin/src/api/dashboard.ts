import type { DashboardOverview, HotProductsQuery, HotProductsResult } from '@/types/dashboard'
import { get } from './request'

export const getDashboardOverview = () => get<DashboardOverview>('/dashboard/overview')

export const getHotProducts = (params: HotProductsQuery) =>
  get<HotProductsResult>('/dashboard/hot-products', { params })
