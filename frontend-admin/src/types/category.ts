export interface LocalizedName {
  zh: string
  en: string
}

export type CategoryStatus = 'active' | 'inactive'

export interface Category {
  id: number
  code: string
  name: LocalizedName
  sortOrder: number
  status: CategoryStatus
  createdAt: string
  updatedAt: string
}

export interface CreateCategoryPayload {
  code: string
  name: LocalizedName
  sortOrder?: number
  status?: CategoryStatus
}

export interface UpdateCategoryPayload {
  id: number
  code?: string
  name?: LocalizedName
  sortOrder?: number
  status?: CategoryStatus
}

export interface CategoryQuery {
  status?: CategoryStatus
}
