import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { CartItem } from './cart'

export const useCheckoutStore = defineStore('checkout', () => {
  const buyNowItem = ref<CartItem | null>(null)

  const isBuyNowMode = computed(() => !!buyNowItem.value)

  function setBuyNowItem(item: CartItem) {
    buyNowItem.value = item
  }

  function clearBuyNow() {
    buyNowItem.value = null
  }

  return {
    buyNowItem,
    isBuyNowMode,
    setBuyNowItem,
    clearBuyNow,
  }
})
