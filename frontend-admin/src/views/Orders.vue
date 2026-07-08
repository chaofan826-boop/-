<script setup lang="ts">

import { computed, onMounted, reactive, ref, watch } from 'vue'

import { useRoute, useRouter } from 'vue-router'

import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, MoreFilled, Search, Van, View } from '@element-plus/icons-vue'

import { batchDeleteOrders, deleteOrder, getOrder, getOrders, updateOrder, updateOrderStatus, type Order } from '@/api/order'
import {
  confirmBatchDelete,
  showBatchDeleteResult,
  useTableSelectionByKey,
} from '@/composables/useTableSelection'

import { createShipping, type ShippingCarrier } from '@/api/shipping'
import { formatSpecText } from '@/utils/spec'
import { formatPhoneDisplay } from '@/constants/regions'
import { paymentMethodLabel, PAYMENT_METHOD_OPTIONS } from '@/utils/payment-method'



const route = useRoute()

const router = useRouter()



const loading = ref(false)
const tableRef = ref<{ clearSelection: () => void }>()
const batchDeleting = ref(false)

const orders = ref<Order[]>([])
const {
  selectedKeys: selectedOrderNos,
  hasSelection,
  handleSelectionChange,
  clearSelection,
} = useTableSelectionByKey<Order>((row) => row.orderNo)

const statusFilter = ref('')

const query = reactive({
  keyword: '',
  status: '' as string,
  paymentMethod: '' as string,
  couponUsed: '' as '' | 'yes' | 'no',
  startDate: '',
  endDate: '',
})

const couponUsedOptions = [
  { value: 'yes', label: '使用优惠券' },
  { value: 'no', label: '未使用优惠券' },
]

const dateRange = ref<[string, string] | null>(null)

const shipDialogVisible = ref(false)

const shipLoading = ref(false)

const shippingOrderNo = ref<string | null>(null)

const editDialogVisible = ref(false)

const detailDialogVisible = ref(false)
const detailLoading = ref(false)
const detailOrder = ref<Order | null>(null)

const editLoading = ref(false)

const editForm = reactive({
  orderNo: '',
  customerName: '',
  shippingAddress: '',
  status: '',
  items: [] as {
    id: number
    title: string
    spec: string
    quantity: number
    price: number
  }[],
})

const editTotal = computed(() =>
  editForm.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.price), 0),
)



const shipForm = reactive({

  trackingNumber: '',

  carrier: 'DHL' as ShippingCarrier,

})



const statusOptions = [

  { value: 'pending', label: '待支付' },

  { value: 'paid', label: '待发货' },

  { value: 'shipped', label: '已发货' },

  { value: 'completed', label: '已完成' },

  { value: 'cancelled', label: '已取消' },

]



const carrierOptions = [
  { value: 'DHL', label: 'DHL' },
  { value: 'UPS', label: 'UPS' },
]



const filteredOrders = computed(() => orders.value)

const resultCount = computed(() => orders.value.length)

function buildQueryParams() {
  return {
    keyword: query.keyword.trim() || undefined,
    status: query.status || undefined,
    paymentMethod: query.paymentMethod || undefined,
    couponUsed: query.couponUsed || undefined,
    startDate: query.startDate || undefined,
    endDate: query.endDate || undefined,
  }
}

function syncDateRangeToQuery() {
  if (dateRange.value?.length === 2) {
    query.startDate = dateRange.value[0]
    query.endDate = dateRange.value[1]
  } else {
    query.startDate = ''
    query.endDate = ''
  }
}



function statusLabel(status: string) {

  return statusOptions.find((s) => s.value === status)?.label || status

}



function statusTagType(status: string) {

  const map: Record<string, string> = {

    pending: 'info',

    paid: 'warning',

    shipped: 'primary',

    completed: 'success',

    cancelled: 'danger',

  }

  return map[status] || 'info'

}



function syncStatusFromRoute() {

  const status = typeof route.query.status === 'string' ? route.query.status : ''

  const nextStatus = statusOptions.some((item) => item.value === status) ? status : ''
  statusFilter.value = nextStatus
  query.status = nextStatus

}



function onStatusFilterChange() {
  const nextStatus = query.status || ''
  statusFilter.value = nextStatus
  router.replace({
    path: route.path,
    query: nextStatus ? { status: nextStatus } : {},
  })
  loadOrders()
}

function resetFilters() {
  query.keyword = ''
  query.status = ''
  query.paymentMethod = ''
  query.couponUsed = ''
  query.startDate = ''
  query.endDate = ''
  dateRange.value = null
  statusFilter.value = ''
  router.replace({ path: route.path, query: {} })
  loadOrders()
}

function handleSearch() {
  syncDateRangeToQuery()
  loadOrders()
}

function itemTitle(item: Order['items'][number]) {
  return item.product?.title?.zh || item.product?.title?.en || '商品'
}

function itemSpec(item: Order['items'][number]) {
  if (!item.productSku) return ''
  return formatSpecText(item.productSku)
}

function formatAmount(amount: number | string, currency = 'USD') {
  const value = Number(amount).toFixed(2)
  return currency === 'CNY' ? `¥${value}` : `$${value}`
}

function itemSubtotal(item: Order['items'][number]) {
  return Number(item.price) * Number(item.quantity)
}

function orderItemsSubtotal(row: Order) {
  if (!row.items?.length) return Number(row.totalAmount)
  return row.items.reduce((sum, item) => sum + itemSubtotal(item), 0)
}

function orderTotal(row: Order) {
  return orderItemsSubtotal(row)
}

function orderCurrency(row: Order) {
  return row.currency === 'CNY' ? 'CNY' : 'USD'
}

function orderUsedCoupon(row: Order) {
  return Number(row.couponDiscount) > 0 || !!row.userCouponId || !!row.usedCoupon
}

function orderPaidAmount(row: Order) {
  if (row.status === 'pending') return null
  if (Number(row.couponDiscount) > 0) return Number(row.totalAmount)
  return orderItemsSubtotal(row)
}

function couponTitle(row: Order) {
  return row.usedCoupon?.title?.zh || row.usedCoupon?.title?.en || '—'
}

function couponFaceValue(row: Order) {
  const currency = orderCurrency(row)
  const amounts = row.usedCoupon?.discountAmounts
  if (!amounts) return '—'
  const value = currency === 'CNY' ? amounts.CNY : amounts.USD
  return value != null ? formatAmount(value, currency) : '—'
}



async function loadOrders() {

  loading.value = true

  try {

    orders.value = await getOrders(buildQueryParams())

  } finally {

    loading.value = false

  }

}



async function changeStatus(orderNo: string, status: string) {

  await updateOrderStatus(orderNo, status)

  ElMessage.success('订单状态已更新')

  await loadOrders()

}



function openShipDialog(row: Order) {

  shippingOrderNo.value = row.orderNo

  shipForm.trackingNumber = ''

  shipForm.carrier = 'DHL'

  shipDialogVisible.value = true

}

async function openDetailDialog(row: Order) {
  detailDialogVisible.value = true
  detailLoading.value = true
  detailOrder.value = null
  try {
    detailOrder.value = await getOrder(row.orderNo)
  } catch {
    detailDialogVisible.value = false
  } finally {
    detailLoading.value = false
  }
}

function openEditFromDetail() {
  if (!detailOrder.value) return
  openEditDialog(detailOrder.value)
  detailDialogVisible.value = false
}

function openShipFromDetail() {
  if (!detailOrder.value) return
  openShipDialog(detailOrder.value)
  detailDialogVisible.value = false
}

function openEditDialog(row: Order) {
  editForm.orderNo = row.orderNo
  editForm.customerName = row.user?.name || '—'
  editForm.shippingAddress = row.shippingAddress
  editForm.status = row.status
  editForm.items = row.items.map((item) => ({
    id: item.id,
    title: itemTitle(item),
    spec: itemSpec(item),
    quantity: item.quantity,
    price: Number(item.price),
  }))
  editDialogVisible.value = true
}

async function handleSaveEdit() {
  if (!editForm.shippingAddress.trim()) {
    ElMessage.warning('请填写收货地址')
    return
  }
  if (!editForm.items.length) {
    ElMessage.warning('订单商品不能为空')
    return
  }
  for (const item of editForm.items) {
    if (item.quantity < 1) {
      ElMessage.warning('商品数量至少为 1')
      return
    }
    if (item.price < 0) {
      ElMessage.warning('商品单价不能为负数')
      return
    }
  }

  editLoading.value = true
  try {
    await updateOrder(editForm.orderNo, {
      shippingAddress: editForm.shippingAddress.trim(),
      status: editForm.status,
      items: editForm.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        price: item.price,
      })),
    })
    ElMessage.success('订单已更新')
    editDialogVisible.value = false
    await loadOrders()
  } finally {
    editLoading.value = false
  }
}

async function handleDelete(row: Order) {
  try {
    await ElMessageBox.confirm(
      `确定删除订单 ${row.orderNo}？删除后无法恢复，关联物流信息也会一并删除。`,
      '删除订单',
      { type: 'warning', confirmButtonText: '删除' },
    )
  } catch {
    return
  }

  await deleteOrder(row.orderNo)
  ElMessage.success('订单已删除')
  await loadOrders()
}

function handleOrderAction(command: string, row: Order) {
  switch (command) {
    case 'view':
      void openDetailDialog(row)
      break
    case 'edit':
      openEditDialog(row)
      break
    case 'ship':
      openShipDialog(row)
      break
    case 'delete':
      void handleDelete(row)
      break
  }
}

async function handleBatchDelete() {
  if (!selectedOrderNos.value.length) return

  try {
    await confirmBatchDelete(selectedOrderNos.value.length, '个订单')
  } catch {
    return
  }

  batchDeleting.value = true
  try {
    const result = await batchDeleteOrders(selectedOrderNos.value)
    showBatchDeleteResult(result, '个订单')
    tableRef.value?.clearSelection()
    clearSelection()
    await loadOrders()
  } finally {
    batchDeleting.value = false
  }
}



async function handleShip() {

  if (!shippingOrderNo.value) return

  if (!shipForm.trackingNumber.trim()) {

    ElMessage.warning('请输入运单号')

    return

  }



  shipLoading.value = true

  try {

    await createShipping({

      orderNo: shippingOrderNo.value,

      trackingNumber: shipForm.trackingNumber.trim(),

      carrier: shipForm.carrier,

    })

    ElMessage.success('发货成功')

    shipDialogVisible.value = false

    await loadOrders()

  } finally {

    shipLoading.value = false

  }

}



watch(
  () => route.query.status,
  () => {
    syncStatusFromRoute()
  },
  { immediate: true },
)

onMounted(loadOrders)

</script>



<template>

  <div>

    <div class="toolbar">

      <div>

        <p class="page-tag">订单管理</p>

        <h2 class="page-title">订单管理</h2>
        <p class="order-count">共 {{ resultCount }} 笔订单</p>

      </div>

      <div class="filter-actions">
        <el-button
          type="danger"
          plain
          :disabled="!hasSelection"
          :loading="batchDeleting"
          @click="handleBatchDelete"
        >
          批量删除{{ hasSelection ? ` (${selectedOrderNos.length})` : '' }}
        </el-button>
        <el-button :loading="loading" @click="loadOrders">刷新</el-button>
      </div>

    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="搜索">
          <el-input
            v-model="query.keyword"
            placeholder="订单号 / 客户 / 邮箱 / 地址 / 商品"
            clearable
            style="width: 260px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select
            v-model="query.status"
            clearable
            placeholder="全部"
            style="width: 120px"
            @change="onStatusFilterChange"
          >
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="支付方式">
          <el-select
            v-model="query.paymentMethod"
            clearable
            placeholder="全部"
            style="width: 130px"
            @change="handleSearch"
          >
            <el-option
              v-for="item in PAYMENT_METHOD_OPTIONS"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优惠券">
          <el-select
            v-model="query.couponUsed"
            clearable
            placeholder="全部"
            style="width: 140px"
            @change="handleSearch"
          >
            <el-option
              v-for="item in couponUsedOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="下单时间">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 260px"
            @change="handleSearch"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>



    <el-card shadow="never" class="table-card">

      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="filteredOrders"
        row-key="orderNo"
        stripe
        class="orders-table"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="orderNo" label="订单编号" min-width="140" show-overflow-tooltip />

        <el-table-column label="客户" min-width="88" show-overflow-tooltip>
          <template #default="{ row }">
            <div>{{ row.user?.name || '—' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="手机号" width="128" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.user?.phone ? formatPhoneDisplay(row.user.region, row.user.phone) : '—' }}
          </template>
        </el-table-column>

        <el-table-column label="邮箱" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.user?.email || '—' }}
          </template>
        </el-table-column>

        <el-table-column label="订单商品" min-width="180" class-name="items-column">
          <template #default="{ row }">
            <div v-if="row.items?.length" class="order-items">
              <div v-for="item in row.items" :key="item.id" class="order-item-line">
                <span class="item-name">{{ itemTitle(item) }}</span>
                <span v-if="itemSpec(item)" class="item-spec">{{ itemSpec(item) }}</span>
                <span class="item-price">
                  {{ formatAmount(item.price) }} × {{ item.quantity }} = {{ formatAmount(itemSubtotal(item)) }}
                </span>
              </div>
            </div>
            <span v-else class="sub-text">—</span>
          </template>
        </el-table-column>

        <el-table-column label="金额" width="96">
          <template #default="{ row }">
            {{ formatAmount(orderTotal(row)) }}
          </template>
        </el-table-column>

        <el-table-column label="支付方式" width="96" show-overflow-tooltip>
          <template #default="{ row }">
            {{ paymentMethodLabel(row.paymentMethod) }}
          </template>
        </el-table-column>

        <el-table-column
          prop="shippingAddress"
          label="收货地址"
          min-width="120"
          class-name="address-column"
          show-overflow-tooltip
        />

        <el-table-column label="状态" width="118" class-name="status-column">

          <template #default="{ row }">

            <el-select

              :model-value="row.status"

              size="small"

              class="status-select"

              @change="(v: string) => changeStatus(row.orderNo, v)"

            >

              <el-option

                v-for="s in statusOptions"

                :key="s.value"

                :label="s.label"

                :value="s.value"

              />

            </el-select>

          </template>

        </el-table-column>

        <el-table-column prop="createdAt" label="创建时间" width="158" show-overflow-tooltip>

          <template #default="{ row }">

            {{ new Date(row.createdAt).toLocaleString() }}

          </template>

        </el-table-column>

        <el-table-column label="操作" width="72" align="center" class-name="actions-column">

          <template #default="{ row }">

            <el-dropdown
              trigger="hover"
              placement="bottom-end"
              :show-timeout="180"
              :hide-timeout="160"
              @command="(command: string) => handleOrderAction(command, row)"
            >
              <el-button link type="primary" :icon="MoreFilled" aria-label="订单操作" />
              <template #dropdown>
                <el-dropdown-menu class="order-action-menu">
                  <el-dropdown-item command="view" :icon="View">查看详情</el-dropdown-item>
                  <el-dropdown-item command="edit" :icon="Edit">编辑订单</el-dropdown-item>
                  <el-dropdown-item v-if="row.status === 'paid'" command="ship" :icon="Van">
                    发货
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided :icon="Delete" class="order-action-danger">
                    删除订单
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>

          </template>

        </el-table-column>

      </el-table>

    </el-card>



    <el-dialog v-model="detailDialogVisible" title="订单详情" width="760px" destroy-on-close>
      <div v-loading="detailLoading">
        <template v-if="detailOrder">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="订单编号" :span="2">
              {{ detailOrder.orderNo }}
            </el-descriptions-item>
            <el-descriptions-item label="订单状态">
              <el-tag :type="statusTagType(detailOrder.status)" size="small">
                {{ statusLabel(detailOrder.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="支付方式">
              {{ paymentMethodLabel(detailOrder.paymentMethod) }}
            </el-descriptions-item>
            <el-descriptions-item label="客户姓名">
              {{ detailOrder.user?.name || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="手机号">
              {{
                detailOrder.user?.phone
                  ? formatPhoneDisplay(detailOrder.user.region, detailOrder.user.phone)
                  : '—'
              }}
            </el-descriptions-item>
            <el-descriptions-item label="邮箱" :span="2">
              {{ detailOrder.user?.email || '—' }}
            </el-descriptions-item>
            <el-descriptions-item label="收货地址" :span="2">
              {{ detailOrder.shippingAddress }}
            </el-descriptions-item>
            <el-descriptions-item label="下单时间">
              {{ new Date(detailOrder.createdAt).toLocaleString() }}
            </el-descriptions-item>
            <el-descriptions-item label="结算币种">
              {{ orderCurrency(detailOrder) === 'CNY' ? '人民币 (CNY)' : '美元 (USD)' }}
            </el-descriptions-item>
            <el-descriptions-item label="商品合计">
              <span class="detail-amount">
                {{ formatAmount(orderItemsSubtotal(detailOrder), orderCurrency(detailOrder)) }}
              </span>
            </el-descriptions-item>
            <el-descriptions-item label="使用优惠券">
              {{ orderUsedCoupon(detailOrder) ? '是' : '否' }}
            </el-descriptions-item>
            <template v-if="orderUsedCoupon(detailOrder)">
              <el-descriptions-item label="优惠券名称">
                {{ couponTitle(detailOrder) }}
              </el-descriptions-item>
              <el-descriptions-item label="优惠券面额">
                {{ couponFaceValue(detailOrder) }}
              </el-descriptions-item>
              <el-descriptions-item label="优惠券抵扣">
                <span class="detail-discount">
                  -{{ formatAmount(Number(detailOrder.couponDiscount || 0), orderCurrency(detailOrder)) }}
                </span>
              </el-descriptions-item>
            </template>
            <el-descriptions-item label="用户实付">
              <span v-if="orderPaidAmount(detailOrder) != null" class="detail-amount detail-paid">
                {{ formatAmount(orderPaidAmount(detailOrder)!, orderCurrency(detailOrder)) }}
              </span>
              <span v-else class="sub-text">待支付</span>
            </el-descriptions-item>
            <el-descriptions-item
              v-if="detailOrder.status === 'pending' && detailOrder.payExpiresAt"
              label="支付截止"
              :span="2"
            >
              {{ new Date(detailOrder.payExpiresAt).toLocaleString() }}
            </el-descriptions-item>
          </el-descriptions>

          <p class="detail-section-title">商品明细</p>
          <div class="detail-items">
            <div v-for="item in detailOrder.items" :key="item.id" class="detail-item-row">
              <div class="detail-item-main">
                <strong>{{ itemTitle(item) }}</strong>
                <span v-if="itemSpec(item)" class="sub-text">{{ itemSpec(item) }}</span>
              </div>
              <span class="detail-item-qty">× {{ item.quantity }}</span>
              <span class="detail-item-price">{{ formatAmount(item.price) }}</span>
              <span class="detail-item-subtotal">{{ formatAmount(itemSubtotal(item)) }}</span>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button v-if="detailOrder" type="primary" plain @click="openEditFromDetail">编辑订单</el-button>
        <el-button
          v-if="detailOrder?.status === 'paid'"
          type="primary"
          @click="openShipFromDetail"
        >
          发货
        </el-button>
      </template>
    </el-dialog>



    <el-dialog v-model="editDialogVisible" title="编辑订单" width="720px" destroy-on-close>
      <el-form label-width="88px">
        <el-form-item label="订单号">
          <el-input :model-value="editForm.orderNo" disabled />
        </el-form-item>
        <el-form-item label="客户">
          <el-input :model-value="editForm.customerName" disabled />
        </el-form-item>
        <el-form-item label="订单状态" required>
          <el-select v-model="editForm.status" style="width: 100%">
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="收货地址" required>
          <el-input v-model="editForm.shippingAddress" type="textarea" :rows="3" />
        </el-form-item>
        <el-form-item label="订单商品">
          <div class="edit-items">
            <div v-for="item in editForm.items" :key="item.id" class="edit-item-row">
              <div class="edit-item-info">
                <strong>{{ item.title }}</strong>
                <span v-if="item.spec" class="sub-text">{{ item.spec }}</span>
              </div>
              <el-input-number v-model="item.quantity" :min="1" size="small" controls-position="right" />
              <el-input-number
                v-model="item.price"
                :min="0"
                :precision="2"
                :step="0.01"
                size="small"
                controls-position="right"
              />
              <span class="edit-item-subtotal">
                {{ formatAmount(Number(item.quantity) * Number(item.price)) }}
              </span>
            </div>
            <div class="edit-total">
              合计 <strong>{{ formatAmount(editTotal) }}</strong>
            </div>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="editLoading" @click="handleSaveEdit">保存</el-button>
      </template>
    </el-dialog>



    <el-dialog v-model="shipDialogVisible" title="订单发货" width="480px" destroy-on-close>

      <el-form label-width="88px">

        <el-form-item label="订单号">

          <el-input :model-value="shippingOrderNo ?? ''" disabled />

        </el-form-item>

        <el-form-item label="运单号" required>

          <el-input v-model="shipForm.trackingNumber" placeholder="请输入物流运单号" />

        </el-form-item>

        <el-form-item label="物流公司" required>

          <el-select v-model="shipForm.carrier" style="width: 100%">

            <el-option

              v-for="c in carrierOptions"

              :key="c.value"

              :label="c.label"

              :value="c.value"

            />

          </el-select>

        </el-form-item>

      </el-form>

      <template #footer>

        <el-button @click="shipDialogVisible = false">取消</el-button>

        <el-button type="primary" :loading="shipLoading" @click="handleShip">确认发货</el-button>

      </template>

    </el-dialog>

  </div>

</template>



<style scoped>

.page-tag {

  font-family: var(--cb-font-mono);

  font-size: 11px;

  letter-spacing: 0.15em;

  color: var(--cb-neon-cyan);

  opacity: 0.6;

  margin-bottom: 4px;

}



.page-title {

  margin: 0;

  font-family: var(--cb-font-display);

  font-size: 22px;

  letter-spacing: 0.06em;

  color: var(--cb-text);

}

.order-count {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--cb-text-muted);
}



.toolbar {

  display: flex;

  align-items: flex-end;

  justify-content: space-between;

  gap: 16px;

  margin-bottom: 20px;

  flex-wrap: wrap;

}



.filter-actions {

  display: flex;

  align-items: center;

  gap: 10px;

}

.filter-card {
  margin-bottom: 16px;
}

.filter-card :deep(.el-form-item) {
  margin-bottom: 12px;
}

.table-card {
  overflow: hidden;
}

.orders-table {
  width: 100%;
}

.table-card :deep(.el-table__body-wrapper),
.table-card :deep(.el-table__header-wrapper) {
  overflow-x: hidden;
}

.table-card :deep(.el-scrollbar__bar.is-horizontal) {
  display: none;
}

.table-card :deep(.address-column .cell),
.table-card :deep(.items-column .cell) {
  overflow: hidden;
}

.table-card :deep(.address-column .cell) {
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-card :deep(.status-column .cell) {
  overflow: hidden;
  padding-left: 10px;
  padding-right: 10px;
}

.table-card :deep(.status-select) {
  width: 98px;
}

.table-card :deep(.status-select .el-select__wrapper) {
  padding-left: 8px;
  padding-right: 8px;
}

.table-card :deep(.actions-column .cell) {
  padding-left: 8px;
  padding-right: 8px;
}

.table-card :deep(.actions-column .el-button) {
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
}

:deep(.order-action-menu .order-action-danger) {
  color: var(--el-color-danger);
}



.sub-text {

  font-size: 12px;

  color: var(--cb-text-muted);

}



.order-items {

  display: flex;

  flex-direction: column;

  gap: 6px;

}



.order-item-line {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
}

.item-name {
  color: var(--cb-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  flex: 1 1 auto;
}

.item-spec {
  font-size: 12px;
  color: var(--cb-text-muted);
  flex-shrink: 0;
}

.item-price {
  font-family: var(--cb-font-mono);
  font-size: 12px;
  color: var(--cb-accent);
  flex-shrink: 0;
  white-space: nowrap;
}



.edit-items {

  width: 100%;

  display: flex;

  flex-direction: column;

  gap: 12px;

}



.edit-item-row {

  display: grid;

  grid-template-columns: 1fr 100px 120px 90px;

  gap: 10px;

  align-items: center;

  padding: 10px 12px;

  border: 1px solid var(--cb-border);

  border-radius: 8px;

}



.edit-item-info {

  display: flex;

  flex-direction: column;

  gap: 4px;

  min-width: 0;

}



.edit-item-subtotal {

  font-family: var(--cb-font-mono);

  font-size: 13px;

  color: var(--cb-accent);

  text-align: right;

}



.edit-total {

  text-align: right;

  font-size: 14px;

  color: var(--cb-text-muted);

}

.detail-amount {
  font-family: var(--cb-font-display);
  font-weight: 700;
  color: var(--cb-accent);
}

.detail-discount {
  color: #e6a23c;
  font-weight: 600;
}

.detail-paid {
  color: #67c23a;
}

.detail-section-title {
  margin: 18px 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--cb-text);
}

.detail-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-item-row {
  display: grid;
  grid-template-columns: 1fr 72px 88px 88px;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border: 1px solid var(--cb-border);
  border-radius: 8px;
}

.detail-item-main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.detail-item-qty,
.detail-item-price,
.detail-item-subtotal {
  font-family: var(--cb-font-mono);
  font-size: 13px;
  color: var(--cb-text-dim);
  text-align: right;
}

.detail-item-subtotal {
  color: var(--cb-accent);
  font-weight: 600;
}

</style>


