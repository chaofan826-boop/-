<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getApplicableCoupons, type UserCoupon } from '@/api/coupon'
import { getOrders, payOrder, cancelOrder, deleteOrder, type Order } from '@/api/order'
import CouponPicker from '@/components/CouponPicker.vue'
import OrderStatusBadge from '@/components/OrderStatusBadge.vue'
import PaymentMethodPicker from '@/components/PaymentMethodPicker.vue'
import PendingPayCountdown from '@/components/PendingPayCountdown.vue'
import { useAppStore } from '@/stores/app'
import { orderStatusClass, orderStatusLabel, canUserDeleteOrder } from '@/utils/order-status'
import type { CouponCurrency } from '@/utils/coupon-amount'
import { DEFAULT_PAYMENT_METHOD, paymentMethodLabel, type PaymentMethod } from '@/utils/payment-method'

const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const payingOrderNo = ref('')
const deletingOrderNo = ref('')
const cancellingOrderNo = ref('')
const payDialogVisible = ref(false)
const payTarget = ref<Order | null>(null)
const paymentMethod = ref<PaymentMethod>(DEFAULT_PAYMENT_METHOD)
const selectedUserCouponId = ref<number | null>(null)
const couponOptions = ref<UserCoupon[]>([])
const couponsLoading = ref(false)
const orders = ref<Order[]>([])
const statusFilter = ref('all')

const selectedCoupon = computed(() => {
  const picked = couponOptions.value.find((item) => item.id === selectedUserCouponId.value)
  if (!picked || picked.applicable === false) return null
  return picked
})

const payAmount = computed(() => {
  if (!payTarget.value) return 0
  const discount = selectedCoupon.value?.discountPreview ?? 0
  return Math.max(0, Number(payTarget.value.totalAmount) - discount)
})

const payCurrency = computed<CouponCurrency>(() =>
  payTarget.value?.currency === 'CNY' ? 'CNY' : 'USD',
)

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

const statusCounts = computed(() => {
  const counts: Record<string, number> = { all: orders.value.length }
  for (const order of orders.value) {
    counts[order.status] = (counts[order.status] || 0) + 1
  }
  return counts
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

async function handlePay(order: Order, event?: Event) {
  event?.stopPropagation()
  payTarget.value = order
  paymentMethod.value = DEFAULT_PAYMENT_METHOD
  selectedUserCouponId.value = null
  payDialogVisible.value = true
  couponsLoading.value = true
  try {
    couponOptions.value = await getApplicableCoupons(order.orderNo)
  } finally {
    couponsLoading.value = false
  }
}

async function confirmPay() {
  if (!payTarget.value) return

  payingOrderNo.value = payTarget.value.orderNo
  try {
    const updated = await payOrder(
      payTarget.value.orderNo,
      paymentMethod.value,
      selectedUserCouponId.value,
    )
    const index = orders.value.findIndex((item) => item.orderNo === payTarget.value?.orderNo)
    if (index >= 0) {
      orders.value[index] = updated
    }
    payDialogVisible.value = false
    payTarget.value = null
    ElMessage.success(`已使用${paymentMethodLabel(updated.paymentMethod)}支付成功`)
  } finally {
    payingOrderNo.value = ''
  }
}

async function handleCancel(order: Order, event?: Event) {
  event?.stopPropagation()

  try {
    await ElMessageBox.confirm(
      `确定取消待支付订单 ${order.orderNo}？取消后库存将释放。`,
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

  cancellingOrderNo.value = order.orderNo
  try {
    const updated = await cancelOrder(order.orderNo)
    const index = orders.value.findIndex((item) => item.orderNo === order.orderNo)
    if (index >= 0) {
      orders.value[index] = updated
    }
    ElMessage.success('订单已取消')
  } finally {
    cancellingOrderNo.value = ''
  }
}

async function handlePendingExpired(orderNo: string) {
  await loadOrders()
  if (orders.value.every((item) => item.orderNo !== orderNo || item.status !== 'pending')) {
    ElMessage.warning('订单支付超时，已自动取消')
  }
}

async function handleDelete(order: Order, event?: Event) {
  event?.stopPropagation()

  try {
    await ElMessageBox.confirm(
      `确定删除${orderStatusLabel(order.status)}订单 ${order.orderNo}？删除后无法恢复。`,
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

  deletingOrderNo.value = order.orderNo
  try {
    await deleteOrder(order.orderNo)
    orders.value = orders.value.filter((item) => item.orderNo !== order.orderNo)
    ElMessage.success('订单已删除')
  } finally {
    deletingOrderNo.value = ''
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
      <div class="filter-tabs">
        <button
          v-for="item in statusOptions"
          :key="item.value"
          type="button"
          class="filter-tab"
          :class="[
            statusFilter === item.value ? 'is-active' : '',
            item.value !== 'all' ? orderStatusClass(item.value) : 'status-all',
          ]"
          @click="statusFilter = item.value"
        >
          <span class="filter-label">{{ item.label }}</span>
          <span v-if="statusCounts[item.value]" class="filter-count">{{ statusCounts[item.value] }}</span>
        </button>
      </div>
    </div>

    <div v-loading="loading" class="orders-list">
      <div v-if="!filteredOrders.length && !loading" class="empty-state">
        <p>{{ statusFilter === 'all' ? '暂无订单' : `暂无${orderStatusLabel(statusFilter)}订单` }}</p>
        <el-button type="primary" @click="router.push('/')">去购物</el-button>
      </div>

      <div
        v-for="order in filteredOrders"
        :key="order.orderNo"
        class="order-card"
        :class="orderStatusClass(order.status)"
        @click="router.push(`/orders/${order.orderNo}`)"
      >
        <div class="order-header">
          <div class="order-meta">
            <span class="order-no">{{ order.orderNo }}</span>
            <span class="order-time">{{ new Date(order.createdAt).toLocaleString() }}</span>
          </div>
          <OrderStatusBadge :status="order.status" size="sm" />
        </div>

        <div class="order-body">
          <div class="order-thumb">
            <img v-if="productImage(order)" :src="productImage(order)" alt="" loading="lazy" />
          </div>
          <div class="order-info">
            <PendingPayCountdown
              v-if="order.status === 'pending'"
              :order="order"
              compact
              @expired="handlePendingExpired(order.orderNo)"
            />
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

        <div class="order-footer" @click.stop>
          <div class="order-actions">
            <el-button
              v-if="order.status === 'pending'"
              type="primary"
              size="small"
              :loading="payingOrderNo === order.orderNo"
              @click="handlePay(order, $event)"
            >
              立即支付
            </el-button>
            <el-button
              v-if="order.status === 'pending'"
              link
              type="danger"
              :loading="cancellingOrderNo === order.orderNo"
              @click="handleCancel(order, $event)"
            >
              取消订单
            </el-button>
            <el-button
              v-if="canUserDeleteOrder(order.status)"
              link
              type="danger"
              :loading="deletingOrderNo === order.orderNo"
              @click="handleDelete(order, $event)"
            >
              删除订单
            </el-button>
            <el-button link @click="router.push(`/orders/${order.orderNo}`)">查看详情 →</el-button>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="payDialogVisible" title="确认支付" width="560px" destroy-on-close>
      <template v-if="payTarget">
        <p class="pay-dialog-summary">
          订单 {{ payTarget.orderNo }} · 应付
          <strong>{{ appStore.formatPrice(payAmount) }}</strong>
        </p>
        <CouponPicker
          v-model="selectedUserCouponId"
          :coupons="couponOptions"
          :currency="payCurrency"
          :loading="couponsLoading"
        />
        <PaymentMethodPicker v-model="paymentMethod" />
      </template>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="!!payingOrderNo" @click="confirmPay">确认支付</el-button>
      </template>
    </el-dialog>
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
  padding: 14px;
  border: 1px solid rgba(201, 169, 98, 0.18);
  border-radius: var(--cb-radius-lg);
  background: linear-gradient(145deg, rgba(26, 20, 16, 0.88), rgba(18, 14, 11, 0.92));
}

.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(201, 169, 98, 0.16);
  background: rgba(18, 14, 11, 0.65);
  color: var(--cb-text-dim);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.filter-tab:hover {
  color: var(--cb-gold-light);
  border-color: rgba(201, 169, 98, 0.32);
  background: rgba(201, 169, 98, 0.08);
}

.filter-tab.is-active.status-all {
  color: #16110e;
  background: linear-gradient(135deg, #e8d5a3, #c9a962 58%, #a89060);
  border-color: rgba(232, 213, 163, 0.45);
  box-shadow: 0 4px 14px rgba(201, 169, 98, 0.22);
}

.filter-tab.is-active.status-pending {
  color: #f0d78a;
  background: rgba(212, 175, 55, 0.18);
  border-color: rgba(212, 175, 55, 0.42);
}

.filter-tab.is-active.status-paid {
  color: #16110e;
  background: linear-gradient(135deg, #e8d5a3, #c9a962 58%, #a89060);
  border-color: rgba(232, 213, 163, 0.45);
}

.filter-tab.is-active.status-shipped {
  color: #dce8ff;
  background: rgba(96, 132, 188, 0.22);
  border-color: rgba(130, 164, 214, 0.38);
}

.filter-tab.is-active.status-completed {
  color: #b8e0b8;
  background: rgba(88, 148, 88, 0.22);
  border-color: rgba(120, 168, 120, 0.38);
}

.filter-tab.is-active.status-cancelled {
  color: #b8b5ad;
  background: rgba(120, 118, 112, 0.2);
  border-color: rgba(120, 118, 112, 0.32);
}

.filter-count {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.22);
  font-size: 11px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
}

.filter-tab.is-active.status-all .filter-count,
.filter-tab.is-active.status-paid .filter-count {
  background: rgba(22, 17, 14, 0.18);
  color: inherit;
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
  position: relative;
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius-lg);
  padding: 18px 20px 18px 23px;
  margin-bottom: 14px;
  background: var(--cb-surface);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.order-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--cb-accent);
  opacity: 0.35;
}

.order-card.status-pending::before {
  background: #d4af37;
  opacity: 0.9;
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.45);
}

.order-card.status-paid::before {
  background: linear-gradient(180deg, #e8d5a3, #c9a962);
  opacity: 1;
}

.order-card.status-shipped::before {
  background: #8eb0e8;
  opacity: 0.95;
}

.order-card.status-completed::before {
  background: #7cb87c;
  opacity: 0.95;
}

.order-card.status-cancelled::before {
  background: #7a7872;
  opacity: 0.55;
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
  display: flex;
  flex-direction: column;
  gap: 8px;
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
}

.order-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.pay-dialog-summary {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--cb-text-dim);
}

.pay-dialog-summary strong {
  color: var(--cb-accent);
  font-family: var(--cb-font-display);
  font-size: 18px;
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

  .filter-tab {
    padding: 7px 12px;
    font-size: 12px;
  }
}
</style>
