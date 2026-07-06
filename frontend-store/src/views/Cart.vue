<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Delete } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const appStore = useAppStore()
const cartStore = useCartStore()

const isEmpty = computed(() => !cartStore.items.length)

function hasDiscount(item: { price: number; originalPrice?: number }) {
  return (item.originalPrice ?? item.price) > item.price
}

function goCheckout() {
  if (isEmpty.value) return
  router.push('/checkout')
}

async function handleRemove(item: { productSkuId: number; title: string }) {
  await ElMessageBox.confirm(`确定从购物车移除「${item.title}」？`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
  })
  cartStore.removeItem(item.productSkuId)
}

onMounted(() => {
  cartStore.refreshPrices(appStore.currency).catch(() => undefined)
})

watch(
  () => appStore.currency,
  (currency) => {
    cartStore.refreshPrices(currency).catch(() => undefined)
  },
)
</script>

<template>
  <div>
    <h2 class="page-title">购物车</h2>

    <div v-if="isEmpty" class="empty-state">
      <p>购物车是空的</p>
      <el-button type="primary" @click="router.push('/')">去逛逛</el-button>
    </div>

    <template v-else>
      <div class="cart-list">
        <div v-for="item in cartStore.items" :key="item.productSkuId" class="cart-item">
          <img :src="item.imageUrl || `https://picsum.photos/seed/${item.productId}/100/100`" class="thumb" />
          <div class="item-info">
            <h3>{{ item.title }}</h3>
            <p class="spec">{{ item.specText || '默认规格' }}</p>
            <p class="price-row">
              <span class="price">{{ appStore.formatPrice(item.price) }}</span>
              <span v-if="hasDiscount(item)" class="orig-price">
                {{ appStore.formatPrice(item.originalPrice ?? item.price) }}
              </span>
            </p>
          </div>
          <div class="item-actions">
            <el-input-number
              :model-value="item.quantity"
              :min="1"
              :max="item.stock"
              size="small"
              @change="(v: number) => cartStore.updateQuantity(item.productSkuId, v)"
            />
            <el-button :icon="Delete" link type="danger" @click="handleRemove(item)">
              删除
            </el-button>
          </div>
          <div class="subtotal">{{ appStore.formatPrice(item.price * item.quantity) }}</div>
        </div>
      </div>

      <div class="cart-footer">
        <div class="total">
          合计：<span>{{ appStore.formatPrice(cartStore.total) }}</span>
        </div>
        <el-button type="primary" size="large" @click="goCheckout">去结算</el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cart-list {
  background: var(--cb-surface);
  backdrop-filter: blur(12px);
  border-radius: var(--cb-radius-lg);
  overflow: hidden;
  border: 1px solid var(--cb-border);
}

.cart-item {
  display: grid;
  grid-template-columns: 80px 1fr auto auto;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.08);
  transition: background 0.2s;
}

.cart-item:hover {
  background: rgba(201, 169, 98, 0.04);
}

.cart-item:last-child {
  border-bottom: none;
}

.thumb {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid var(--cb-border);
}

.item-info h3 {
  font-size: 15px;
  margin-bottom: 4px;
  color: var(--cb-text);
}

.spec {
  font-family: var(--cb-font-mono);
  font-size: 12px;
  color: var(--cb-text-muted);
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-top: 4px;
}

.price {
  font-family: var(--cb-font-display);
  color: var(--cb-neon-cyan);
  font-weight: 600;
}

.orig-price {
  font-size: 12px;
  color: var(--cb-text-muted);
  text-decoration: line-through;
}

.item-actions {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.subtotal {
  font-family: var(--cb-font-display);
  font-weight: 700;
  font-size: 16px;
  min-width: 80px;
  text-align: right;
  color: var(--cb-neon-cyan);
}

.cart-footer {
  margin-top: 20px;
  background: var(--cb-surface);
  backdrop-filter: blur(12px);
  border-radius: var(--cb-radius-lg);
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid var(--cb-border);
  flex-wrap: wrap;
  gap: 16px;
  box-shadow: var(--cb-glow-cyan);
}

.total span {
  font-family: var(--cb-font-display);
  color: var(--cb-neon-cyan);
  font-size: 26px;
  font-weight: 700;
  text-shadow: 0 0 16px rgba(201, 169, 98, 0.4);
}

@media (max-width: 768px) {
  .cart-item {
    grid-template-columns: 64px 1fr;
    grid-template-rows: auto auto;
  }

  .item-actions,
  .subtotal {
    grid-column: 2;
  }

  .subtotal {
    text-align: left;
  }

  .cart-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .cart-footer .el-button {
    width: 100%;
  }
}
</style>
