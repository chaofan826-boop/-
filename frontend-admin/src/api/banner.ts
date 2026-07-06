import type {
  Banner,
  BannerQuery,
  BannerSettings,
  BannerStatus,
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

export const updateBannerStatus = (id: number, status: BannerStatus) =>
  post<Banner>('/banners/update', { id, status })

export const getBannerSettings = () => get<BannerSettings>('/banners/settings')

export const updateBannerSettings = (carouselEnabled: boolean) =>
  post<BannerSettings>('/banners/settings/update', { carouselEnabled })

export const deleteBanner = (id: number) => del<null>(`/banners/${id}`)
