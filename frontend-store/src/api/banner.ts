import type { Banner, BannerQuery } from '@/types/banner'
import { get } from './request'

export const getBanners = (params?: BannerQuery) =>
  get<Banner[]>('/banners', { params: { status: 'active', ...params } })
