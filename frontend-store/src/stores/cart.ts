import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { quoteProductPricing } from '@/api/promotion'

export interface CartItem {
  productId: number
  productSkuId: number
  title: string
  specText: string
  imageUrl: string
  price: number
  originalPrice: number
  currency: string
  quantity: number
  stock: number
}

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>(JSON.parse(localStorage.getItem('cart') || '[]'))

  const count = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))

  const total = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
  )

  function save() {
    localStorage.setItem('cart', JSON.stringify(items.value))
  }

  function addItem(item: CartItem) {
    const normalized = {
      ...item,
      originalPrice: item.originalPrice ?? item.price,
    }
    const existing = items.value.find((i) => i.productSkuId === normalized.productSkuId)
    if (existing) {
      existing.quantity = Math.min(existing.quantity + normalized.quantity, normalized.stock)
      existing.price = normalized.price
      existing.originalPrice = normalized.originalPrice
      existing.currency = normalized.currency
    } else {
      items.value.push(normalized)
    }
    save()
  }

  async function refreshPrices(currency: string) {
    if (!items.value.length) return

    const rows = await quoteProductPricing(
      items.value.map((item) => ({
        productId: item.productId,
        productSkuId: item.productSkuId,
      })),
      currency,
    )
    const pricingMap = new Map(rows.map((row) => [row.productSkuId, row]))

    for (const item of items.value) {
      const pricing = pricingMap.get(item.productSkuId)
      if (!pricing) continue
      item.originalPrice = pricing.originalPrice
      item.price = pricing.salePrice
      item.currency = currency
    }
    save()
  }

  function updateQuantity(skuId: number, quantity: number) {
    const item = items.value.find((i) => i.productSkuId === skuId)
    if (!item) return
    item.quantity = Math.max(1, Math.min(quantity, item.stock))
    save()
  }

  function removeItem(skuId: number) {
    items.value = items.value.filter((i) => i.productSkuId !== skuId)
    save()
  }

  function clear() {
    items.value = []
    save()
  }

  return { items, count, total, addItem, refreshPrices, updateQuantity, removeItem, clear }
})
