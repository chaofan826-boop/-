<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createOrder } from '@/api/order'
import { useAppStore } from '@/stores/app'
import { useCartStore } from '@/stores/cart'

const router = useRouter()
const appStore = useAppStore()
const cartStore = useCartStore()
const loading = ref(false)

const checkoutItems = computed(() => cartStore.selectedItems)
const checkoutTotal = computed(() => cartStore.selectedTotal)

const form = reactive({
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
})

async function handleSubmit() {
  if (!form.receiverName || !form.receiverPhone || !form.receiverAddress) {
    ElMessage.warning('请填写完整收货信息')
    return
  }
  if (!checkoutItems.value.length) {
    ElMessage.warning('请先选择要结算的商品')
    router.push('/cart')
    return
  }

  const shippingAddress = `${form.receiverName} | ${form.receiverPhone} | ${form.receiverAddress}`

  loading.value = true
  try {
    await createOrder({
      shippingAddress,
      items: checkoutItems.value.map((i) => ({
        productSkuId: i.productSkuId,
        quantity: i.quantity,
        currency: i.currency,
      })),
    })
    cartStore.removeSelectedItems()
    ElMessage.success('下单成功！')
    router.push('/orders')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  cartStore.refreshPrices(appStore.currency).catch(() => undefined)
  if (!cartStore.selectedItems.length) {
    ElMessage.warning('请先选择要结算的商品')
    router.replace('/cart')
  }
})
</script>

<template>
  <div>
    <h2 class="page-title">确认订单</h2>

    <el-row :gutter="20">
      <el-col :xs="24" :md="14">
        <el-card shadow="never" class="section-card">
          <template #header><span>收货信息</span></template>
          <el-form label-width="90px">
            <el-form-item label="收货人" required>
              <el-input v-model="form.receiverName" placeholder="请输入姓名" />
            </el-form-item>
            <el-form-item label="手机号" required>
              <el-input v-model="form.receiverPhone" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item label="详细地址" required>
              <el-input
                v-model="form.receiverAddress"
                type="textarea"
                :rows="3"
                placeholder="国家 / 省州 / 城市 / 街道 / 邮编"
              />
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="10">
        <el-card shadow="never" class="section-card order-summary">
          <template #header><span>订单摘要</span></template>
          <div v-for="item in checkoutItems" :key="item.productSkuId" class="summary-item">
            <span class="name">{{ item.title }} × {{ item.quantity }}</span>
            <span>{{ appStore.formatPrice(item.price * item.quantity) }}</span>
          </div>
          <el-divider />
          <div class="summary-total">
            <span>应付总额</span>
            <span class="amount">{{ appStore.formatPrice(checkoutTotal) }}</span>
          </div>
          <el-button type="primary" size="large" :loading="loading" style="width: 100%; margin-top: 20px" @click="handleSubmit">
            提交订单
          </el-button>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.section-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  font-size: 14px;
}

.summary-item .name {
  flex: 1;
  color: #606266;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  font-size: 16px;
  font-weight: 600;
}

.summary-total .amount {
  color: #f56c6c;
  font-size: 22px;
}
</style>
