export interface LocalizedTitle {
  zh: string
  en: string
}

export type BannerStatus = 'active' | 'inactive'

export interface Banner {
  id: number
  title: LocalizedTitle | null
  imageUrl: string
  linkUrl: string | null
  sortOrder: number
  status: BannerStatus
  createdAt: string
  updatedAt: string
}

export interface BannerQuery {
  status?: BannerStatus
}

export interface CreateBannerPayload {
  title?: LocalizedTitle | null
  imageUrl: string
  linkUrl?: string | null
  sortOrder?: number
  status?: BannerStatus
}

export interface UpdateBannerPayload extends CreateBannerPayload {
  id: number
}
