<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { UserCoupon } from '@/api/coupon'
import { getShippingAddresses, type ShippingAddress } from '@/api/address'
import { createOrder, previewOrderCoupons } from '@/api/order'
import CouponPicker from '@/components/CouponPicker.vue'
import { useAppStore } from '@/stores/app'
import { useCartStore } from '@/stores/cart'
import { useCheckoutStore } from '@/stores/checkout'
import type { CouponCurrency } from '@/utils/coupon-amount'
import { formatShippingAddress } from '@/utils/shipping-address'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const cartStore = useCartStore()
const checkoutStore = useCheckoutStore()

const loading = ref(false)
const addressLoading = ref(false)
const couponsLoading = ref(false)
const addresses = ref<ShippingAddress[]>([])
const couponOptions = ref<UserCoupon[]>([])
const selectedUserCouponId = ref<number | null>(null)
const selectedAddressId = ref<number | 'manual' | null>(null)

const isBuyNowMode = computed(() => route.query.mode === 'buy' && !!checkoutStore.buyNowItem)

const checkoutItems = computed(() =>
  isBuyNowMode.value && checkoutStore.buyNowItem ? [checkoutStore.buyNowItem] : cartStore.selectedItems,
)

const checkoutTotal = computed(() =>
  checkoutItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0),
)

const checkoutCurrency = computed<CouponCurrency>(() =>
  checkoutItems.value[0]?.currency === 'CNY' ? 'CNY' : 'USD',
)

const selectedCoupon = computed(() => {
  const picked = couponOptions.value.find((item) => item.id === selectedUserCouponId.value)
  if (!picked || picked.applicable === false) return null
  return picked
})

const payableTotal = computed(() => {
  const discount = selectedCoupon.value?.discountPreview ?? 0
  return Math.max(0, checkoutTotal.value - discount)
})

const form = reactive({
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
})

function applyAddress(address: ShippingAddress) {
  form.receiverName = address.receiverName
  form.receiverPhone = address.receiverPhone
  form.receiverAddress = address.detailAddress
}

function selectAddress(id: number) {
  selectedAddressId.value = id
  const address = addresses.value.find((item) => item.id === id)
  if (address) applyAddress(address)
}

function selectManual() {
  selectedAddressId.value = 'manual'
}

async function loadAddresses() {
  addressLoading.value = true
  try {
    addresses.value = await getShippingAddresses()
    const defaultAddress = addresses.value.find((item) => item.isDefault) || addresses.value[0]
    if (defaultAddress) {
      selectAddress(defaultAddress.id)
    } else {
      selectedAddressId.value = 'manual'
    }
  } finally {
    addressLoading.value = false
  }
}

async function loadCoupons() {
  if (!checkoutItems.value.length) {
    couponOptions.value = []
    selectedUserCouponId.value = null
    return
  }

  couponsLoading.value = true
  try {
    couponOptions.value = await previewOrderCoupons(
      checkoutItems.value.map((item) => ({
        productSkuId: item.productSkuId,
        quantity: item.quantity,
        currency: item.currency,
      })),
    )
    if (
      selectedUserCouponId.value &&
      !couponOptions.value.some(
        (item) => item.id === selectedUserCouponId.value && item.applicable !== false,
      )
    ) {
      selectedUserCouponId.value = null
    }
  } finally {
    couponsLoading.value = false
  }
}

async function handleSubmit() {
  if (!form.receiverName || !form.receiverPhone || !form.receiverAddress) {
    ElMessage.warning('请填写完整收货信息')
    return
  }
  if (!checkoutItems.value.length) {
    ElMessage.warning(isBuyNowMode.value ? '购买商品已失效，请重新选择' : '请先选择要结算的商品')
    router.push(isBuyNowMode.value ? '/' : '/cart')
    return
  }

  const shippingAddress = formatShippingAddress(form.receiverName, form.receiverPhone, form.receiverAddress)

  loading.value = true
  try {
    const order = await createOrder({
      shippingAddress,
      items: checkoutItems.value.map((i) => ({
        productSkuId: i.productSkuId,
        quantity: i.quantity,
        currency: i.currency,
      })),
      userCouponId: selectedUserCouponId.value,
    })

    if (isBuyNowMode.value) {
      checkoutStore.clearBuyNow()
    } else {
      cartStore.removeSelectedItems()
    }

    ElMessage.success('下单成功，请在 30 分钟内完成支付')
    router.push(`/orders/${order.orderNo}`)
  } finally {
    loading.value = false
  }
}

watch(checkoutItems, () => {
  loadCoupons()
}, { deep: true })

watch(selectedAddressId, (value) => {
  if (typeof value === 'number') {
    const address = addresses.value.find((item) => item.id === value)
    if (address) applyAddress(address)
  }
})

onMounted(async () => {
  if (isBuyNowMode.value) {
    if (!checkoutStore.buyNowItem) {
      ElMessage.warning('购买商品已失效，请重新选择')
      router.replace('/')
      return
    }
  } else {
    checkoutStore.clearBuyNow()
    cartStore.refreshPrices(appStore.currency).catch(() => undefined)
    if (!cartStore.selectedItems.length) {
      ElMessage.warning('请先选择要结算的商品')
      router.replace('/cart')
      return
    }
  }

  await loadAddresses()
  await loadCoupons()
})
</script>

<template>
  <div class="checkout-page">
    <h2 class="page-title">{{ isBuyNowMode ? '立即购买' : '确认订单' }}</h2>

    <el-row :gutter="20">
      <el-col :xs="24" :md="14">
        <el-card shadow="never" class="section-card" v-loading="addressLoading">
          <template #header>
            <div class="section-header">
              <span>收货信息</span>
              <el-button link type="primary" @click="router.push('/user')">管理地址</el-button>
            </div>
          </template>

          <div v-if="addresses.length" class="address-picker">
            <button
              v-for="item in addresses"
              :key="item.id"
              type="button"
              class="address-option"
              :class="{ 'is-active': selectedAddressId === item.id }"
              @click="selectAddress(item.id)"
            >
              <div class="option-head">
                <span class="option-name">{{ item.receiverName }}</span>
                <span class="option-phone">{{ item.receiverPhone }}</span>
                <el-tag v-if="item.isDefault" size="small" type="warning">默认</el-tag>
                <el-tag v-if="item.label" size="small" effect="plain">{{ item.label }}</el-tag>
              </div>
              <p class="option-detail">{{ item.detailAddress }}</p>
            </button>

            <button
              type="button"
              class="address-option address-option-manual"
              :class="{ 'is-active': selectedAddressId === 'manual' }"
              @click="selectManual"
            >
              <div class="option-head">
                <el-icon><Plus /></el-icon>
                <span>手动填写新地址</span>
              </div>
            </button>
          </div>

          <el-form
            v-if="selectedAddressId === 'manual' || !addresses.length"
            label-width="90px"
            class="address-form"
          >
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

          <p v-else class="address-preview">
            将使用：{{ formatShippingAddress(form.receiverName, form.receiverPhone, form.receiverAddress) }}
          </p>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="10">
        <el-card shadow="never" class="section-card order-summary">
          <template #header><span>订单摘要</span></template>
          <div v-for="item in checkoutItems" :key="item.productSkuId" class="summary-item">
            <div class="summary-item-main">
              <span class="name">{{ item.title }} × {{ item.quantity }}</span>
              <span v-if="item.specText" class="spec">{{ item.specText }}</span>
            </div>
            <span>{{ appStore.formatPrice(item.price * item.quantity) }}</span>
          </div>
          <el-divider />
          <CouponPicker
            v-model="selectedUserCouponId"
            :coupons="couponOptions"
            :currency="checkoutCurrency"
            :loading="couponsLoading"
          />
          <div v-if="selectedCoupon?.discountPreview" class="summary-discount">
            <span>优惠券抵扣</span>
            <span>-{{ appStore.formatPrice(selectedCoupon.discountPreview) }}</span>
          </div>
          <div class="summary-total">
            <span>应付总额</span>
            <span class="amount">{{ appStore.formatPrice(payableTotal) }}</span>
          </div>

          <el-button type="primary" size="large" :loading="loading" class="submit-btn" @click="handleSubmit">
            提交订单
          </el-button>
          <p class="buy-tip">提交后将生成待支付订单，请在订单详情或我的订单中选择支付方式并完成付款</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.checkout-page {
  max-width: 1100px;
  margin: 0 auto;
}

.page-title {
  font-family: var(--cb-font-display);
  font-size: 26px;
  letter-spacing: 0.05em;
  margin: 0 0 20px;
}

.section-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.address-picker {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 18px;
}

.address-option {
  width: 100%;
  text-align: left;
  padding: 14px 16px;
  border: 1px solid var(--cb-border);
  border-radius: 12px;
  background: rgba(201, 169, 98, 0.04);
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.address-option:hover {
  border-color: rgba(201, 169, 98, 0.35);
}

.address-option.is-active {
  border-color: rgba(201, 169, 98, 0.55);
  box-shadow: 0 0 0 1px rgba(201, 169, 98, 0.18);
  background: rgba(201, 169, 98, 0.1);
}

.address-option-manual .option-head {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--cb-accent);
  font-weight: 600;
}

.option-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}

.option-name {
  font-weight: 700;
  color: var(--cb-text);
}

.option-phone {
  color: var(--cb-text-dim);
  font-size: 13px;
}

.option-detail {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--cb-text-muted);
}

.address-form {
  margin-top: 4px;
}

.address-preview {
  margin: 4px 0 0;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(201, 169, 98, 0.08);
  font-size: 12px;
  color: var(--cb-text-dim);
}

.summary-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  font-size: 14px;
}

.summary-item-main {
  flex: 1;
  min-width: 0;
}

.summary-item .name {
  display: block;
  color: var(--cb-text-dim);
}

.summary-item .spec {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.summary-discount {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  font-size: 14px;
  color: #e6a23c;
}

.summary-total {
  display: flex;
  justify-content: space-between;
  font-size: 16px;
  font-weight: 600;
}

.summary-total .amount {
  color: var(--cb-accent);
  font-size: 22px;
}

.submit-btn {
  width: 100%;
  margin-top: 20px;
}

.buy-tip {
  margin: 10px 0 0;
  text-align: center;
  font-size: 12px;
  color: var(--cb-text-muted);
}
</style>
