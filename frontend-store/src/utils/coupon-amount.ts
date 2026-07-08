export type CouponCurrency = 'USD' | 'CNY'

export interface CouponAmounts {
  USD?: number
  CNY?: number
}

export function resolveCouponAmount(
  amounts: CouponAmounts | null | undefined,
  currency: CouponCurrency,
) {
  if (!amounts) return 0
  return Number(amounts[currency] ?? 0)
}

export function formatCouponAmount(amount: number, currency: CouponCurrency) {
  return currency === 'CNY' ? `¥${amount.toFixed(2)}` : `$${amount.toFixed(2)}`
}

export function formatCouponRule(
  coupon: { discountAmounts: CouponAmounts; minOrderAmounts?: CouponAmounts | null },
  currency: CouponCurrency,
) {
  const min = resolveCouponAmount(coupon.minOrderAmounts, currency)
  const discount = resolveCouponAmount(coupon.discountAmounts, currency)
  return `满 ${formatCouponAmount(min, currency)} 减 ${formatCouponAmount(discount, currency)}`
}

export function formatCouponCategoryNames(
  categoryIds: number[] | null | undefined,
  categoryMap: Map<number, { zh: string; en: string }>,
  locale: 'zh' | 'en',
) {
  if (!categoryIds?.length) {
    return locale === 'zh' ? ['全品类'] : ['All categories']
  }

  const names = categoryIds
    .map((id) => categoryMap.get(id))
    .filter((name): name is { zh: string; en: string } => !!name)
    .map((name) => (locale === 'zh' ? name.zh : name.en))

  if (!names.length) {
    return locale === 'zh' ? ['指定品类'] : ['Selected categories']
  }

  return names
}
