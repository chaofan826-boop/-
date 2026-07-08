<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Menu, Search, Service, ShoppingCart, Top, User } from '@element-plus/icons-vue'
import { getChatUnreadCount } from '@/api/chat'
import { getCategories } from '@/api/product'
import ChatPanel from '@/components/ChatPanel.vue'
import FloatingCoupon from '@/components/FloatingCoupon.vue'
import { useAppStore } from '@/stores/app'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'
import type { Category } from '@/types/product'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const cartStore = useCartStore()
const userStore = useUserStore()

const menuOpen = ref(false)
const searchKeyword = ref('')
const categories = ref<Category[]>([])
const selectedCategoryId = ref<number | undefined>()
const chatOpen = ref(false)
const chatUnreadCount = ref(0)
const showBackTop = ref(false)

let chatUnreadPollTimer: ReturnType<typeof setInterval> | null = null

function onScroll() {
  showBackTop.value = window.scrollY > 320
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

type NavLink = {
  path: string
  label: string
  auth?: boolean
}

const navLinks: NavLink[] = [
  { path: '/', label: '首页' },
  { path: '/browse-history', label: '浏览记录', auth: true },
  { path: '/orders', label: '我的订单', auth: true },
]

const isActive = (path: string) => {
  if (path === '/orders') {
    return route.path === '/orders' || /^\/orders\/[^/]+/.test(route.path)
  }
  if (path === '/browse-history') {
    return route.path === '/browse-history'
  }
  return route.path === path
}

const showNavBack = computed(() => {
  if (chatOpen.value) return false
  return route.path !== '/'
})

const showFloatingCart = computed(() => route.path !== '/cart')

const isHomePage = computed(() => route.path === '/')

const userDisplayName = computed(() => userStore.user?.name?.trim() || '')

const userInitial = computed(() => {
  const name = userDisplayName.value
  if (name) return name.charAt(0).toUpperCase()
  return 'U'
})

function goBack() {
  menuOpen.value = false
  if (window.history.state?.back) {
    router.back()
    return
  }
  router.push('/')
}

function categoryLabel(cat: Category) {
  return appStore.locale === 'zh' ? cat.name.zh : cat.name.en
}

function syncSearchFromRoute() {
  if (route.path === '/search') {
    searchKeyword.value = typeof route.query.keyword === 'string' ? route.query.keyword : ''
  }
}

function syncCategoryFromRoute() {
  const match = route.path.match(/^\/categories\/(\d+)/)
  if (match) {
    const id = Number(match[1])
    selectedCategoryId.value = Number.isFinite(id) ? id : undefined
    return
  }
  selectedCategoryId.value = undefined
}

function navigate(path: string) {
  menuOpen.value = false
  router.push(path)
}

function navigateNav(link: NavLink) {
  menuOpen.value = false
  if (link.auth && !userStore.token) {
    ElMessage.warning('请先登录后查看订单')
    router.push({ path: '/login', query: { redirect: link.path } })
    return
  }
  router.push(link.path)
}

function submitSearch() {
  menuOpen.value = false
  const keyword = searchKeyword.value.trim()
  router.push({ path: '/search', query: keyword ? { keyword } : {} })
}

function handleCategoryChange(id: number | undefined) {
  menuOpen.value = false
  if (!id) {
    router.push('/')
    return
  }
  router.push(`/categories/${id}`)
}

function openChat() {
  menuOpen.value = false
  if (!userStore.token) {
    ElMessage.warning('请先登录后再联系客服')
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  chatUnreadCount.value = 0
  chatOpen.value = true
}

async function loadChatUnreadCount() {
  if (!userStore.token || chatOpen.value) {
    if (!userStore.token) chatUnreadCount.value = 0
    return
  }
  try {
    const res = await getChatUnreadCount()
    chatUnreadCount.value = res.total
  } catch {
    // ignore polling errors
  }
}

function startChatUnreadPolling() {
  stopChatUnreadPolling()
  loadChatUnreadCount()
  chatUnreadPollTimer = setInterval(loadChatUnreadCount, 5000)
}

function stopChatUnreadPolling() {
  if (chatUnreadPollTimer) {
    clearInterval(chatUnreadPollTimer)
    chatUnreadPollTimer = null
  }
}

async function loadCategories() {
  categories.value = await getCategories()
}

watch(() => [route.path, route.query.keyword] as const, syncSearchFromRoute, { immediate: true })
watch(() => route.path, syncCategoryFromRoute, { immediate: true })

onMounted(() => {
  loadCategories()
  if (userStore.token && !userStore.user) {
    userStore.fetchProfile().catch(() => {})
  }
  startChatUnreadPolling()
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onUnmounted(() => {
  stopChatUnreadPolling()
  window.removeEventListener('scroll', onScroll)
})

watch(
  () => userStore.token,
  () => {
    if (userStore.token) {
      if (!userStore.user) {
        userStore.fetchProfile().catch(() => {})
      }
      startChatUnreadPolling()
    } else {
      chatUnreadCount.value = 0
      stopChatUnreadPolling()
    }
  },
)

watch(chatOpen, (open) => {
  if (!open) {
    loadChatUnreadCount()
  }
})
</script>



<template>

  <div class="store">

    <header class="header" :class="{ 'header--home': isHomePage }">

      <div class="header-glow" />

      <div class="header-inner">

        <div class="header-left">

          <el-button
            v-if="showNavBack"
            class="back-btn"
            :icon="ArrowLeft"
            text
            aria-label="返回"
            @click="goBack"
          />

          <el-button
            v-else
            class="menu-btn"
            :icon="Menu"
            text
            @click="menuOpen = !menuOpen"
          />

          <div class="brand" @click="navigate('/')">

            <span class="brand-icon">

              <span class="brand-icon-inner">CB</span>

            </span>

            <span class="brand-text">

              Cross<span class="gold">Border</span>

            </span>

          </div>

        </div>



        <div class="header-center">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索商品..."
            clearable
            class="search-input"
            @keyup.enter="submitSearch"
            @clear="submitSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button class="search-btn" type="primary" @click="submitSearch">搜索</el-button>
        </div>



        <div class="header-right">
          <nav class="nav-desktop">
            <el-select
              :model-value="selectedCategoryId"
              :placeholder="appStore.locale === 'zh' ? '精选分类' : 'Categories'"
              clearable
              class="category-select"
              @change="handleCategoryChange"
            >
              <el-option
                v-for="cat in categories"
                :key="cat.id"
                :label="categoryLabel(cat)"
                :value="cat.id"
              />
            </el-select>

            <div class="nav-links">
              <a
                v-for="link in navLinks"
                :key="link.path"
                :class="{ active: isActive(link.path) }"
                @click="navigateNav(link)"
              >
                {{ link.label }}
              </a>
            </div>

            <el-badge
              :value="chatUnreadCount"
              :hidden="!chatUnreadCount || !userStore.token"
              class="cs-badge"
            >
              <a class="cs-link" @click="openChat">
                <el-icon class="cs-icon"><Service /></el-icon>
                联系客服
              </a>
            </el-badge>
          </nav>

          <div class="header-actions">

            <el-select

              :model-value="appStore.currency"

              size="small"

              class="currency-select"

              @change="(v: 'USD' | 'CNY') => appStore.setCurrency(v)"

            >

              <el-option label="USD $" value="USD" />

              <el-option label="CNY ¥" value="CNY" />

            </el-select>



            <div v-if="!userStore.token" class="auth-actions">
              <button type="button" class="auth-link" @click="navigate('/register')">注册</button>
              <button type="button" class="auth-login-btn" @click="navigate('/login')">
                <el-icon><User /></el-icon>
                <span>登录</span>
              </button>
            </div>

            <button v-else type="button" class="user-entry" @click="navigate('/user')">
              <el-avatar :size="28" :src="userStore.user?.avatar || undefined" class="header-user-avatar">
                {{ userInitial }}
              </el-avatar>
              <span v-if="userDisplayName" class="user-name">{{ userDisplayName }}</span>
            </button>

          </div>
        </div>

      </div>



      <transition name="slide">

        <nav v-if="menuOpen" class="nav-mobile">

          <div class="mobile-search">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索商品..."
              clearable
              @keyup.enter="submitSearch"
              @clear="submitSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-button type="primary" @click="submitSearch">搜索</el-button>
          </div>

          <el-select
            :model-value="selectedCategoryId"
            :placeholder="appStore.locale === 'zh' ? '精选分类' : 'Categories'"
            clearable
            class="mobile-category-select"
            @change="handleCategoryChange"
          >
            <el-option
              v-for="cat in categories"
              :key="cat.id"
              :label="categoryLabel(cat)"
              :value="cat.id"
            />
          </el-select>

          <a v-for="link in navLinks" :key="link.path" @click="navigateNav(link)">{{ link.label }}</a>

          <a class="mobile-cs-link" @click="openChat">
            联系客服
            <el-badge
              v-if="chatUnreadCount && userStore.token"
              :value="chatUnreadCount"
              class="mobile-cs-badge"
            />
          </a>

          <div v-if="!userStore.token" class="mobile-auth">
            <a class="mobile-auth-login" @click="navigate('/login')">登录</a>
            <a class="mobile-auth-register" @click="navigate('/register')">注册</a>
          </div>

          <a v-else @click="navigate('/user')">用户中心</a>

        </nav>

      </transition>

    </header>



    <main class="main">

      <router-view />

    </main>



    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-line" />
        <p class="footer-tag">LUXURY CROSS-BORDER COMMERCE</p>
        <p>© 2026 CrossBorder · 臻品跨境，全球直邮</p>
      </div>
    </footer>

    <ChatPanel v-model:visible="chatOpen" />

    <FloatingCoupon :visible="isHomePage" />

    <transition name="float-cart-fade">
      <div v-if="showFloatingCart" class="floating-cart-wrap">
        <el-badge
          :value="cartStore.count"
          :hidden="!cartStore.count"
          class="floating-cart-badge"
          :class="{ 'has-items': cartStore.count > 0 }"
        >
          <button
            type="button"
            class="floating-cart-btn"
            :class="{ 'has-items': cartStore.count > 0 }"
            aria-label="购物车"
            @click="navigate('/cart')"
          >
            <span class="floating-cart-ring" aria-hidden="true" />
            <span class="floating-cart-ring floating-cart-ring--delay" aria-hidden="true" />
            <el-icon><ShoppingCart /></el-icon>
          </button>
        </el-badge>
      </div>
    </transition>

    <transition name="back-top-fade">
      <button
        v-show="showBackTop"
        type="button"
        class="back-top-btn"
        aria-label="回到顶部"
        @click="scrollToTop"
      >
        <el-icon><Top /></el-icon>
        <span>顶部</span>
      </button>
    </transition>
  </div>

</template>



<style scoped>

.store {

  min-height: 100vh;

  display: flex;

  flex-direction: column;

}



.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background:
    linear-gradient(180deg, rgba(26, 20, 16, 0.94) 0%, rgba(18, 14, 11, 0.9) 100%);
  backdrop-filter: blur(18px) saturate(1.15);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
  border-bottom: 1px solid rgba(201, 169, 98, 0.16);
  box-shadow: 0 10px 36px rgba(0, 0, 0, 0.28);
}

.header--home {
  background:
    linear-gradient(180deg, rgba(28, 22, 18, 0.96) 0%, rgba(22, 17, 14, 0.92) 100%);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.32),
    0 1px 0 rgba(232, 213, 163, 0.06) inset;
}

.header-glow {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(201, 169, 98, 0.15) 18%,
    var(--cb-accent) 50%,
    rgba(201, 169, 98, 0.15) 82%,
    transparent 100%
  );
  opacity: 0.85;
}

.header-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 14px 28px;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}



.header-left {

  display: flex;

  align-items: center;

  gap: 6px;

  flex-shrink: 0;

}



.header-center {
  flex: 1;
  max-width: 520px;
  min-width: 280px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 auto;
  padding: 5px 6px 5px 16px;
  border-radius: 999px;
  border: 1px solid rgba(201, 169, 98, 0.22);
  background: rgba(18, 14, 11, 0.72);
  box-shadow: inset 0 1px 0 rgba(232, 213, 163, 0.05);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.header-center:focus-within {
  border-color: rgba(201, 169, 98, 0.42);
  box-shadow:
    inset 0 1px 0 rgba(232, 213, 163, 0.08),
    0 0 20px rgba(201, 169, 98, 0.12);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  margin-left: auto;
}



.menu-btn {

  display: none;

  color: var(--cb-text) !important;

}

.back-btn {
  display: inline-flex;
  color: var(--cb-text) !important;
  font-size: 20px;
}

.back-btn:hover {
  color: var(--cb-accent) !important;
}



.brand {

  display: flex;

  align-items: center;

  gap: 10px;

  cursor: pointer;

}



.brand-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  padding: 1px;
  background: linear-gradient(135deg, #e8d5a3, #c9a962 55%, #8b7355);
  box-shadow: 0 4px 16px rgba(201, 169, 98, 0.28);
}

.brand-icon-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: linear-gradient(145deg, #1a1410, #120e0b);
  border-radius: 11px;
  font-family: var(--cb-font-display);
  font-size: 11px;
  font-weight: 900;
  color: var(--cb-gold-light);
  letter-spacing: 0.06em;
}

.brand-text {
  font-family: var(--cb-font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--cb-text);
  letter-spacing: 0.1em;
}

.brand-text .gold {
  color: var(--cb-accent);
}

.brand:hover .brand-icon {
  box-shadow: 0 6px 22px rgba(201, 169, 98, 0.38);
}

.search-input {
  flex: 1;
  min-width: 0;
}

.search-input :deep(.el-input__wrapper) {
  background: transparent;
  border: none;
  box-shadow: none !important;
  padding-left: 0;
}

.search-input :deep(.el-input__inner) {
  color: var(--cb-text);
  font-size: 14px;
}

.search-input :deep(.el-input__inner::placeholder) {
  color: var(--cb-text-muted);
  opacity: 0.9;
}

.search-input :deep(.el-input__prefix) {
  color: var(--cb-accent);
  opacity: 0.75;
}

.search-btn {
  flex-shrink: 0;
  height: 36px;
  padding: 0 18px;
  border: none !important;
  border-radius: 999px !important;
  background: linear-gradient(135deg, #e8d5a3, #c9a962 55%, #a89060) !important;
  color: #16110e !important;
  font-weight: 700;
  letter-spacing: 0.08em;
  box-shadow: 0 4px 14px rgba(201, 169, 98, 0.28);
  transition: transform 0.2s ease, box-shadow 0.25s ease, filter 0.25s ease;
}

.search-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow: 0 6px 20px rgba(201, 169, 98, 0.38);
}

.nav-desktop {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  border: 1px solid rgba(201, 169, 98, 0.14);
  background: rgba(18, 14, 11, 0.55);
}

.category-select {
  width: 128px;
}

.category-select :deep(.el-select__wrapper) {
  background: rgba(18, 14, 11, 0.65);
  border: 1px solid rgba(201, 169, 98, 0.18);
  border-radius: 999px;
  box-shadow: none;
  min-height: 36px;
}

.category-select :deep(.el-select__wrapper:hover),
.category-select :deep(.el-select__wrapper.is-focused) {
  border-color: rgba(201, 169, 98, 0.42);
  background: rgba(22, 17, 14, 0.82);
}

.nav-desktop .nav-links a {
  cursor: pointer;
  color: var(--cb-text-dim);
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.06em;
  padding: 7px 14px;
  border-radius: 999px;
  border: 1px solid transparent;
  transition: color 0.25s ease, background 0.25s ease, border-color 0.25s ease;
  white-space: nowrap;
}

.nav-desktop .nav-links a:hover {
  color: var(--cb-gold-light);
  background: rgba(201, 169, 98, 0.08);
}

.nav-desktop .nav-links a.active {
  color: #16110e;
  background: linear-gradient(135deg, #e8d5a3, #c9a962 58%, #a89060);
  border-color: rgba(232, 213, 163, 0.35);
  box-shadow: 0 4px 14px rgba(201, 169, 98, 0.24);
}

.cs-link {
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  color: var(--cb-text-dim);
  text-decoration: none;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(201, 169, 98, 0.16);
  background: rgba(201, 169, 98, 0.05);
  transition: color 0.25s ease, border-color 0.25s ease, background 0.25s ease;
  white-space: nowrap;
}

.cs-link:hover {
  color: var(--cb-gold-light);
  border-color: rgba(201, 169, 98, 0.35);
  background: rgba(201, 169, 98, 0.1);
}

.mobile-cs-link {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mobile-cs-badge :deep(.el-badge__content) {
  border: none;
  position: static;
  transform: none;
}

.cs-icon {
  font-size: 14px;
}



.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-left: 14px;
  border-left: 1px solid rgba(201, 169, 98, 0.14);
}

.currency-select {
  width: 86px;
}

.currency-select :deep(.el-select__wrapper) {
  background: rgba(18, 14, 11, 0.65);
  border: 1px solid rgba(201, 169, 98, 0.18);
  border-radius: 999px;
  box-shadow: none;
  min-height: 34px;
}

.currency-select :deep(.el-select__wrapper:hover),
.currency-select :deep(.el-select__wrapper.is-focused) {
  border-color: rgba(201, 169, 98, 0.38);
}

.mobile-category-select {
  width: 100%;
  margin-bottom: 8px;
}

.cs-badge :deep(.el-badge__content) {
  border: none;
  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark));
}



.icon-btn {

  background: rgba(201, 169, 98, 0.08) !important;

  border: 1px solid var(--cb-border) !important;

  color: var(--cb-accent) !important;

}



.icon-btn:hover {

  border-color: var(--cb-accent) !important;

  box-shadow: var(--cb-glow-cyan);

}



.auth-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.auth-link {
  padding: 0 4px;
  border: none;
  background: transparent;
  color: var(--cb-text-dim);
  font-family: var(--cb-font-body);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: color 0.25s ease;
}

.auth-link:hover {
  color: var(--cb-gold-light);
}

.auth-login-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 88px;
  height: 36px;
  padding: 0 16px;
  border: 1px solid rgba(201, 169, 98, 0.45);
  border-radius: 999px;
  background: linear-gradient(135deg, #e8d5a3, #c9a962 55%, #a89060);
  color: #0a0a0c;
  font-family: var(--cb-font-body);
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
  box-shadow: 0 4px 18px rgba(201, 169, 98, 0.22);
  transition: transform 0.2s ease, box-shadow 0.25s ease, filter 0.25s ease;
}

.auth-login-btn .el-icon {
  font-size: 15px;
}

.auth-login-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(201, 169, 98, 0.32);
  filter: brightness(1.04);
}

.auth-login-btn:active {
  transform: translateY(0);
}

.user-entry {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 148px;
  height: 36px;
  padding: 0 12px 0 4px;
  border: 1px solid var(--cb-border);
  border-radius: 999px;
  background: rgba(201, 169, 98, 0.08);
  color: var(--cb-text);
  cursor: pointer;
  transition: border-color 0.25s ease, box-shadow 0.25s ease, background 0.25s ease;
}

.user-entry:hover {
  border-color: var(--cb-border-hover);
  background: rgba(201, 169, 98, 0.12);
  box-shadow: var(--cb-glow-cyan);
}

.header-user-avatar {
  flex-shrink: 0;
  background: linear-gradient(135deg, var(--cb-gold-light), var(--cb-accent)) !important;
  color: #0a0a0c;
  font-size: 12px;
  font-weight: 700;
}

.header-user-avatar :deep(img) {
  object-fit: cover;
}

.user-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  font-weight: 500;
  color: var(--cb-text);
}

.mobile-auth {
  display: flex;
  gap: 10px;
  margin-top: 4px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(0, 212, 255, 0.06);
}

.mobile-auth a {
  border-bottom: none;
  padding: 12px 16px !important;
}

.mobile-auth-login,
.mobile-auth-register {
  flex: 1;
  text-align: center;
  padding: 12px 16px !important;
  border-radius: var(--cb-radius-lg);
  font-weight: 600;
  letter-spacing: 0.06em;
}

.mobile-auth-login {
  background: linear-gradient(135deg, #e8d5a3, #c9a962 55%, #a89060) !important;
  color: #0a0a0c !important;
  border: 1px solid rgba(201, 169, 98, 0.45) !important;
}

.mobile-auth-register {
  background: rgba(201, 169, 98, 0.08) !important;
  border: 1px solid var(--cb-border) !important;
  color: var(--cb-gold-light) !important;
}



@media (max-width: 1180px) {
  .user-name {
    display: none;
  }

  .user-entry {
    max-width: none;
    padding: 0 4px;
  }
}

.floating-cart-wrap {
  position: fixed;
  right: 22px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 95;
  animation: cart-wrap-float 2.4s ease-in-out infinite;
}

.floating-cart-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 1px solid rgba(201, 169, 98, 0.55);
  border-radius: 50%;
  background:
    radial-gradient(circle at 30% 25%, rgba(232, 213, 163, 0.22), transparent 58%),
    rgba(22, 17, 14, 0.9);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--cb-accent);
  cursor: pointer;
  box-shadow:
    0 10px 32px rgba(0, 0, 0, 0.34),
    0 0 22px rgba(201, 169, 98, 0.18);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
  animation: cart-glow-pulse 1.8s ease-in-out infinite, cart-btn-breathe 2.4s ease-in-out infinite;
}

.floating-cart-ring {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  border: 2px solid rgba(201, 169, 98, 0.45);
  animation: cart-ring-expand 1.8s cubic-bezier(0.22, 0.61, 0.36, 1) infinite;
  pointer-events: none;
}

.floating-cart-ring--delay {
  animation-delay: 0.9s;
  border-color: rgba(232, 213, 163, 0.35);
}

.floating-cart-btn .el-icon {
  position: relative;
  z-index: 1;
  font-size: 26px;
  animation: cart-icon-sway 2.4s ease-in-out infinite;
  transform-origin: 50% 15%;
}

.floating-cart-btn.has-items {
  animation-duration: 1.2s, 1.6s;
  border-color: rgba(232, 213, 163, 0.65);
}

.floating-cart-btn.has-items .el-icon {
  animation: cart-icon-active 1.1s ease-in-out infinite;
}

.floating-cart-wrap:hover {
  animation-play-state: paused;
}

.floating-cart-wrap:hover .floating-cart-ring {
  animation-play-state: paused;
}

.floating-cart-btn:hover {
  animation-play-state: paused;
  transform: scale(1.12);
  border-color: var(--cb-accent);
  box-shadow:
    0 14px 40px rgba(0, 0, 0, 0.4),
    0 0 40px rgba(201, 169, 98, 0.48);
}

.floating-cart-btn:hover .el-icon {
  animation-play-state: paused;
}

.floating-cart-btn:active {
  transform: scale(0.94);
}

.floating-cart-badge.has-items :deep(.el-badge__content) {
  animation: cart-badge-pop 0.9s ease-in-out infinite;
}

.floating-cart-badge :deep(.el-badge__content) {
  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark));
  border: 1px solid rgba(22, 17, 14, 0.85);
  box-shadow: 0 0 10px rgba(201, 169, 98, 0.35);
}

@keyframes cart-wrap-float {
  0%,
  100% {
    transform: translateY(-50%) scale(1);
  }
  50% {
    transform: translateY(calc(-50% - 18px)) scale(1.04);
  }
}

@keyframes cart-btn-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.08);
  }
}

@keyframes cart-glow-pulse {
  0%,
  100% {
    box-shadow:
      0 10px 32px rgba(0, 0, 0, 0.34),
      0 0 16px rgba(201, 169, 98, 0.2);
  }
  50% {
    box-shadow:
      0 16px 42px rgba(0, 0, 0, 0.4),
      0 0 42px rgba(201, 169, 98, 0.55),
      0 0 64px rgba(232, 213, 163, 0.22);
  }
}

@keyframes cart-ring-expand {
  0% {
    transform: scale(0.85);
    opacity: 0.75;
  }
  100% {
    transform: scale(1.65);
    opacity: 0;
  }
}

@keyframes cart-icon-sway {
  0%,
  100% {
    transform: rotate(-10deg) scale(1);
  }
  50% {
    transform: rotate(10deg) scale(1.08);
  }
}

@keyframes cart-icon-active {
  0%,
  100% {
    transform: rotate(-12deg) translateY(0) scale(1);
  }
  25% {
    transform: rotate(8deg) translateY(-4px) scale(1.1);
  }
  50% {
    transform: rotate(12deg) translateY(-6px) scale(1.14);
  }
  75% {
    transform: rotate(-8deg) translateY(-3px) scale(1.08);
  }
}

@keyframes cart-badge-pop {
  0%,
  100% {
    transform: translateY(-2px) translateX(50%) scale(1);
  }
  50% {
    transform: translateY(-4px) translateX(50%) scale(1.22);
  }
}

@media (prefers-reduced-motion: reduce) {
  .floating-cart-wrap,
  .floating-cart-btn,
  .floating-cart-btn .el-icon,
  .floating-cart-ring,
  .floating-cart-badge.has-items :deep(.el-badge__content) {
    animation: none !important;
  }
}

.float-cart-fade-enter-active,
.float-cart-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.float-cart-fade-enter-from,
.float-cart-fade-leave-to {
  opacity: 0;
  transform: translateY(calc(-50% + 12px));
}



.nav-mobile {
  display: none;
  flex-direction: column;
  padding: 12px 16px 18px;
  border-top: 1px solid rgba(201, 169, 98, 0.14);
  background: linear-gradient(180deg, rgba(26, 20, 16, 0.98), rgba(18, 14, 11, 0.98));
}

.nav-mobile a {
  cursor: pointer;
  color: var(--cb-text-dim);
  text-decoration: none;
  padding: 13px 12px;
  margin-bottom: 2px;
  border-radius: 10px;
  border-bottom: none;
  font-weight: 600;
  letter-spacing: 0.04em;
  transition: color 0.2s ease, background 0.2s ease;
}

.nav-mobile a:hover {
  color: var(--cb-gold-light);
  background: rgba(201, 169, 98, 0.08);
}

.mobile-search {
  display: flex;
  gap: 8px;
  padding: 4px 4px 14px;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(201, 169, 98, 0.14);
}

.mobile-search :deep(.el-input__wrapper) {
  background: rgba(18, 14, 11, 0.85);
  border: 1px solid rgba(201, 169, 98, 0.2);
  border-radius: 999px;
  box-shadow: none;
}

.mobile-search :deep(.el-button) {
  border-radius: 999px !important;
  background: linear-gradient(135deg, #e8d5a3, #c9a962 55%, #a89060) !important;
  border: none !important;
  color: #16110e !important;
  font-weight: 700;
}

.mobile-search :deep(.el-input__inner) {
  color: var(--cb-text);
  font-size: 14px;
}

.mobile-search :deep(.el-input__inner::placeholder) {
  color: var(--cb-text-muted);
  opacity: 0.9;
}



.main {

  flex: 1;

  max-width: 1280px;

  width: 100%;

  margin: 0 auto;

  padding: 24px 16px 48px;

}



.footer {

  background: rgba(6, 11, 24, 0.95);

  border-top: 1px solid var(--cb-border);

  color: var(--cb-text-muted);

  padding: 28px 16px;

  text-align: center;

  font-size: 13px;

}



.footer-line {

  width: 120px;

  height: 2px;

  margin: 0 auto 16px;

  background: linear-gradient(90deg, transparent, var(--cb-accent), transparent);

}



.footer-tag {

  font-family: var(--cb-font-mono);

  font-size: 11px;

  letter-spacing: 0.15em;

  color: var(--cb-accent);

  opacity: 0.6;

  margin-bottom: 8px;

}

.back-top-btn {
  position: fixed;
  right: 24px;
  bottom: 28px;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 52px;
  height: 52px;
  border: 1px solid var(--cb-border);
  border-radius: 50%;
  background: rgba(6, 11, 24, 0.92);
  backdrop-filter: blur(12px);
  color: var(--cb-accent);
  cursor: pointer;
  box-shadow: var(--cb-glow-cyan);
  transition: transform 0.25s, border-color 0.25s, box-shadow 0.25s;
}

.back-top-btn:hover {
  transform: translateY(-3px);
  border-color: var(--cb-accent);
  box-shadow: 0 0 20px rgba(201, 169, 98, 0.35);
}

.back-top-btn .el-icon {
  font-size: 18px;
}

.back-top-btn span {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.back-top-fade-enter-active,
.back-top-fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.back-top-fade-enter-from,
.back-top-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 768px) {

  .floating-cart-wrap {
    right: 14px;
  }

  .floating-cart-btn {
    width: 50px;
    height: 50px;
  }

  .floating-cart-btn .el-icon {
    font-size: 22px;
  }

  .back-top-btn {
    right: 16px;
    bottom: 20px;
    width: 48px;
    height: 48px;
  }

  .header-inner {
    padding: 16px 16px;
    min-height: 60px;
    gap: 12px;
  }

  .header-center {
    display: none;
  }

  .header-right {
    display: none;
  }

  .menu-btn {

    display: inline-flex;

  }



  .nav-mobile {

    display: flex;

  }



  .brand-text {

    font-size: 14px;

  }

}

</style>


