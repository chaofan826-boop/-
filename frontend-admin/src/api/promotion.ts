import type {
  CreatePromotionPayload,
  Promotion,
  PromotionQuery,
  PromotionStatus,
  UpdatePromotionPayload,
} from '@/types/promotion'
import { del, get, post } from './request'

export const getPromotions = (params?: PromotionQuery) =>
  get<Promotion[]>('/promotions', { params })

export const getPromotion = (id: number) => get<Promotion>(`/promotions/${id}`)

export const createPromotion = (data: CreatePromotionPayload) =>
  post<Promotion>('/promotions/create', data)

export const updatePromotion = (data: UpdatePromotionPayload) =>
  post<Promotion>('/promotions/update', data)

export const updatePromotionStatus = (id: number, status: PromotionStatus) =>
  post<Promotion>('/promotions/update', { id, status })

export const deletePromotion = (id: number) => del<null>(`/promotions/${id}`)
