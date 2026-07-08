<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { CircleCheck, Close, Ticket, User } from '@element-plus/icons-vue'
import { claimCoupon, getHomeClaimableCoupons, getMyCoupons, type Coupon } from '@/api/coupon'
import { getCategories } from '@/api/product'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import type { Category } from '@/types/product'
import { formatCouponCategoryNames, formatCouponRule, resolveCouponAmount } from '@/utils/coupon-amount'
import CouponTicketCard from '@/components/CouponTicketCard.vue'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()

const expanded = ref(false)
const loading = ref(false)
const claimingId = ref<number | null>(null)
const coupons = ref<Coupon[]>([])
const categories = ref<Category[]>([])
const claimedCouponIds = ref<Set<number>>(new Set())

const categoryMap = computed(
  () => new Map(categories.value.map((item) => [item.id, item.name])),
)

const panelVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit('update:visible', value),
})

const displayCoupons = computed(() => coupons.value.slice(0, 3))

const claimableCount = computed(() => {
  if (!userStore.token) return displayCoupons.value.length
  return displayCoupons.value.filter((coupon) => canClaim(coupon)).length
})

async function loadCoupons() {
  if (!panelVisible.value) return
  loading.value = true
  try {
    const [couponList, categoryList] = await Promise.all([
      getHomeClaimableCoupons(),
      getCategories(),
    ])
    coupons.value = couponList
    categories.value = categoryList
    if (userStore.token) {
      const mine = await getMyCoupons()
      claimedCouponIds.value = new Set(mine.map((item) => item.couponId))
    } else {
      claimedCouponIds.value = new Set()
    }
  } finally {
    loading.value = false
  }
}

function canClaim(coupon: Coupon) {
  if (!userStore.token) return true
  const count = claimedCouponIds.value.has(coupon.id) ? 1 : 0
  return count < coupon.perUserLimit
}

function couponAmountValue(coupon: Coupon) {
  const discount = resolveCouponAmount(coupon.discountAmounts, appStore.currency)
  return Number.isInteger(discount) ? String(discount) : discount.toFixed(2)
}

function couponAmountSymbol() {
  return appStore.currency === 'CNY' ? '¥' : '$'
}

function couponRule(coupon: Coupon) {
  const validity = appStore.locale === 'zh' ? `${coupon.validityDays} 天有效` : `${coupon.validityDays} days valid`
  return `${formatCouponRule(coupon, appStore.currency)} · ${validity}`
}

function couponTitle(coupon: Coupon) {
  return appStore.locale === 'zh' ? coupon.title.zh : coupon.title.en
}

function couponCategories(coupon: Coupon) {
  return formatCouponCategoryNames(coupon.categoryIds, categoryMap.value, appStore.locale)
}

function couponScopeLabel() {
  return appStore.locale === 'zh' ? '适用品类' : 'Categories'
}

function claimButtonState(coupon: Coupon) {
  if (claimingId.value === coupon.id) return 'loading'
  if (!userStore.token) return 'login'
  if (!canClaim(coupon)) return 'claimed'
  return 'ready'
}

function claimLabel(coupon: Coupon) {
  const state = claimButtonState(coupon)
  if (state === 'loading') return ''
  if (state === 'login') return appStore.locale === 'zh' ? '登录领' : 'Login'
  if (state === 'claimed') return appStore.locale === 'zh' ? '已领' : 'Got'
  return appStore.locale === 'zh' ? '领取' : 'Claim'
}

async function handleClaim(coupon: Coupon) {
  if (!userStore.token) {
    ElMessage.info('请先登录后领取优惠券')
    router.push('/login')
    return
  }
  if (!canClaim(coupon)) return

  claimingId.value = coupon.id
  try {
    await claimCoupon(coupon.id)
    claimedCouponIds.value.add(coupon.id)
    ElMessage.success('领取成功，可在个人中心查看')
  } catch {
    ElMessage.error('领取失败，请稍后重试')
  } finally {
    claimingId.value = null
  }
}

watch(panelVisible, (visible) => {
  if (visible) loadCoupons()
})

onMounted(() => {
  if (panelVisible.value) loadCoupons()
})
</script>

<template>
  <transition name="float-coupon-fade">
    <div v-if="panelVisible && displayCoupons.length" class="floating-coupon-wrap">
      <button
        type="button"
        class="floating-coupon-toggle"
        :class="{ 'is-expanded': expanded }"
        aria-label="优惠券"
        @click="expanded = !expanded"
      >
        <span class="floating-coupon-ring" aria-hidden="true" />
        <span class="floating-coupon-shine" aria-hidden="true" />
        <span class="toggle-inner">
          <el-icon class="toggle-icon"><Ticket /></el-icon>
          <span class="toggle-text">{{ appStore.locale === 'zh' ? '领券' : 'Get' }}</span>
        </span>
        <span v-if="claimableCount > 0 && !expanded" class="toggle-badge">{{ claimableCount }}</span>
      </button>

      <transition name="coupon-panel-slide">
        <div v-if="expanded" class="floating-coupon-panel">
          <div class="panel-glow" aria-hidden="true" />
          <div class="panel-header">
            <div class="panel-title-wrap">
              <span class="panel-icon"><el-icon><Ticket /></el-icon></span>
              <div>
                <strong class="panel-title">限时优惠券</strong>
                <p class="panel-subtitle">登录即可领取，下单自动抵扣</p>
              </div>
            </div>
            <button type="button" class="panel-close" aria-label="关闭" @click="expanded = false">
              <el-icon><Close /></el-icon>
            </button>
          </div>

          <div v-loading="loading" class="panel-list">
            <CouponTicketCard
              v-for="(coupon, index) in displayCoupons"
              :key="coupon.id"
              :symbol="couponAmountSymbol()"
              :amount="couponAmountValue(coupon)"
              :amount-label="appStore.locale === 'zh' ? '立减' : 'OFF'"
              :title="couponTitle(coupon)"
              :rule="couponRule(coupon)"
              :scope-label="couponScopeLabel()"
              :categories="couponCategories(coupon)"
              :all-categories="!coupon.categoryIds?.length"
              :dimmed="!!userStore.token && !canClaim(coupon)"
              animate
              :delay="`${index * 0.06}s`"
            >
              <template #action>
                <button
                  type="button"
                  class="ticket-side claim-btn"
                  :class="`is-${claimButtonState(coupon)}`"
                  :disabled="claimButtonState(coupon) === 'claimed' || claimButtonState(coupon) === 'loading'"
                  @click="handleClaim(coupon)"
                >
                  <span v-if="claimButtonState(coupon) === 'loading'" class="claim-loading" />
                  <span v-else class="action-content">
                    <el-icon class="action-icon">
                      <User v-if="claimButtonState(coupon) === 'login'" />
                      <CircleCheck v-else-if="claimButtonState(coupon) === 'claimed'" />
                      <Ticket v-else />
                    </el-icon>
                    <span class="action-text">{{ claimLabel(coupon) }}</span>
                  </span>
                </button>
              </template>
            </CouponTicketCard>
          </div>
        </div>
      </transition>
    </div>
  </transition>
</template>

<style scoped>
.floating-coupon-wrap {
  position: fixed;
  left: 24px;
  bottom: 120px;
  z-index: 90;
}

.floating-coupon-toggle {
  position: relative;
  width: 52px;
  height: 52px;
  padding: 0;
  border: 1px solid rgba(232, 213, 163, 0.4);
  border-radius: 50%;
  background: linear-gradient(160deg, #f0e2bc 0%, #c9a962 48%, #9a8048 100%);
  color: #1a1410;
  cursor: pointer;
  box-shadow:
    0 10px 28px rgba(201, 169, 98, 0.32),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
  animation: coupon-float 3.2s ease-in-out infinite;
  overflow: visible;
  display: flex;
  align-items: center;
  justify-content: center;
}

.floating-coupon-toggle:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 240, 210, 0.55);
  box-shadow:
    0 14px 32px rgba(201, 169, 98, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

.floating-coupon-toggle.is-expanded {
  animation: none;
  transform: scale(0.94);
  border-color: rgba(201, 169, 98, 0.55);
  background: linear-gradient(160deg, #c9a962 0%, #a89060 55%, #8b7355 100%);
}

.toggle-inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 100%;
  height: 100%;
  line-height: 1;
}

.toggle-icon {
  font-size: 21px;
  line-height: 1;
}

.toggle-icon :deep(svg) {
  display: block;
}

.toggle-text {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.06em;
  line-height: 1;
  transform: scale(0.92);
  white-space: nowrap;
}

.floating-coupon-toggle.is-expanded .toggle-inner {
  opacity: 0.92;
}

.toggle-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  z-index: 2;
  min-width: 17px;
  height: 17px;
  padding: 0 4px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 999px;
  background: linear-gradient(135deg, #f07171, #d84a4a);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 15px;
  text-align: center;
  box-shadow: 0 3px 10px rgba(216, 74, 74, 0.45);
}

.floating-coupon-ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 1px solid rgba(201, 169, 98, 0.5);
  animation: coupon-pulse 2.4s ease-out infinite;
  pointer-events: none;
}

.floating-coupon-shine {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: linear-gradient(120deg, transparent 35%, rgba(255, 255, 255, 0.35) 50%, transparent 65%);
  animation: coupon-shine 4s ease-in-out infinite;
  pointer-events: none;
}

.floating-coupon-panel {
  position: absolute;
  left: 64px;
  bottom: 0;
  width: 300px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--cb-border);
  background: rgba(18, 18, 22, 0.94);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  box-shadow: var(--cb-shadow-elevated);
  overflow: hidden;
}

.panel-glow {
  position: absolute;
  top: -40px;
  right: -20px;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 169, 98, 0.18), transparent 70%);
  pointer-events: none;
}

.panel-header {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.panel-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.panel-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: rgba(201, 169, 98, 0.12);
  border: 1px solid rgba(201, 169, 98, 0.22);
  color: var(--cb-accent);
}

.panel-title {
  display: block;
  font-family: var(--cb-font-display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--cb-text);
}

.panel-subtitle {
  margin: 4px 0 0;
  font-size: 11px;
  color: var(--cb-text-muted);
}

.panel-close {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 1px solid var(--cb-border);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--cb-text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: border-color 0.2s ease, color 0.2s ease;
}

.panel-close:hover {
  border-color: var(--cb-border-hover);
  color: var(--cb-text);
}

.panel-list {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.claim-btn {
  cursor: pointer;
  transition: filter 0.2s ease, background 0.2s ease;
}

.claim-btn.is-ready:hover {
  filter: brightness(1.08);
}

.claim-btn.is-ready {
  animation: claim-glow 2.4s ease-in-out infinite;
}

.claim-btn.is-login {
  background: linear-gradient(180deg, rgba(232, 213, 163, 0.95), rgba(201, 169, 98, 0.88));
}

.claim-btn.is-login:hover {
  filter: brightness(1.06);
}

.claim-btn.is-claimed {
  background: rgba(201, 169, 98, 0.08);
  color: var(--cb-text-muted);
  box-shadow: none;
  cursor: default;
}

.claim-btn.is-claimed .action-icon {
  color: #95d475;
}

.claim-btn.is-claimed .action-text {
  color: var(--cb-text-muted);
}

.claim-btn.is-loading {
  background: rgba(201, 169, 98, 0.15);
  cursor: wait;
}

.claim-loading {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(26, 20, 16, 0.2);
  border-top-color: #1a1410;
  border-radius: 50%;
  animation: claim-spin 0.7s linear infinite;
}

@keyframes claim-glow {
  0%,
  100% {
    box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow:
      inset 1px 0 0 rgba(255, 255, 255, 0.28),
      0 0 12px rgba(201, 169, 98, 0.35);
  }
}

.float-coupon-fade-enter-active,
.float-coupon-fade-leave-active,
.coupon-panel-slide-enter-active,
.coupon-panel-slide-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.float-coupon-fade-enter-from,
.float-coupon-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

.coupon-panel-slide-enter-from,
.coupon-panel-slide-leave-to {
  opacity: 0;
  transform: translateX(-8px) scale(0.98);
}

@keyframes coupon-pulse {
  0% {
    transform: scale(1);
    opacity: 0.75;
  }
  70% {
    transform: scale(1.2);
    opacity: 0;
  }
  100% {
    transform: scale(1.2);
    opacity: 0;
  }
}

@keyframes coupon-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

@keyframes coupon-shine {
  0%,
  100% {
    transform: translateX(-120%) rotate(0deg);
    opacity: 0;
  }
  45% {
    opacity: 1;
  }
  55% {
    transform: translateX(120%) rotate(0deg);
    opacity: 0;
  }
}

@keyframes claim-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .floating-coupon-wrap {
    left: 16px;
    bottom: 96px;
  }

  .floating-coupon-panel {
    left: 0;
    bottom: 68px;
    width: min(320px, calc(100vw - 32px));
  }
}
</style>
