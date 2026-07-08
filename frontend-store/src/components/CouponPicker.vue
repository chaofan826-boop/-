<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { CircleCheck, Ticket } from '@element-plus/icons-vue'
import type { UserCoupon } from '@/api/coupon'
import { getCategories } from '@/api/product'
import CouponTicketCard from '@/components/CouponTicketCard.vue'
import { useAppStore } from '@/stores/app'
import type { Category } from '@/types/product'
import {
  formatCouponAmount,
  formatCouponCategoryNames,
  formatCouponRule,
  resolveCouponAmount,
  type CouponCurrency,
} from '@/utils/coupon-amount'

const model = defineModel<number | null>({ default: null })

const props = defineProps<{
  coupons: UserCoupon[]
  currency: CouponCurrency
  loading?: boolean
}>()

const appStore = useAppStore()
const categories = ref<Category[]>([])

const categoryMap = computed(
  () => new Map(categories.value.map((item) => [item.id, item.name])),
)

const applicableCoupons = computed(() => props.coupons.filter((item) => item.applicable !== false))

const selectedCoupon = computed(
  () => applicableCoupons.value.find((item) => item.id === model.value) ?? null,
)

function selectCoupon(id: number | null) {
  model.value = id
}

function couponAmountValue(coupon: UserCoupon['coupon']) {
  const discount = resolveCouponAmount(coupon.discountAmounts, props.currency)
  return Number.isInteger(discount) ? String(discount) : discount.toFixed(2)
}

function couponAmountSymbol() {
  return props.currency === 'CNY' ? '¥' : '$'
}

function couponTitle(item: UserCoupon) {
  return appStore.locale === 'zh' ? item.coupon.title.zh : item.coupon.title.en
}

function couponRuleText(item: UserCoupon) {
  const expire =
    appStore.locale === 'zh'
      ? `有效期至 ${new Date(item.expiresAt).toLocaleDateString()}`
      : `Expires ${new Date(item.expiresAt).toLocaleDateString()}`
  let text = `${formatCouponRule(item.coupon, props.currency)} · ${expire}`
  if (item.applicable === false && item.ineligibleReason) {
    text += ` · ${item.ineligibleReason}`
  } else if (item.discountPreview != null && item.applicable !== false) {
    text += ` · ${appStore.locale === 'zh' ? '预计减' : 'Save'} ${formatCouponAmount(item.discountPreview, props.currency)}`
  }
  return text
}

function couponCategories(item: UserCoupon) {
  return formatCouponCategoryNames(item.coupon.categoryIds, categoryMap.value, appStore.locale)
}

function scopeLabel() {
  return appStore.locale === 'zh' ? '适用品类' : 'Categories'
}

function selectLabel(item: UserCoupon) {
  if (item.applicable === false) {
    return appStore.locale === 'zh' ? '不可用' : 'N/A'
  }
  if (model.value === item.id) {
    return appStore.locale === 'zh' ? '已选' : 'Selected'
  }
  return appStore.locale === 'zh' ? '选用' : 'Use'
}

onMounted(async () => {
  categories.value = await getCategories()
})
</script>

<template>
  <div v-loading="loading" class="coupon-picker">
    <p class="picker-title">{{ appStore.locale === 'zh' ? '优惠券' : 'Coupons' }}</p>

    <div class="coupon-list">
      <button
        type="button"
        class="none-option"
        :class="{ 'is-active': model == null }"
        @click="selectCoupon(null)"
      >
        {{ appStore.locale === 'zh' ? '不使用优惠券' : 'No coupon' }}
      </button>

      <div
        v-for="item in coupons"
        :key="item.id"
        class="coupon-select-item"
        :class="{
          'is-active': model === item.id,
          'is-disabled': item.applicable === false,
        }"
        @click="selectCoupon(item.applicable === false ? null : item.id)"
      >
        <CouponTicketCard
          :symbol="couponAmountSymbol()"
          :amount="couponAmountValue(item.coupon)"
          :amount-label="appStore.locale === 'zh' ? '立减' : 'OFF'"
          :title="couponTitle(item)"
          :rule="couponRuleText(item)"
          :scope-label="scopeLabel()"
          :categories="couponCategories(item)"
          :all-categories="!item.coupon.categoryIds?.length"
          :dimmed="item.applicable === false"
        >
          <template #action>
            <div
              class="ticket-side select-strip"
              :class="{
                'is-selected': model === item.id,
                'is-disabled': item.applicable === false,
              }"
            >
              <span class="action-content">
                <el-icon class="action-icon">
                  <CircleCheck v-if="model === item.id" />
                  <Ticket v-else />
                </el-icon>
                <span class="action-text">{{ selectLabel(item) }}</span>
              </span>
            </div>
          </template>
        </CouponTicketCard>
      </div>
    </div>

    <p v-if="!loading && !coupons.length" class="empty-tip">
      {{ appStore.locale === 'zh' ? '暂无可用优惠券' : 'No coupons available' }}
    </p>
    <p v-else-if="!loading && coupons.length && !applicableCoupons.length" class="empty-tip">
      {{
        appStore.locale === 'zh'
          ? `您有 ${coupons.length} 张优惠券，但当前订单均不满足使用条件`
          : `You have ${coupons.length} coupon(s), but none apply to this order`
      }}
    </p>
    <p v-else-if="selectedCoupon?.discountPreview != null" class="selected-tip">
      {{ appStore.locale === 'zh' ? '已选优惠' : 'Selected discount' }}：-{{
        formatCouponAmount(selectedCoupon.discountPreview, currency)
      }}
    </p>
  </div>
</template>

<style scoped>
.coupon-picker {
  margin-bottom: 16px;
}

.picker-title {
  margin: 0 0 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--cb-text-dim);
}

.coupon-list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  max-height: 320px;
  overflow: auto;
  padding-right: 4px;
}

.none-option {
  width: 100%;
  max-width: 300px;
  padding: 10px 12px;
  border: 1px dashed var(--cb-border);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--cb-text-muted);
  font-size: 12px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.none-option:hover {
  border-color: rgba(201, 169, 98, 0.35);
}

.none-option.is-active {
  border-color: rgba(201, 169, 98, 0.55);
  background: rgba(201, 169, 98, 0.1);
  color: var(--cb-accent);
}

.coupon-select-item {
  width: 100%;
  max-width: 300px;
  cursor: pointer;
}

.coupon-select-item.is-disabled {
  cursor: not-allowed;
}

.coupon-select-item.is-active :deep(.coupon-ticket) {
  border-color: rgba(201, 169, 98, 0.55);
  box-shadow: 0 0 0 1px rgba(201, 169, 98, 0.18);
}

.select-strip {
  background: linear-gradient(180deg, rgba(232, 213, 163, 0.95), rgba(201, 169, 98, 0.88));
  color: #1a1410;
}

.select-strip.is-selected {
  background: linear-gradient(180deg, #e8d5a3 0%, #c9a962 55%, #a89060 100%);
}

.select-strip.is-selected .action-icon {
  color: #1a1410;
}

.select-strip.is-disabled {
  background: rgba(138, 136, 128, 0.12);
  color: var(--cb-text-muted);
  box-shadow: none;
}

.empty-tip,
.selected-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.selected-tip {
  color: var(--cb-accent);
}
</style>
