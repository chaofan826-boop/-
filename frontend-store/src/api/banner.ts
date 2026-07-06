import type { Banner } from '@/types/banner'
import { get } from './request'

export const getBanners = () => get<Banner[]>('/banners/home')
