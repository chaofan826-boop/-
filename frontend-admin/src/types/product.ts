export interface LocalizedTitle {
  zh: string
  en: string
}

export type ProductStatus = 'draft' | 'active' | 'inactive'

export interface ProductCategory {
  id: number
  code: string
  name: LocalizedTitle
}

export interface ProductSku {
  id?: number
  skuCode: string
  color?: string
  size?: string
  prices: Record<string, number>
  stock: number
  imageUrl?: string
  status?: 'active' | 'inactive'
}

export interface Product {
  id: number
  merchantId: number
  spuCode: string
  title: LocalizedTitle
  description: string | null
  mainImage: string | null
  images?: string[] | null
  status: ProductStatus
  categoryId: number | null
  category?: ProductCategory | null
  salesCount: number
  skus: ProductSku[]
  createdAt: string
  updatedAt: string
}

export interface CreateProductPayload {
  merchantId: number
  spuCode: string
  title: LocalizedTitle
  description?: string
  mainImage?: string | null
  images?: string[] | null
  status?: ProductStatus
  categoryId?: number | null
  salesCount?: number
  skus: ProductSku[]
}

export interface UpdateProductPayload {
  id: number
  merchantId?: number
  spuCode?: string
  title?: LocalizedTitle
  description?: string
  mainImage?: string | null
  images?: string[] | null
  status?: ProductStatus
  categoryId?: number | null
  salesCount?: number
  skus?: ProductSku[]
}

export interface ProductQuery {
  page?: number
  pageSize?: number
  merchantId?: number
  status?: ProductStatus
  keyword?: string
  categoryId?: number
}
