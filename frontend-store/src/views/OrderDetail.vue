<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getOrder, type Order } from '@/api/order'
import { trackShipping, type ShippingTrack } from '@/api/shipping'
import { useAppStore } from '@/stores/app'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const order = ref<Order | null>(null)
const shipping = ref<ShippingTrack | null>(null)

const statusMap: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
}

const shippingStatusMap: Record<string, string> = {
  in_transit: '运输中',
  delivered: '已签收',
}

const eventStatusMap: Record<string, string> = {
  picked_up: '已揽收',
  in_transit: '运输中',
  out_for_delivery: '派送中',
  delivered: '已签收',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString()
}

async function loadData() {
  const id = Number(route.params.id)
  if (!id) return

  loading.value = true
  try {
    order.value = await getOrder(id)
    if (order.value.status === 'shipped' || order.value.status === 'completed') {
      try {
        shipping.value = await trackShipping(id)
      } catch {
        shipping.value = null
      }
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading" class="order-detail">
    <div class="page-header">
      <el-button link @click="router.push('/user')">← 返回订单列表</el-button>
      <h2 class="page-title">订单详情 #{{ order?.id }}</h2>
    </div>

    <template v-if="order">
      <el-card shadow="never" class="info-card">
        <div class="info-row">
          <span class="label">订单状态</span>
          <el-tag>{{ statusMap[order.status] || order.status }}</el-tag>
        </div>
        <div class="info-row">
          <span class="label">下单时间</span>
          <span>{{ formatTime(order.createdAt) }}</span>
        </div>
        <div class="info-row">
          <span class="label">收货地址</span>
          <span>{{ order.shippingAddress }}</span>
        </div>
        <div class="info-row">
          <span class="label">订单金额</span>
          <span class="amount">{{ appStore.formatPrice(Number(order.totalAmount)) }}</span>
        </div>
      </el-card>

      <el-card shadow="never" class="items-card">
        <template #header>商品明细</template>
        <div v-for="item in order.items" :key="item.id" class="order-item">
          <span>{{ item.product?.title?.zh || '商品' }} × {{ item.quantity }}</span>
          <span>{{ appStore.formatPrice(Number(item.price) * item.quantity) }}</span>
        </div>
      </el-card>

      <el-card v-if="shipping" shadow="never" class="shipping-card">
        <template #header>
          <div class="shipping-header">
            <span>物流信息</span>
            <el-tag type="primary" size="small">
              {{ shippingStatusMap[shipping.status] || shipping.status }}
            </el-tag>
          </div>
        </template>

        <div class="shipping-meta">
          <div class="meta-item">
            <span class="meta-label">物流公司</span>
            <span>{{ shipping.carrier }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">运单号</span>
            <span class="tracking-no">{{ shipping.trackingNumber }}</span>
          </div>
          <div v-if="shipping.shippedAt" class="meta-item">
            <span class="meta-label">发货时间</span>
            <span>{{ formatTime(shipping.shippedAt) }}</span>
          </div>
        </div>

        <p class="timeline-label">物流轨迹</p>
        <el-timeline>
          <el-timeline-item
            v-for="(event, index) in shipping.events"
            :key="index"
            :timestamp="formatTime(event.time)"
            :type="index === 0 ? 'primary' : undefined"
            placement="top"
          >
            <div class="event-card">
              <p class="event-desc">{{ event.description }}</p>
              <p class="event-meta">
                <span>{{ event.location }}</span>
                <el-tag size="small" effect="plain">
                  {{ eventStatusMap[event.status] || event.status }}
                </el-tag>
              </p>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-card>

      <el-card v-else-if="order.status === 'paid'" shadow="never" class="shipping-card">
        <el-empty description="商家尚未发货，请耐心等待" />
      </el-card>
    </template>
  </div>
</template>

<style scoped>
.order-detail {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 8px 0 0;
  font-family: var(--cb-font-display);
  font-size: 22px;
  letter-spacing: 0.04em;
}

.info-card,
.items-card,
.shipping-card {
  margin-bottom: 16px;
  border-radius: var(--cb-radius);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid var(--cb-border);
}

.info-row:last-child {
  border-bottom: none;
}

.label {
  color: var(--cb-text-muted);
  font-size: 14px;
}

.amount {
  font-family: var(--cb-font-display);
  color: var(--cb-neon-cyan);
  font-weight: 700;
}

.order-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;
  color: var(--cb-text-dim);
}

.shipping-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.shipping-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(201, 169, 98, 0.04);
  border: 1px solid var(--cb-border);
  border-radius: 8px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.meta-label {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.tracking-no {
  font-family: var(--cb-font-mono);
  letter-spacing: 0.06em;
  color: var(--cb-neon-cyan);
}

.timeline-label {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-neon-cyan);
  opacity: 0.6;
  margin-bottom: 16px;
}

.event-card {
  padding: 4px 0;
}

.event-desc {
  margin: 0 0 6px;
  font-weight: 600;
  color: var(--cb-text);
}

.event-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
  font-size: 13px;
  color: var(--cb-text-muted);
}
</style>
