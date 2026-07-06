export interface LocalizedTitle {
  zh: string
  en: string
}

export interface Banner {
  id: number
  title: LocalizedTitle | null
  imageUrl: string
  linkUrl: string | null
  sortOrder: number
  status: string
}

export interface BannerQuery {
  status?: string
}
