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

  function loadSelectedIds(cartItems: CartItem[]) {
    const itemIds = cartItems.map((i) => i.productSkuId)
    const stored = localStorage.getItem('cart-selected')
    if (stored === null) return itemIds
    return (JSON.parse(stored) as number[]).filter((id) => itemIds.includes(id))
  }

  const selectedSkuIds = ref<number[]>(loadSelectedIds(items.value))

  const count = computed(() => items.value.reduce((sum, i) => sum + i.quantity, 0))

  const total = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
  )

  const selectedItems = computed(() =>
    items.value.filter((item) => selectedSkuIds.value.includes(item.productSkuId)),
  )

  const selectedCount = computed(() =>
    selectedItems.value.reduce((sum, item) => sum + item.quantity, 0),
  )

  const selectedTotal = computed(() =>
    selectedItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
  )

  const isAllSelected = computed(
    () => items.value.length > 0 && selectedSkuIds.value.length === items.value.length,
  )

  const isIndeterminate = computed(
    () => selectedSkuIds.value.length > 0 && selectedSkuIds.value.length < items.value.length,
  )

  function save() {
    localStorage.setItem('cart', JSON.stringify(items.value))
  }

  function saveSelected() {
    localStorage.setItem('cart-selected', JSON.stringify(selectedSkuIds.value))
  }

  function isSelected(skuId: number) {
    return selectedSkuIds.value.includes(skuId)
  }

  function toggleSelect(skuId: number, checked: boolean) {
    if (checked) {
      if (!selectedSkuIds.value.includes(skuId)) {
        selectedSkuIds.value = [...selectedSkuIds.value, skuId]
      }
    } else {
      selectedSkuIds.value = selectedSkuIds.value.filter((id) => id !== skuId)
    }
    saveSelected()
  }

  function toggleSelectAll(checked: boolean) {
    selectedSkuIds.value = checked ? items.value.map((item) => item.productSkuId) : []
    saveSelected()
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
      if (!selectedSkuIds.value.includes(normalized.productSkuId)) {
        selectedSkuIds.value = [...selectedSkuIds.value, normalized.productSkuId]
        saveSelected()
      }
    } else {
      items.value.push(normalized)
      selectedSkuIds.value = [...selectedSkuIds.value, normalized.productSkuId]
      saveSelected()
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
    selectedSkuIds.value = selectedSkuIds.value.filter((id) => id !== skuId)
    save()
    saveSelected()
  }

  function removeSelectedItems() {
    const selected = new Set(selectedSkuIds.value)
    items.value = items.value.filter((item) => !selected.has(item.productSkuId))
    selectedSkuIds.value = []
    save()
    saveSelected()
  }

  function clear() {
    items.value = []
    selectedSkuIds.value = []
    save()
    saveSelected()
  }

  return {
    items,
    selectedSkuIds,
    count,
    total,
    selectedItems,
    selectedCount,
    selectedTotal,
    isAllSelected,
    isIndeterminate,
    isSelected,
    toggleSelect,
    toggleSelectAll,
    addItem,
    refreshPrices,
    updateQuantity,
    removeItem,
    removeSelectedItems,
    clear,
  }
})
