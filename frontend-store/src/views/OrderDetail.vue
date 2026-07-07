<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getOrder, payOrder, cancelOrder, deleteOrder, type Order } from '@/api/order'
import OrderStatusBadge from '@/components/OrderStatusBadge.vue'
import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import PendingPayCountdown from '@/components/PendingPayCountdown.vue'
import { trackShipping, type ShippingTrack } from '@/api/shipping'
import { useAppStore } from '@/stores/app'
import { DEFAULT_PAYMENT_METHOD, paymentMethodLabel, type PaymentMethod } from '@/utils/payment-method'
import { canUserDeleteOrder, orderStatusLabel } from '@/utils/order-status'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const paying = ref(false)
const deleting = ref(false)
const cancelling = ref(false)
const paymentMethod = ref<PaymentMethod>(DEFAULT_PAYMENT_METHOD)
const order = ref<Order | null>(null)
const shipping = ref<ShippingTrack | null>(null)

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
  const orderNo = String(route.params.orderNo || '')
  if (!orderNo) return

  loading.value = true
  try {
    order.value = await getOrder(orderNo)
    if (order.value.status === 'shipped' || order.value.status === 'completed') {
      try {
        shipping.value = await trackShipping(orderNo)
      } catch {
        shipping.value = null
      }
    }
  } finally {
    loading.value = false
  }
}

async function handlePay() {
  if (!order.value || order.value.status !== 'pending') return

  try {
    await ElMessageBox.confirm(
      `使用${paymentMethodLabel(paymentMethod.value)}支付 ${appStore.formatPrice(Number(order.value.totalAmount))}？`,
      '确认支付',
      {
        confirmButtonText: '立即支付',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
  } catch {
    return
  }

  paying.value = true
  try {
    order.value = await payOrder(order.value.orderNo, paymentMethod.value)
    ElMessage.success(`已使用${paymentMethodLabel(order.value.paymentMethod)}支付成功`)
  } finally {
    paying.value = false
  }
}

async function handleCancel() {
  if (!order.value || order.value.status !== 'pending') return

  try {
    await ElMessageBox.confirm(
      `确定取消待支付订单 ${order.value.orderNo}？取消后库存将释放。`,
      '取消订单',
      {
        type: 'warning',
        confirmButtonText: '取消订单',
        cancelButtonText: '再想想',
      },
    )
  } catch {
    return
  }

  cancelling.value = true
  try {
    order.value = await cancelOrder(order.value.orderNo)
    ElMessage.success('订单已取消')
  } finally {
    cancelling.value = false
  }
}

async function handlePendingExpired() {
  await loadData()
  if (order.value?.status === 'cancelled') {
    ElMessage.warning('订单支付超时，已自动取消')
  }
}

async function handleDelete() {
  if (!order.value || !canUserDeleteOrder(order.value.status)) return

  try {
    await ElMessageBox.confirm(
      `确定删除${orderStatusLabel(order.value.status)}订单 ${order.value.orderNo}？删除后无法恢复。`,
      '删除订单',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  deleting.value = true
  try {
    await deleteOrder(order.value.orderNo)
    ElMessage.success('订单已删除')
    router.push('/orders')
  } finally {
    deleting.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading" class="order-detail">
    <div class="page-header">
      <el-button link @click="router.push('/orders')">← 返回订单列表</el-button>
      <h2 class="page-title">订单详情 {{ order?.orderNo }}</h2>
    </div>

    <template v-if="order">
      <el-card shadow="never" class="info-card">
        <div class="info-row">
          <span class="label">订单编号</span>
          <span class="order-no">{{ order.orderNo }}</span>
        </div>
        <div class="info-row">
          <span class="label">订单状态</span>
          <OrderStatusBadge :status="order.status" />
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
        <div v-if="order.paymentMethod" class="info-row">
          <span class="label">支付方式</span>
          <span>{{ paymentMethodLabel(order.paymentMethod) }}</span>
        </div>
      </el-card>

      <el-card shadow="never" class="items-card">
        <template #header>商品明细</template>
        <div v-for="item in order.items" :key="item.id" class="order-item">
          <span>{{ item.product?.title?.zh || '商品' }} × {{ item.quantity }}</span>
          <span>{{ appStore.formatPrice(Number(item.price) * item.quantity) }}</span>
        </div>
      </el-card>

      <el-card v-if="order.status === 'pending'" shadow="never" class="action-card">
        <PendingPayCountdown :order="order" @expired="handlePendingExpired" />
        <PaymentMethodPicker v-model="paymentMethod" class="pending-payment-picker" />
        <div class="pay-bar">
          <div class="pay-info">
            <span class="pay-label">待支付金额</span>
            <strong class="pay-amount">{{ appStore.formatPrice(Number(order.totalAmount)) }}</strong>
          </div>
          <div class="pending-actions">
            <el-button size="large" :loading="cancelling" @click="handleCancel">取消订单</el-button>
            <el-button type="primary" size="large" :loading="paying" @click="handlePay">
              立即支付
            </el-button>
          </div>
        </div>
      </el-card>

      <el-card v-if="canUserDeleteOrder(order.status)" shadow="never" class="action-card">
        <div class="delete-bar">
          <p class="delete-tip">此订单已结束，可从列表中删除记录</p>
          <el-button type="danger" plain size="large" :loading="deleting" @click="handleDelete">
            删除订单
          </el-button>
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
.action-card,
.shipping-card {
  margin-bottom: 16px;
  border-radius: var(--cb-radius);
}

.pay-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px dashed var(--cb-border);
}

.pending-payment-picker {
  margin-top: 16px;
}

.pending-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.delete-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.delete-tip {
  margin: 0;
  font-size: 13px;
  color: var(--cb-text-muted);
}

.pay-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pay-label {
  font-size: 12px;
  color: var(--cb-text-muted);
  letter-spacing: 0.08em;
}

.pay-amount {
  font-family: var(--cb-font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--cb-accent);
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

.order-no {
  font-family: var(--cb-font-mono);
  letter-spacing: 0.04em;
  color: var(--cb-text);
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
