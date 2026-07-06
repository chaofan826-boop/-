<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { getChatUnreadCount } from '@/api/chat'
import { useUserStore } from '@/stores/user'
import { DataBoard, ChatDotRound, Goods, Menu, Picture, Promotion, ShoppingCart, SwitchButton, User } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const chatUnreadCount = ref(0)

let unreadPollTimer: ReturnType<typeof setInterval> | null = null

async function loadChatUnreadCount() {
  if (!userStore.token) {
    chatUnreadCount.value = 0
    return
  }
  try {
    const res = await getChatUnreadCount()
    chatUnreadCount.value = res.total
  } catch {
    // ignore polling errors
  }
}

function startUnreadPolling() {
  stopUnreadPolling()
  loadChatUnreadCount()
  unreadPollTimer = setInterval(loadChatUnreadCount, 5000)
}

function stopUnreadPolling() {
  if (unreadPollTimer) {
    clearInterval(unreadPollTimer)
    unreadPollTimer = null
  }
}

onMounted(async () => {
  if (userStore.token && !userStore.user) {
    await userStore.fetchProfile()
  }
  startUnreadPolling()
})

onUnmounted(stopUnreadPolling)

watch(
  () => route.path,
  () => {
    loadChatUnreadCount()
  },
)

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定退出登录？', '退出确认', {
      type: 'warning',
      confirmButtonText: '退出登录',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await userStore.logout()
  router.push('/login')
}
</script>

<template>
  <el-container class="layout">
    <el-aside width="240px" class="aside">
      <div class="aside-glow" />
      <div class="logo">
        <span class="logo-icon">
          <span class="logo-icon-inner">CB</span>
        </span>
        <div class="logo-text">
          <span class="logo-title">Admin</span>
          <span class="logo-sub">MANAGEMENT</span>
        </div>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        class="sidebar-menu"
        background-color="transparent"
        text-color="#94a3b8"
        active-text-color="#c9a962"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataBoard /></el-icon>
          <span>仪表盘</span>
        </el-menu-item>
        <el-menu-item index="/products">
          <el-icon><Goods /></el-icon>
          <span>商品管理</span>
        </el-menu-item>
        <el-menu-item index="/categories">
          <el-icon><Menu /></el-icon>
          <span>商品分类</span>
        </el-menu-item>
        <el-menu-item index="/banners">
          <el-icon><Picture /></el-icon>
          <span>轮播图</span>
        </el-menu-item>
        <el-menu-item index="/promotions">
          <el-icon><Promotion /></el-icon>
          <span>首页营销</span>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><ShoppingCart /></el-icon>
          <span>订单管理</span>
        </el-menu-item>
        <el-menu-item index="/chat">
          <el-icon><ChatDotRound /></el-icon>
          <el-badge
            :value="chatUnreadCount"
            :hidden="!chatUnreadCount"
            :max="99"
            class="chat-menu-badge"
          >
            <span>客服消息</span>
          </el-badge>
        </el-menu-item>
        <el-menu-item index="/profile">
          <el-icon><User /></el-icon>
          <span>个人设置</span>
        </el-menu-item>
      </el-menu>
      <div class="sidebar-footer">
        <span class="sys-status">
          <span class="status-dot" />
          SYSTEM READY
        </span>
      </div>
    </el-aside>

    <el-container class="main-container">
      <el-header class="header">
        <div class="header-left">
          <span class="header-title">{{ route.meta.title || '后台管理' }}</span>
        </div>
        <div class="header-right">
          <div class="user-block" @click="router.push('/profile')">
            <el-avatar :size="36" :src="userStore.user?.avatar || undefined" class="avatar">
              {{ userStore.user?.name?.[0] || 'A' }}
            </el-avatar>
            <div class="user-info">
              <span class="user-name">{{ userStore.user?.name || '管理员' }}</span>
              <span class="user-role">{{ userStore.user?.role || 'admin' }}</span>
            </div>
          </div>
          <el-tooltip content="退出登录" placement="bottom">
            <el-button
              class="icon-btn logout-btn"
              :icon="SwitchButton"
              circle
              @click="handleLogout()"
            />
          </el-tooltip>
        </div>
      </el-header>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  background: var(--cb-bg);
}

.aside {
  background: var(--cb-sidebar);
  border-right: 1px solid var(--cb-border);
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.aside-glow {
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: linear-gradient(180deg, transparent, var(--cb-accent), transparent);
  opacity: 0.6;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 20px;
  border-bottom: 1px solid var(--cb-border);
}

.logo-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  padding: 1px;
  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark));
  box-shadow: var(--cb-glow-cyan);
  flex-shrink: 0;
}

.logo-icon-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--cb-sidebar);
  border-radius: 9px;
  font-family: var(--cb-font-display);
  font-size: 12px;
  font-weight: 900;
  color: var(--cb-accent);
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-title {
  font-family: var(--cb-font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--cb-text);
  letter-spacing: 0.08em;
}

.logo-sub {
  font-family: var(--cb-font-mono);
  font-size: 9px;
  letter-spacing: 0.15em;
  color: var(--cb-accent);
  opacity: 0.6;
  margin-top: 2px;
}

.sidebar-menu {
  flex: 1;
  border-right: none !important;
  padding: 12px 8px;
}

.sidebar-menu :deep(.el-menu-item) {
  border-radius: 8px;
  margin-bottom: 4px;
  font-weight: 600;
  letter-spacing: 0.04em;
  transition: all 0.25s;
}

.sidebar-menu :deep(.el-menu-item:hover) {
  background: rgba(201, 169, 98, 0.08) !important;
}

.sidebar-menu :deep(.el-menu-item.is-active) {
  background: rgba(201, 169, 98, 0.1) !important;
  border: 1px solid var(--cb-border);
  box-shadow: var(--cb-glow-cyan);
}

.chat-menu-badge :deep(.el-badge__content) {
  border: none;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--cb-border);
}

.sys-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--cb-font-mono);
  font-size: 10px;
  letter-spacing: 0.12em;
  color: var(--cb-text-muted);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: pulse-glow 2s ease-in-out infinite;
}

.main-container {
  background: var(--cb-bg);
  position: relative;
}

.main-container::before {
  display: none;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(6, 11, 24, 0.85);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--cb-border);
  padding: 0 28px;
  height: 64px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-tag {
  font-family: var(--cb-font-mono);
  color: var(--cb-accent);
  opacity: 0.6;
}

.header-title {
  font-family: var(--cb-font-display);
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--cb-text);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-block {
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-block:hover {
  background: rgba(201, 169, 98, 0.08);
}

.avatar {
  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark)) !important;
  color: #0a0a0c !important;
  font-weight: 700;
  border: 2px solid var(--cb-border);
}

.user-info {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--cb-text);
}

.user-role {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  color: var(--cb-accent);
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.08em;
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

.logout-btn {
  color: #f87171 !important;
  border-color: rgba(248, 113, 113, 0.35) !important;
  background: rgba(248, 113, 113, 0.08) !important;
}

.logout-btn:hover {
  border-color: #f87171 !important;
  box-shadow: 0 0 12px rgba(248, 113, 113, 0.25);
}

.main {
  min-height: calc(100vh - 64px);
  padding: 24px;
  position: relative;
  z-index: 1;
}
</style>

