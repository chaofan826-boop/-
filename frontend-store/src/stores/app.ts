import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Currency = 'USD' | 'CNY'

export const useAppStore = defineStore('app', () => {
  const currency = ref<Currency>((localStorage.getItem('currency') as Currency) || 'USD')
  const locale = ref<'zh' | 'en'>('zh')

  function setCurrency(c: Currency) {
    currency.value = c
    localStorage.setItem('currency', c)
  }

  function formatPrice(amount: number) {
    return currency.value === 'CNY' ? `¥${amount.toFixed(2)}` : `$${amount.toFixed(2)}`
  }

  return { currency, locale, setCurrency, formatPrice }
})
