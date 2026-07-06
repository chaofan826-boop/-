<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Menu, Search, Service, ShoppingCart, Top, User } from '@element-plus/icons-vue'
import { getChatUnreadCount } from '@/api/chat'
import { getCategories } from '@/api/product'
import ChatPanel from '@/components/ChatPanel.vue'
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

const navLinks = [
  { path: '/', label: '首页' },
  { path: '/cart', label: '购物车' },
]

const isActive = (path: string) => route.path === path

function categoryLabel(cat: Category) {
  return appStore.locale === 'zh' ? cat.name.zh : cat.name.en
}

function syncSearchFromRoute() {
  if (route.path === '/') {
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

function submitSearch() {
  menuOpen.value = false
  const keyword = searchKeyword.value.trim()
  router.push({ path: '/', query: keyword ? { keyword } : {} })
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

watch(() => route.query.keyword, syncSearchFromRoute, { immediate: true })
watch(() => route.path, syncCategoryFromRoute, { immediate: true })

onMounted(() => {
  loadCategories()
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

    <header class="header">

      <div class="header-glow" />

      <div class="header-inner">

        <div class="left">

          <el-button class="menu-btn" :icon="Menu" text @click="menuOpen = !menuOpen" />

          <div class="brand" @click="navigate('/')">

            <span class="brand-icon">

              <span class="brand-icon-inner">CB</span>

            </span>

            <span class="brand-text">

              Cross<span class="gold">Border</span>

            </span>

          </div>

        </div>



        <div class="header-search">
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

          <a
            v-for="link in navLinks"
            :key="link.path"
            :class="{ active: isActive(link.path) }"
            @click="navigate(link.path)"
          >
            <span class="nav-dot" />
            {{ link.label }}
          </a>

          <el-badge
            :value="chatUnreadCount"
            :hidden="!chatUnreadCount || !userStore.token"
            class="cs-badge"
          >
            <a class="cs-link" @click="openChat">
              <span class="nav-dot" />
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



          <el-badge :value="cartStore.count" :hidden="!cartStore.count" class="cart-badge">

            <el-button class="icon-btn" :icon="ShoppingCart" circle @click="navigate('/cart')" />

          </el-badge>



          <el-button v-if="!userStore.token" type="primary" size="small" class="login-btn" @click="navigate('/login')">

            登录

          </el-button>

          <el-button v-else class="icon-btn" :icon="User" circle @click="navigate('/user')" />

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

          <a v-for="link in navLinks" :key="link.path" @click="navigate(link.path)">{{ link.label }}</a>

          <a class="mobile-cs-link" @click="openChat">
            联系客服
            <el-badge
              v-if="chatUnreadCount && userStore.token"
              :value="chatUnreadCount"
              class="mobile-cs-badge"
            />
          </a>

          <a @click="navigate(userStore.token ? '/user' : '/login')">

            {{ userStore.token ? '用户中心' : '登录' }}

          </a>

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

  background: rgba(6, 11, 24, 0.82);

  backdrop-filter: blur(20px);

  -webkit-backdrop-filter: blur(20px);

  border-bottom: 1px solid var(--cb-border);

  position: sticky;

  top: 0;

  z-index: 100;

}



.header-glow {

  position: absolute;

  bottom: 0;

  left: 0;

  right: 0;

  height: 1px;

  background: linear-gradient(90deg, transparent, var(--cb-accent), var(--cb-gold-dark), transparent);

  opacity: 0.7;

}



.header-inner {

  max-width: 1200px;

  margin: 0 auto;

  padding: 14px 16px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 16px;

}



.left {

  display: flex;

  align-items: center;

  gap: 4px;

}



.menu-btn {

  display: none;

  color: var(--cb-text) !important;

}



.brand {

  display: flex;

  align-items: center;

  gap: 10px;

  cursor: pointer;

}



.brand-icon {

  width: 36px;

  height: 36px;

  border-radius: 10px;

  padding: 1px;

  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark));

  box-shadow: var(--cb-glow-cyan);

  animation: none;

}



.brand-icon-inner {

  display: flex;

  align-items: center;

  justify-content: center;

  width: 100%;

  height: 100%;

  background: #060b18;

  border-radius: 9px;

  font-family: var(--cb-font-display);

  font-size: 11px;

  font-weight: 900;

  color: var(--cb-accent);

  letter-spacing: 0.05em;

}



.brand-text {

  font-family: var(--cb-font-display);

  font-size: 17px;

  font-weight: 700;

  color: var(--cb-text);

  letter-spacing: 0.08em;

}



.brand-text .gold {
  color: var(--cb-accent);
}



.header-search {
  flex: 1;
  max-width: 360px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1;
}

.search-input :deep(.el-input__wrapper) {
  background: rgba(201, 169, 98, 0.06);
  border: 1px solid var(--cb-border);
  box-shadow: none;
}

.search-input :deep(.el-input__wrapper:hover),
.search-input :deep(.el-input__wrapper.is-focus) {
  border-color: var(--cb-accent);
}

.search-btn {
  flex-shrink: 0;
}



.nav-desktop {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-select {
  width: 132px;
}

.category-select :deep(.el-select__wrapper) {
  background: rgba(201, 169, 98, 0.06);
  border: 1px solid var(--cb-border);
  box-shadow: none;
}

.category-select :deep(.el-select__wrapper:hover),
.category-select :deep(.el-select__wrapper.is-focused) {
  border-color: var(--cb-accent);
}

.mobile-category-select {
  width: 100%;
  margin-bottom: 8px;
}



.nav-desktop a {

  cursor: pointer;

  color: var(--cb-text-dim);

  text-decoration: none;

  font-size: 15px;

  font-weight: 600;

  letter-spacing: 0.04em;

  padding: 8px 16px;

  border-radius: 8px;

  transition: all 0.25s;

  display: flex;

  align-items: center;

  gap: 6px;

}



.nav-dot {

  width: 4px;

  height: 4px;

  border-radius: 50%;

  background: transparent;

  transition: all 0.25s;

}



.nav-desktop a.active,

.nav-desktop a:hover {

  color: var(--cb-accent);

  background: rgba(201, 169, 98, 0.08);

}



.nav-desktop a.active .nav-dot {
  background: var(--cb-accent);
  box-shadow: 0 0 8px var(--cb-accent);
}

.cs-badge :deep(.el-badge__content) {
  border: none;
}

.cs-link {
  display: flex;
  align-items: center;
  gap: 4px;
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

}



.currency-select {

  width: 88px;

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



.login-btn {

  font-family: var(--cb-font-body);

  font-weight: 700;

  letter-spacing: 0.06em;

}



.cart-badge :deep(.el-badge__content) {

  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark));

  border: none;

  transform: translateY(-2px) translateX(50%);

}



.nav-mobile {

  display: none;

  flex-direction: column;

  padding: 8px 16px 16px;

  border-top: 1px solid var(--cb-border);

  background: rgba(6, 11, 24, 0.95);

}



.nav-mobile a {

  cursor: pointer;

  color: var(--cb-text-dim);

  text-decoration: none;

  padding: 12px 0;

  border-bottom: 1px solid rgba(0, 212, 255, 0.06);

  font-weight: 600;

  letter-spacing: 0.04em;

}



.nav-mobile a:hover {

  color: var(--cb-accent);

}



.mobile-search {
  display: flex;
  gap: 8px;
  padding-bottom: 12px;
  margin-bottom: 4px;
  border-bottom: 1px solid var(--cb-border);
}

.mobile-search .el-input {
  flex: 1;
}



.main {

  flex: 1;

  max-width: 1200px;

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

  .back-top-btn {
    right: 16px;
    bottom: 20px;
    width: 48px;
    height: 48px;
  }

  .menu-btn {

    display: inline-flex;

  }



  .header-search {

    display: none;

  }



  .nav-desktop {

    display: none;

  }



  .nav-mobile {

    display: flex;

  }



  .brand-text {

    font-size: 14px;

  }

}

</style>


