<script setup lang="ts">

import { computed, onMounted, reactive, ref, watch } from 'vue'

import { useRoute, useRouter } from 'vue-router'

import { ElMessage, ElMessageBox } from 'element-plus'

import { deleteOrder, getOrders, updateOrder, updateOrderStatus, type Order } from '@/api/order'

import { createShipping, type ShippingCarrier } from '@/api/shipping'



const route = useRoute()

const router = useRouter()



const loading = ref(false)

const orders = ref<Order[]>([])

const statusFilter = ref('')

const shipDialogVisible = ref(false)

const shipLoading = ref(false)

const shippingOrderNo = ref<string | null>(null)

const editDialogVisible = ref(false)

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



const filteredOrders = computed(() => {

  if (!statusFilter.value) return orders.value

  return orders.value.filter((order) => order.status === statusFilter.value)

})



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

  statusFilter.value = statusOptions.some((item) => item.value === status) ? status : ''

}



function onStatusFilterChange(status?: string) {
  router.replace({
    path: route.path,
    query: status ? { status } : {},
  })
}

function resetFilters() {
  statusFilter.value = ''
  onStatusFilterChange()
}

function itemTitle(item: Order['items'][number]) {
  return item.product?.title?.zh || item.product?.title?.en || '商品'
}

function itemSpec(item: Order['items'][number]) {
  const parts: string[] = []
  if (item.productSku?.color) parts.push(item.productSku.color)
  if (item.productSku?.size) parts.push(item.productSku.size)
  return parts.join(' / ')
}

function formatAmount(amount: number | string) {
  return `$${Number(amount).toFixed(2)}`
}

function itemSubtotal(item: Order['items'][number]) {
  return Number(item.price) * Number(item.quantity)
}

function orderTotal(row: Order) {
  if (!row.items?.length) return Number(row.totalAmount)
  return row.items.reduce((sum, item) => sum + itemSubtotal(item), 0)
}



async function loadOrders() {

  loading.value = true

  try {

    orders.value = await getOrders()

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

      </div>

      <div class="filter-actions">
        <el-select
          v-model="statusFilter"
          clearable
          placeholder="全部状态"
          class="status-filter"
          @change="onStatusFilterChange"
        >

          <el-option

            v-for="item in statusOptions"

            :key="item.value"

            :label="item.label"

            :value="item.value"

          />

        </el-select>
        <el-button @click="resetFilters">重置</el-button>
      </div>

    </div>



    <el-card shadow="never">

      <el-table v-loading="loading" :data="filteredOrders" stripe>

        <el-table-column prop="orderNo" label="订单编号" min-width="180" />

        <el-table-column label="客户" min-width="160">

          <template #default="{ row }">

            <div>{{ row.user?.name }}</div>

            <div class="sub-text">{{ row.user?.email }}</div>

          </template>

        </el-table-column>

        <el-table-column label="订单商品" min-width="260">
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

        <el-table-column label="金额" width="120">
          <template #default="{ row }">
            {{ formatAmount(orderTotal(row)) }}
          </template>
        </el-table-column>

        <el-table-column prop="shippingAddress" label="收货地址" min-width="180" show-overflow-tooltip />

        <el-table-column label="状态" width="120">

          <template #default="{ row }">

            <el-tag :type="statusTagType(row.status)" size="small">

              {{ statusLabel(row.status) }}

            </el-tag>

          </template>

        </el-table-column>

        <el-table-column label="订单状态" width="140">

          <template #default="{ row }">

            <el-select

              :model-value="row.status"

              size="small"

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

        <el-table-column prop="createdAt" label="创建时间" width="170">

          <template #default="{ row }">

            {{ new Date(row.createdAt).toLocaleString() }}

          </template>

        </el-table-column>

        <el-table-column label="操作" width="180" fixed="right">

          <template #default="{ row }">

            <el-button link type="primary" @click="openEditDialog(row)">编辑</el-button>

            <el-button
              v-if="row.status === 'paid'"
              link
              type="primary"
              @click="openShipDialog(row)"
            >
              发货
            </el-button>

            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>

          </template>

        </el-table-column>

      </el-table>

    </el-card>



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



.toolbar {

  display: flex;

  align-items: flex-end;

  justify-content: space-between;

  gap: 16px;

  margin-bottom: 20px;

  flex-wrap: wrap;

}



.status-filter {

  width: 160px;

}



.filter-actions {

  display: flex;

  align-items: center;

  gap: 10px;

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

  flex-wrap: wrap;

  align-items: center;

  gap: 6px;

  font-size: 13px;

  line-height: 1.4;

}



.item-name {

  color: var(--cb-text);

}



.item-spec {

  font-size: 12px;

  color: var(--cb-text-muted);

}



.item-price {

  font-family: var(--cb-font-mono);

  font-size: 12px;

  color: var(--cb-accent);

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

</style>


