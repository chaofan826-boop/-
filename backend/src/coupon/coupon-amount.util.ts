import { CouponAmounts } from './entities/coupon.entity';

export type CouponCurrency = 'USD' | 'CNY';

export function normalizeCouponCurrency(currency?: string | null): CouponCurrency {
  return currency?.toUpperCase() === 'CNY' ? 'CNY' : 'USD';
}

export function resolveCouponAmount(
  amounts: CouponAmounts | null | undefined,
  currency: CouponCurrency,
): number {
  if (!amounts) return 0;
  const value = amounts[currency];
  if (value != null) return Number(value);
  return 0;
}

export function couponCurrencyLabel(currency: CouponCurrency) {
  return currency === 'CNY' ? '¥' : '$';
}
