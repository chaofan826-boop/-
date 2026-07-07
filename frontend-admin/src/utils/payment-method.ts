export type PaymentMethod = 'wechat' | 'alipay' | 'paypal' | 'unionpay'

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  wechat: '微信支付',
  alipay: '支付宝',
  paypal: 'PayPal',
  unionpay: '银联支付',
}

export const PAYMENT_METHOD_OPTIONS = (Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][]).map(
  ([value, label]) => ({ value, label }),
)

export function paymentMethodLabel(method?: PaymentMethod | string | null) {
  if (!method) return '—'
  return PAYMENT_METHOD_LABELS[method as PaymentMethod] || method
}
