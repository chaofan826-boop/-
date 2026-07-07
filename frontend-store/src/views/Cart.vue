<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Delete, DeleteFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAppStore } from '@/stores/app'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const appStore = useAppStore()
const cartStore = useCartStore()

const clearing = ref(false)

const isEmpty = computed(() => !cartStore.items.length)
const hasSelection = computed(() => cartStore.selectedCount > 0)

const itemCountLabel = computed(() => {
  const skuCount = cartStore.items.length
  const total = cartStore.count
  if (skuCount <= 1) return `共 ${total} 件商品`
  return `共 ${skuCount} 款 ${total} 件商品`
})

const selectedCountLabel = computed(() => {
  const count = cartStore.selectedCount
  return count > 0 ? `已选 ${count} 件` : '未选择商品'
})

function hasDiscount(item: { price: number; originalPrice?: number }) {
  return (item.originalPrice ?? item.price) > item.price
}

function goCheckout() {
  if (!hasSelection.value) {
    ElMessage.warning('请先选择要结算的商品')
    return
  }
  router.push('/checkout')
}

function handleSelectAll(checked: boolean | string | number) {
  cartStore.toggleSelectAll(Boolean(checked))
}

function handleItemSelect(skuId: number, checked: boolean | string | number) {
  cartStore.toggleSelect(skuId, Boolean(checked))
}

function toggleItemSelect(skuId: number) {
  cartStore.toggleSelect(skuId, !cartStore.isSelected(skuId))
}

function goProduct(item: { productId: number }) {
  router.push(`/products/${item.productId}`)
}

async function handleRemove(item: { productSkuId: number; title: string }) {
  try {
    await ElMessageBox.confirm(`确定从购物车移除「${item.title}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  cartStore.removeItem(item.productSkuId)
}

async function handleClearAll() {
  if (isEmpty.value) return
  const total = cartStore.count
  try {
    await ElMessageBox.confirm(
      `确定清空购物车中的全部 ${total} 件商品？清空后无法恢复。`,
      '清空购物车',
      {
        type: 'warning',
        confirmButtonText: '确认清空',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
        distinguishCancelAndClose: true,
      },
    )
  } catch {
    return
  }

  clearing.value = true
  try {
    cartStore.clear()
    ElMessage.success('购物车已清空')
  } finally {
    clearing.value = false
  }
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
      <div class="list-toolbar">
        <div class="toolbar-left">
          <el-checkbox
            :model-value="cartStore.isAllSelected"
            :indeterminate="cartStore.isIndeterminate"
            @change="handleSelectAll"
          >
            全选
          </el-checkbox>
          <span class="toolbar-count">{{ itemCountLabel }} · {{ selectedCountLabel }}</span>
        </div>
        <button
          type="button"
          class="clear-all-btn"
          :disabled="clearing"
          @click="handleClearAll"
        >
          <el-icon :class="{ 'is-loading': clearing }"><DeleteFilled /></el-icon>
          <span>{{ clearing ? '清空中...' : '清空购物车' }}</span>
        </button>
      </div>

      <div class="cart-list">
        <div
          v-for="item in cartStore.items"
          :key="item.productSkuId"
          class="cart-item"
          :class="{ selected: cartStore.isSelected(item.productSkuId) }"
          @click="toggleItemSelect(item.productSkuId)"
        >
          <el-checkbox
            class="item-checkbox"
            :model-value="cartStore.isSelected(item.productSkuId)"
            @change="(checked) => handleItemSelect(item.productSkuId, checked)"
            @click.stop
          />
          <img
            :src="item.imageUrl || `https://picsum.photos/seed/${item.productId}/100/100`"
            class="thumb"
            :alt="item.title"
            @click.stop="goProduct(item)"
          />
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
          <div class="item-actions" @click.stop>
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
        <div class="footer-left">
          <el-checkbox
            :model-value="cartStore.isAllSelected"
            :indeterminate="cartStore.isIndeterminate"
            @change="handleSelectAll"
          >
            全选
          </el-checkbox>
          <div class="total">
            合计：<span>{{ appStore.formatPrice(cartStore.selectedTotal) }}</span>
            <span v-if="hasSelection" class="selected-hint">（{{ cartStore.selectedCount }} 件）</span>
          </div>
        </div>
        <el-button type="primary" size="large" :disabled="!hasSelection" @click="goCheckout">
          去结算{{ hasSelection ? `(${cartStore.selectedCount})` : '' }}
        </el-button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-surface);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  min-width: 0;
}

.toolbar-count {
  font-size: 13px;
  color: var(--cb-text-muted);
  letter-spacing: 0.02em;
}

.clear-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.06);
  color: #f87171;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.clear-all-btn:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.12);
  border-color: #f87171;
  box-shadow: 0 0 12px rgba(248, 113, 113, 0.18);
}

.clear-all-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.clear-all-btn .el-icon {
  font-size: 14px;
}

.clear-all-btn .el-icon.is-loading {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.cart-list {
  background: var(--cb-surface);
  backdrop-filter: blur(12px);
  border-radius: var(--cb-radius-lg);
  overflow: hidden;
  border: 1px solid var(--cb-border);
}

.cart-item {
  display: grid;
  grid-template-columns: auto 80px 1fr auto auto;
  gap: 16px;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.08);
  transition: background 0.2s, opacity 0.2s;
  cursor: pointer;
}

.cart-item:not(.selected) {
  opacity: 0.72;
}

.item-checkbox {
  align-self: center;
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
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.thumb:hover {
  border-color: var(--cb-border-hover);
  box-shadow: var(--cb-glow-cyan);
  transform: scale(1.03);
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
  cursor: default;
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

.footer-left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.selected-hint {
  margin-left: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--cb-text-muted);
}

.total span {
  font-family: var(--cb-font-display);
  color: var(--cb-neon-cyan);
  font-size: 26px;
  font-weight: 700;
  text-shadow: 0 0 16px rgba(201, 169, 98, 0.4);
}

@media (max-width: 768px) {
  .list-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .clear-all-btn {
    justify-content: center;
    width: 100%;
  }

  .cart-item {
    grid-template-columns: auto 64px 1fr;
    grid-template-rows: auto auto;
  }

  .item-checkbox {
    grid-row: 1 / span 2;
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

  .footer-left {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .cart-footer .el-button {
    width: 100%;
  }
}
</style>
