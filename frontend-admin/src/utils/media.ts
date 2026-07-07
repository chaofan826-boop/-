const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'

function getApiOrigin() {
  if (!apiBase.startsWith('http')) return ''
  try {
    return new URL(apiBase).origin
  } catch {
    return ''
  }
}

export function resolveMediaUrl(url: string | null | undefined) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/api/')) {
    const origin = getApiOrigin()
    return origin ? `${origin}${url}` : url
  }
  return url
}

export function isHeroBanner(row: { imageUrl: string }) {
  return row.imageUrl.includes('banner-hero-premium')
}
