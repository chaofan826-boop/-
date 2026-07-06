import type {
  Banner,
  BannerQuery,
  CreateBannerPayload,
  UpdateBannerPayload,
} from '@/types/banner'
import { del, get, post } from './request'

export const getBanners = (params?: BannerQuery) =>
  get<Banner[]>('/banners', { params })

export const getBanner = (id: number) => get<Banner>(`/banners/${id}`)

export const createBanner = (data: CreateBannerPayload) =>
  post<Banner>('/banners/create', data)

export const updateBanner = (data: UpdateBannerPayload) =>
  post<Banner>('/banners/update', data)

export const deleteBanner = (id: number) => del<null>(`/banners/${id}`)
