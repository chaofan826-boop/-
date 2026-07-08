<script setup lang="ts">

import { computed, onMounted, reactive, ref } from 'vue'

import { useRouter } from 'vue-router'

import { ElMessage, ElMessageBox, type UploadRequestOptions } from 'element-plus'

import { Camera, CircleCheck, Clock, List, Location, SwitchButton, Ticket } from '@element-plus/icons-vue'
import { getMyCoupons, type UserCoupon } from '@/api/coupon'
import { getCategories } from '@/api/product'
import CouponTicketCard from '@/components/CouponTicketCard.vue'

import { changePassword } from '@/api/auth'
import ShippingAddressManager from '@/components/ShippingAddressManager.vue'

import { uploadAvatar } from '@/api/upload'

import { useAppStore } from '@/stores/app'
import { formatCouponCategoryNames, formatCouponRule, resolveCouponAmount } from '@/utils/coupon-amount'
import type { Category } from '@/types/product'

import { useUserStore } from '@/stores/user'

import { formatPhoneDisplay, getRegionLabel } from '@/constants/regions'



const router = useRouter()

const userStore = useUserStore()

const appStore = useAppStore()

const avatarUploading = ref(false)

const logoutLoading = ref(false)

const passwordLoading = ref(false)
const couponsLoading = ref(false)
const couponTab = ref<'available' | 'used' | 'expired'>('available')
const activeSection = ref<'coupons' | 'settings' | 'addresses'>('coupons')
const coupons = ref<UserCoupon[]>([])
const categories = ref<Category[]>([])

const categoryMap = computed(
  () => new Map(categories.value.map((item) => [item.id, item.name])),
)

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/

const passwordForm = reactive({

  currentPassword: '',

  newPassword: '',

  confirmPassword: '',

})



function beforeAvatarUpload(file: File) {

  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  if (!allowed.includes(file.type)) {

    ElMessage.warning('仅支持 JPG、PNG、GIF、WebP 格式')

    return false

  }

  if (file.size > 2 * 1024 * 1024) {

    ElMessage.warning('图片大小不能超过 2MB')

    return false

  }

  return true

}



async function handleAvatarUpload(options: UploadRequestOptions) {

  avatarUploading.value = true

  try {

    const res = await uploadAvatar(options.file as File)

    await userStore.updateProfile({ avatar: res.url })

    ElMessage.success('头像已更新')

    options.onSuccess?.(res)

  } catch (err) {

    options.onError?.(err as never)

  } finally {

    avatarUploading.value = false

  }

}



async function handleRemoveAvatar() {

  try {

    await ElMessageBox.confirm('确定移除当前头像？', '移除头像', {

      type: 'warning',

      confirmButtonText: '移除',

      cancelButtonText: '取消',

    })

  } catch {

    return

  }

  await userStore.updateProfile({ avatar: null })

  ElMessage.success('头像已移除')

}



async function handlePasswordSubmit() {
  if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    ElMessage.warning('请填写完整密码信息')
    return
  }
  if (!PASSWORD_PATTERN.test(passwordForm.newPassword)) {
    ElMessage.warning('新密码至少 6 位，须同时包含字母和数字')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }

  passwordLoading.value = true
  try {
    await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    ElMessage.success('密码已修改，请重新登录')
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    await userStore.logout()
    router.push('/login')
  } finally {
    passwordLoading.value = false
  }
}

async function handleLogout() {

  try {

    await ElMessageBox.confirm('确定退出当前账号？', '退出登录', {

      type: 'warning',

      confirmButtonText: '退出',

      cancelButtonText: '取消',

      confirmButtonClass: 'el-button--danger',

    })

  } catch {

    return

  }



  logoutLoading.value = true

  try {

    await userStore.logout()

    ElMessage.success('已退出登录')

    router.push('/login')

  } finally {

    logoutLoading.value = false

  }

}



function setSection(section: 'coupons' | 'settings' | 'addresses') {
  activeSection.value = section
}

function couponAmountValue(coupon: UserCoupon['coupon']) {
  const discount = resolveCouponAmount(coupon.discountAmounts, appStore.currency)
  return Number.isInteger(discount) ? String(discount) : discount.toFixed(2)
}

function couponAmountSymbol() {
  return appStore.currency === 'CNY' ? '¥' : '$'
}

function couponTitle(item: UserCoupon) {
  return appStore.locale === 'zh' ? item.coupon.title.zh : item.coupon.title.en
}

function couponRuleText(item: UserCoupon) {
  const expire =
    appStore.locale === 'zh'
      ? `有效期至 ${new Date(item.expiresAt).toLocaleDateString()}`
      : `Expires ${new Date(item.expiresAt).toLocaleDateString()}`
  return `${formatCouponRule(item.coupon, appStore.currency)} · ${expire}`
}

function couponCategories(item: UserCoupon) {
  return formatCouponCategoryNames(item.coupon.categoryIds, categoryMap.value, appStore.locale)
}

function couponScopeLabel() {
  return appStore.locale === 'zh' ? '适用品类' : 'Categories'
}

function couponStatusShort(status: UserCoupon['status']) {
  if (status === 'available') return appStore.locale === 'zh' ? '可用' : 'Valid'
  if (status === 'used') return appStore.locale === 'zh' ? '已用' : 'Used'
  return appStore.locale === 'zh' ? '过期' : 'Expired'
}

async function loadCoupons() {
  couponsLoading.value = true
  try {
    if (!categories.value.length) {
      categories.value = await getCategories()
    }
    coupons.value = await getMyCoupons(couponTab.value)
  } finally {
    couponsLoading.value = false
  }
}

async function handleCouponTabChange() {
  await loadCoupons()
}

onMounted(async () => {
  if (!userStore.user) await userStore.fetchProfile()
  await loadCoupons()
})

</script>



<template>

  <div class="user-center-page">

    <h2 class="page-title">用户中心</h2>



    <div class="user-center-layout">

      <aside class="profile-sidebar">

        <el-card shadow="never" class="profile-card">

          <el-avatar :size="64" :src="userStore.user?.avatar || undefined" class="user-avatar">

            {{ userStore.user?.name?.[0] || 'U' }}

          </el-avatar>

          <h3>{{ userStore.user?.name }}</h3>

          <p v-if="userStore.user?.email">{{ userStore.user.email }}</p>

          <p v-if="userStore.user?.phone">{{ formatPhoneDisplay(userStore.user.region, userStore.user.phone) }}</p>

          <el-tag size="small">{{ userStore.user?.role }}</el-tag>



          <nav class="profile-nav">

            <button type="button" class="nav-link" @click="router.push('/orders')">

              <el-icon><List /></el-icon>

              <span>我的订单</span>

            </button>



            <button type="button" class="nav-link" @click="router.push('/browse-history')">

              <el-icon><Clock /></el-icon>

              <span>浏览记录</span>

            </button>



            <button
              type="button"
              class="nav-link"
              :class="{ 'is-active': activeSection === 'coupons' }"
              @click="setSection('coupons')"
            >

              <el-icon><Ticket /></el-icon>

              <span>我的优惠券</span>

            </button>



            <button
              type="button"
              class="nav-link"
              :class="{ 'is-active': activeSection === 'addresses' }"
              @click="setSection('addresses')"
            >

              <el-icon><Location /></el-icon>

              <span>收货地址</span>

            </button>



            <button
              type="button"
              class="nav-link"
              :class="{ 'is-active': activeSection === 'settings' }"
              @click="setSection('settings')"
            >

              <el-icon><Camera /></el-icon>

              <span>账户设置</span>

            </button>

          </nav>



          <div class="profile-footer">

            <button type="button" class="logout-btn" :disabled="logoutLoading" @click="handleLogout">

              <el-icon class="logout-icon"><SwitchButton /></el-icon>

              <span>{{ logoutLoading ? '退出中...' : '退出登录' }}</span>

            </button>

          </div>

        </el-card>

      </aside>



      <main class="user-center-main">

        <el-card v-show="activeSection === 'coupons'" shadow="never" class="panel-card coupon-card">

          <div class="panel-header">
            <h3 class="panel-title">我的优惠券</h3>
            <el-radio-group v-model="couponTab" size="small" @change="handleCouponTabChange">
              <el-radio-button value="available">可使用</el-radio-button>
              <el-radio-button value="used">已使用</el-radio-button>
              <el-radio-button value="expired">已过期</el-radio-button>
            </el-radio-group>
          </div>

          <div v-loading="couponsLoading" class="coupon-list">
            <CouponTicketCard
              v-for="item in coupons"
              :key="item.id"
              :symbol="couponAmountSymbol()"
              :amount="couponAmountValue(item.coupon)"
              :amount-label="appStore.locale === 'zh' ? '立减' : 'OFF'"
              :title="couponTitle(item)"
              :rule="couponRuleText(item)"
              :scope-label="couponScopeLabel()"
              :categories="couponCategories(item)"
              :all-categories="!item.coupon.categoryIds?.length"
              :dimmed="item.status !== 'available'"
            >
              <template #action>
                <div class="ticket-side status-strip" :class="`is-${item.status}`">
                  <span class="action-content">
                    <el-icon class="action-icon">
                      <Ticket v-if="item.status === 'available'" />
                      <CircleCheck v-else-if="item.status === 'used'" />
                      <Clock v-else />
                    </el-icon>
                    <span class="action-text">{{ couponStatusShort(item.status) }}</span>
                  </span>
                </div>
              </template>
            </CouponTicketCard>
            <el-empty v-if="!couponsLoading && !coupons.length" class="coupon-empty" description="暂无优惠券" />
          </div>

        </el-card>



        <el-card v-show="activeSection === 'settings'" shadow="never" class="panel-card">

          <h3 class="panel-title">账户设置</h3>



          <div class="settings-section">

            <p class="settings-label">头像</p>

            <div class="avatar-edit-row">

              <el-upload

                class="avatar-uploader"

                :show-file-list="false"

                accept="image/jpeg,image/png,image/gif,image/webp"

                :http-request="handleAvatarUpload"

                :before-upload="beforeAvatarUpload"

                :disabled="avatarUploading"

              >

                <div class="avatar-edit-wrap">

                  <el-avatar :size="72" :src="userStore.user?.avatar || undefined" class="edit-avatar">

                    {{ userStore.user?.name?.[0] || 'U' }}

                  </el-avatar>

                  <span class="avatar-edit-mask">

                    <el-icon><Camera /></el-icon>

                    {{ avatarUploading ? '上传中...' : '更换头像' }}

                  </span>

                </div>

              </el-upload>

              <div class="avatar-edit-hint">

                <p>支持 JPG、PNG、GIF、WebP，大小不超过 2MB</p>

                <el-button

                  v-if="userStore.user?.avatar"

                  link

                  type="danger"

                  @click="handleRemoveAvatar"

                >

                  移除头像

                </el-button>

              </div>

            </div>

          </div>



          <el-descriptions :column="2" border class="settings-desc">

            <el-descriptions-item label="用户名">{{ userStore.user?.name }}</el-descriptions-item>

            <el-descriptions-item label="邮箱">{{ userStore.user?.email || '-' }}</el-descriptions-item>

            <el-descriptions-item label="地区">{{ getRegionLabel(userStore.user?.region) }}</el-descriptions-item>

            <el-descriptions-item label="手机">

              {{ formatPhoneDisplay(userStore.user?.region, userStore.user?.phone) || '-' }}

            </el-descriptions-item>

            <el-descriptions-item label="默认币种">{{ appStore.currency }}</el-descriptions-item>

          </el-descriptions>



          <div class="settings-section password-section">

            <p class="settings-label">修改密码</p>

            <el-form label-width="96px" class="password-form" @submit.prevent="handlePasswordSubmit">

              <el-form-item label="当前密码">

                <el-input

                  v-model="passwordForm.currentPassword"

                  type="password"

                  show-password

                  placeholder="请输入当前密码"

                />

              </el-form-item>

              <el-form-item label="新密码">

                <el-input

                  v-model="passwordForm.newPassword"

                  type="password"

                  show-password

                  placeholder="至少 6 位，须含字母和数字"

                />

              </el-form-item>

              <el-form-item label="确认新密码">

                <el-input

                  v-model="passwordForm.confirmPassword"

                  type="password"

                  show-password

                  placeholder="再次输入新密码"

                />

              </el-form-item>

              <el-form-item>

                <el-button type="primary" :loading="passwordLoading" @click="handlePasswordSubmit">

                  修改密码

                </el-button>

              </el-form-item>

            </el-form>

          </div>



        </el-card>



        <div v-show="activeSection === 'addresses'" class="addresses-panel">

          <ShippingAddressManager />

        </div>

      </main>

    </div>

  </div>

</template>



<style scoped>

.user-center-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 20px;
  align-items: start;
}

.profile-sidebar {
  position: sticky;
  top: 88px;
}

.profile-card {
  text-align: center;
  border-radius: 12px;
}

.user-avatar {
  margin: 0 auto 10px;
  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark)) !important;
  color: #0a0a0c !important;
  font-weight: 700;
}

.profile-card h3 {
  margin-bottom: 4px;
  font-size: 17px;
}

.profile-card p {
  font-size: 12px;
  color: var(--cb-text-muted);
  margin-bottom: 2px;
}

.profile-nav {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 16px;
}

.nav-link {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid var(--cb-border);
  background: transparent;
  color: var(--cb-text-dim);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
}

.nav-link:hover {
  background: rgba(201, 169, 98, 0.08);
  border-color: rgba(201, 169, 98, 0.35);
  color: var(--cb-accent);
}

.nav-link.is-active {
  background: rgba(201, 169, 98, 0.12);
  border-color: var(--cb-accent);
  color: var(--cb-accent);
  font-weight: 600;
}

.profile-footer {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--cb-border);
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.06);
  color: #f87171;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;
}

.logout-btn:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.12);
  border-color: #f87171;
  box-shadow: 0 0 12px rgba(248, 113, 113, 0.2);
}

.logout-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.logout-icon {
  font-size: 16px;
}

.user-center-main {
  min-height: 420px;
}

.panel-card {
  border-radius: 12px;
}

.panel-title {
  margin: 0 0 16px;
  font-family: var(--cb-font-display);
  font-size: 18px;
  letter-spacing: 0.04em;
  color: var(--cb-text);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.panel-header .panel-title {
  margin-bottom: 0;
}

.settings-section {
  margin-bottom: 16px;
}

.settings-label {
  margin: 0 0 10px;
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--cb-neon-cyan);
  opacity: 0.7;
  text-transform: uppercase;
}

.avatar-edit-row {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.avatar-uploader :deep(.el-upload) {
  border: none;
  cursor: pointer;
}

.avatar-edit-wrap {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  overflow: hidden;
}

.edit-avatar {
  width: 72px !important;
  height: 72px !important;
  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark)) !important;
  color: #0a0a0c !important;
  font-weight: 700;
}

.avatar-edit-mask {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.avatar-edit-wrap:hover .avatar-edit-mask {
  opacity: 1;
}

.avatar-edit-hint {
  font-size: 13px;
  color: var(--cb-text-muted);
  line-height: 1.5;
}

.avatar-edit-hint p {
  margin: 0 0 4px;
}

.settings-desc {
  margin-top: 4px;
}

.password-section {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--cb-border);
}

.password-form {
  max-width: 420px;
}

.password-form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.password-form :deep(.el-form-item__label) {
  color: var(--cb-text-dim);
}

.coupon-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
  max-height: min(480px, calc(100vh - 240px));
  overflow-y: auto;
  padding-right: 4px;
  align-content: start;
}

.coupon-list :deep(.coupon-ticket) {
  max-width: none;
  width: 100%;
}

.coupon-empty {
  grid-column: 1 / -1;
  padding: 24px 0;
}

.addresses-panel :deep(.el-card) {
  border-radius: 12px;
}

.status-strip.is-available {
  background: linear-gradient(180deg, #e8d5a3 0%, #c9a962 55%, #a89060 100%);
  color: #1a1410;
}

.status-strip.is-used {
  background: rgba(201, 169, 98, 0.08);
  color: var(--cb-text-muted);
  box-shadow: none;
}

.status-strip.is-used .action-icon {
  color: #95d475;
}

.status-strip.is-expired {
  background: rgba(138, 136, 128, 0.12);
  color: var(--cb-text-muted);
  box-shadow: none;
}

.status-strip.is-expired .action-icon {
  color: var(--cb-text-muted);
}

@media (max-width: 900px) {
  .user-center-layout {
    grid-template-columns: 1fr;
  }

  .profile-sidebar {
    position: static;
  }

  .profile-nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .profile-footer {
    grid-column: 1 / -1;
  }

  .settings-desc :deep(.el-descriptions) {
    --el-descriptions-item-bordered-label-background: transparent;
  }
}

@media (max-width: 520px) {
  .profile-nav {
    grid-template-columns: 1fr;
  }

  .coupon-list {
    grid-template-columns: 1fr;
    max-height: none;
  }
}

</style>


