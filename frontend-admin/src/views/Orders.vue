<script setup lang="ts">

import { computed, onMounted, reactive, ref, watch } from 'vue'

import { useRoute, useRouter } from 'vue-router'

import { ElMessage } from 'element-plus'

import { getOrders, updateOrderStatus, type Order } from '@/api/order'

import { createShipping, type ShippingCarrier } from '@/api/shipping'



const route = useRoute()

const router = useRouter()



const loading = ref(false)

const orders = ref<Order[]>([])

const statusFilter = ref('')

const shipDialogVisible = ref(false)

const shipLoading = ref(false)

const shippingOrderId = ref<number | null>(null)



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



async function loadOrders() {

  loading.value = true

  try {

    orders.value = await getOrders()

  } finally {

    loading.value = false

  }

}



async function changeStatus(id: number, status: string) {

  await updateOrderStatus(id, status)

  ElMessage.success('订单状态已更新')

  await loadOrders()

}



function openShipDialog(row: Order) {

  shippingOrderId.value = row.id

  shipForm.trackingNumber = ''

  shipForm.carrier = 'DHL'

  shipDialogVisible.value = true

}



async function handleShip() {

  if (!shippingOrderId.value) return

  if (!shipForm.trackingNumber.trim()) {

    ElMessage.warning('请输入运单号')

    return

  }



  shipLoading.value = true

  try {

    await createShipping({

      orderId: shippingOrderId.value,

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

    </div>



    <el-card shadow="never">

      <el-table v-loading="loading" :data="filteredOrders" stripe>

        <el-table-column prop="id" label="ID" width="70" />

        <el-table-column label="客户" min-width="160">

          <template #default="{ row }">

            <div>{{ row.user?.name }}</div>

            <div class="sub-text">{{ row.user?.email }}</div>

          </template>

        </el-table-column>

        <el-table-column prop="totalAmount" label="金额" width="100" />

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

              @change="(v: string) => changeStatus(row.id, v)"

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

        <el-table-column label="操作" width="120" fixed="right">

          <template #default="{ row }">

            <el-button

              v-if="row.status === 'paid'"

              link

              type="primary"

              @click="openShipDialog(row)"

            >

              发货

            </el-button>

            <span v-else-if="row.status === 'shipped' || row.status === 'completed'" class="sub-text">

              已发货

            </span>

            <span v-else class="sub-text">—</span>

          </template>

        </el-table-column>

      </el-table>

    </el-card>



    <el-dialog v-model="shipDialogVisible" title="订单发货" width="480px" destroy-on-close>

      <el-form label-width="88px">

        <el-form-item label="订单号">

          <el-input :model-value="String(shippingOrderId ?? '')" disabled />

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



.sub-text {

  font-size: 12px;

  color: var(--cb-text-muted);

}

</style>


