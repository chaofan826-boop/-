export interface LocalizedTitle {
  zh: string
  en: string
}

export interface ProductSpecOption {
  name: string
  values?: string[]
}

export interface ProductSku {
  id: number
  skuCode: string
  color: string | null
  size: string | null
  specValues?: Record<string, string> | null
  prices: Record<string, number>
  stock: number
  imageUrl: string | null
  status: string
}

export interface ProductCategory {
  id: number
  code: string
  name: LocalizedTitle
}

export interface Product {
  id: number
  merchantId: number
  spuCode: string
  title: LocalizedTitle
  description: string | null
  mainImage: string | null
  images: string[] | null
  status: string
  categoryId: number | null
  category?: ProductCategory | null
  salesCount: number
  specOptions?: ProductSpecOption[] | null
  skus: ProductSku[]
  createdAt: string
}

export interface ProductQuery {
  page?: number
  pageSize?: number
  status?: string
  keyword?: string
  categoryId?: number
}

export interface Category {
  id: number
  code: string
  name: LocalizedTitle
  sortOrder: number
  status: string
}

export interface CategoryQuery {
  status?: string
}
