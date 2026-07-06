import type { HomeFeatured } from '@/types/home'
import { get } from './request'

export const getHomeFeatured = (currency?: string) =>
  get<HomeFeatured>('/home/featured', { params: { currency } })
