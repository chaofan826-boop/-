const THEME_IMAGES: Record<string, string> = {
  'SPU-WATCH-001': '/products/spu-watch-001.svg',
  'SPU-EAR-001': '/products/spu-ear-001.svg',
  'SPU-SPEAKER-001': '/products/spu-speaker-001.svg',
  'SPU-POWER-001': '/products/spu-power-001.svg',
  'SPU-CABLE-001': '/products/spu-cable-001.svg',
  'SPU-CASE-001': '/products/spu-case-001.svg',
}

const FALLBACK_IMAGES = [
  '/products/spu-watch-001.svg',
  '/products/spu-ear-001.svg',
  '/products/spu-speaker-001.svg',
  '/products/spu-power-001.svg',
]

const UNRELIABLE_IMAGE = /picsum\.photos|images\.unsplash\.com/i

type ProductImageSource = {
  id: number
  spuCode?: string
  mainImage: string | null
}

export function resolveProductImage(product: ProductImageSource, index = 0): string {
  const mainImage = product.mainImage?.trim()

  if (mainImage?.startsWith('/api/')) {
    return mainImage
  }

  if (product.spuCode && THEME_IMAGES[product.spuCode]) {
    if (!mainImage || UNRELIABLE_IMAGE.test(mainImage)) {
      return THEME_IMAGES[product.spuCode]
    }
  }

  if (mainImage && !UNRELIABLE_IMAGE.test(mainImage)) {
    return mainImage
  }

  if (product.spuCode && THEME_IMAGES[product.spuCode]) {
    return THEME_IMAGES[product.spuCode]
  }

  return FALLBACK_IMAGES[index % FALLBACK_IMAGES.length] || '/products/spu-default.svg'
}

export function resolveProductImageBySpu(spuCode: string): string {
  return THEME_IMAGES[spuCode] || '/products/spu-default.svg'
}
