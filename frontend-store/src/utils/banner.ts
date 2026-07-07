export const HERO_BANNER_IMAGE = '/api/uploads/banners/banner-hero-premium.svg'

export function isHeroBanner(banner: { imageUrl: string }) {
  return banner.imageUrl.includes('banner-hero-premium')
}
