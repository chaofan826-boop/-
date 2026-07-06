<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getOrders, type Order } from '@/api/order'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const orders = ref<Order[]>([])
const statusFilter = ref('all')

const statusMap: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
}

const statusOptions = [
  { label: '全部', value: 'all' },
  { label: '待支付', value: 'pending' },
  { label: '已支付', value: 'paid' },
  { label: '已发货', value: 'shipped' },
  { label: '已完成', value: 'completed' },
  { label: '已取消', value: 'cancelled' },
]

const filteredOrders = computed(() => {
  if (statusFilter.value === 'all') return orders.value
  return orders.value.filter((order) => order.status === statusFilter.value)
})

function productImage(order: Order) {
  const item = order.items[0]
  if (item?.product?.mainImage) return item.product.mainImage
  const productId = item?.productId
  return productId ? `https://picsum.photos/seed/p${productId}/120/120` : ''
}

function itemSummary(order: Order) {
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const firstTitle = order.items[0]?.product?.title?.zh || '商品'
  if (order.items.length <= 1) return `${firstTitle} × ${count}`
  return `${firstTitle} 等 ${order.items.length} 件商品 · 共 ${count} 件`
}

async function loadOrders() {
  loading.value = true
  try {
    orders.value = await getOrders()
  } finally {
    loading.value = false
  }
}

onMounted(loadOrders)
</script>

<template>
  <div class="my-orders">
    <div class="page-header">
      <div>
        <p class="page-tag">MY ORDERS</p>
        <h2 class="page-title">我的订单</h2>
      </div>
      <el-button link @click="router.push('/user')">用户中心 →</el-button>
    </div>

    <div class="filter-bar">
      <el-radio-group v-model="statusFilter" size="small" class="status-filter">
        <el-radio-button v-for="item in statusOptions" :key="item.value" :value="item.value">
          {{ item.label }}
        </el-radio-button>
      </el-radio-group>
    </div>

    <div v-loading="loading" class="orders-list">
      <div v-if="!filteredOrders.length && !loading" class="empty-state">
        <p>{{ statusFilter === 'all' ? '暂无订单' : '该状态下暂无订单' }}</p>
        <el-button type="primary" @click="router.push('/')">去购物</el-button>
      </div>

      <div
        v-for="order in filteredOrders"
        :key="order.id"
        class="order-card"
        @click="router.push(`/orders/${order.id}`)"
      >
        <div class="order-header">
          <div class="order-meta">
            <span class="order-no">订单 #{{ order.id }}</span>
            <span class="order-time">{{ new Date(order.createdAt).toLocaleString() }}</span>
          </div>
          <el-tag size="small" :type="order.status === 'cancelled' ? 'info' : undefined">
            {{ statusMap[order.status] || order.status }}
          </el-tag>
        </div>

        <div class="order-body">
          <div class="order-thumb">
            <img v-if="productImage(order)" :src="productImage(order)" alt="" loading="lazy" />
          </div>
          <div class="order-info">
            <p class="order-summary">{{ itemSummary(order) }}</p>
            <div class="order-items-preview">
              <span v-for="item in order.items.slice(0, 3)" :key="item.id" class="item-chip">
                {{ item.product?.title?.zh || '商品' }} × {{ item.quantity }}
              </span>
              <span v-if="order.items.length > 3" class="item-more">+{{ order.items.length - 3 }}</span>
            </div>
          </div>
          <div class="order-amount">
            <span class="amount-label">合计</span>
            <span class="amount-value">{{ appStore.formatPrice(Number(order.totalAmount)) }}</span>
          </div>
        </div>

        <div class="order-footer">
          <span class="view-detail">查看详情 →</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.my-orders {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.page-tag {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-accent);
  opacity: 0.7;
  margin-bottom: 8px;
}

.page-title {
  font-family: var(--cb-font-display);
  font-size: 28px;
  letter-spacing: 0.06em;
  margin: 0;
  color: var(--cb-text);
}

.filter-bar {
  margin-bottom: 20px;
  padding: 16px;
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-surface);
}

.status-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.orders-list {
  min-height: 240px;
}

.empty-state {
  text-align: center;
  padding: 64px 20px;
  color: var(--cb-text-muted);
}

.empty-state p {
  margin-bottom: 16px;
}

.order-card {
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius-lg);
  padding: 18px 20px;
  margin-bottom: 14px;
  background: var(--cb-surface);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.order-card:hover {
  border-color: var(--cb-border-hover);
  box-shadow: var(--cb-glow-cyan);
  transform: translateY(-2px);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}

.order-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-no {
  font-weight: 700;
  color: var(--cb-text);
}

.order-time {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.order-body {
  display: flex;
  align-items: center;
  gap: 16px;
}

.order-thumb {
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--cb-border);
  background: rgba(201, 169, 98, 0.06);
  flex-shrink: 0;
}

.order-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.order-info {
  flex: 1;
  min-width: 0;
}

.order-summary {
  margin: 0 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: var(--cb-text);
}

.order-items-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.item-chip {
  font-size: 12px;
  color: var(--cb-text-dim);
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(201, 169, 98, 0.08);
}

.item-more {
  font-size: 12px;
  color: var(--cb-accent);
}

.order-amount {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
}

.amount-label {
  font-size: 11px;
  color: var(--cb-text-muted);
  letter-spacing: 0.08em;
}

.amount-value {
  font-family: var(--cb-font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--cb-accent);
}

.order-footer {
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px dashed var(--cb-border);
  text-align: right;
}

.view-detail {
  font-size: 13px;
  color: var(--cb-accent);
}

@media (max-width: 768px) {
  .order-body {
    flex-wrap: wrap;
  }

  .order-amount {
    width: 100%;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-top: 4px;
  }

  .status-filter :deep(.el-radio-button__inner) {
    padding: 8px 10px;
  }
}
</style>
