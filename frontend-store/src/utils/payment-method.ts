export type PaymentMethod = 'wechat' | 'alipay' | 'paypal' | 'unionpay'

export interface PaymentMethodOption {
  value: PaymentMethod
  label: string
  shortLabel: string
  desc: string
  theme: string
}

export const PAYMENT_METHODS: PaymentMethodOption[] = [
  {
    value: 'wechat',
    label: '微信支付',
    shortLabel: '微信',
    desc: '推荐使用',
    theme: 'wechat',
  },
  {
    value: 'alipay',
    label: '支付宝',
    shortLabel: '支付宝',
    desc: '快捷安全',
    theme: 'alipay',
  },
  {
    value: 'paypal',
    label: 'PayPal',
    shortLabel: 'PayPal',
    desc: '国际支付',
    theme: 'paypal',
  },
  {
    value: 'unionpay',
    label: '银联支付',
    shortLabel: '银联',
    desc: '银行卡支付',
    theme: 'unionpay',
  },
]

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'wechat'

export function paymentMethodLabel(method?: PaymentMethod | string | null) {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label || '—'
}

export function paymentMethodShortLabel(method?: PaymentMethod | string | null) {
  return PAYMENT_METHODS.find((item) => item.value === method)?.shortLabel || '—'
}
