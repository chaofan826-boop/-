<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Delete, DeleteFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  clearBrowseHistory,
  deleteBrowseHistoryItem,
  getBrowseHistory,
  type BrowseHistoryItem,
} from '@/api/browse-history'
import { formatSalesCount, getMinPrice } from '@/api/product'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const clearing = ref(false)
const items = ref<BrowseHistoryItem[]>([])

const hasItems = computed(() => items.value.length > 0)
const itemCountLabel = computed(() => `共 ${items.value.length} 条浏览记录`)

function productTitle(item: BrowseHistoryItem) {
  const product = item.product
  if (!product) return '商品'
  return appStore.locale === 'zh' ? product.title.zh : product.title.en
}

function productImage(item: BrowseHistoryItem) {
  if (item.product?.mainImage) return item.product.mainImage
  return `https://picsum.photos/seed/p${item.productId}/120/120`
}

function isUnavailable(item: BrowseHistoryItem) {
  return !item.product || item.product.status !== 'active'
}

async function loadHistory() {
  loading.value = true
  try {
    items.value = await getBrowseHistory()
  } finally {
    loading.value = false
  }
}

async function handleRemove(item: BrowseHistoryItem, event: Event) {
  event.stopPropagation()
  const title = productTitle(item)
  try {
    await ElMessageBox.confirm(`确定删除「${title}」的浏览记录？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  await deleteBrowseHistoryItem(item.productId)
  items.value = items.value.filter((row) => row.productId !== item.productId)
  ElMessage.success('已删除')
}

async function handleClearAll() {
  if (!items.value.length) return
  const count = items.value.length
  try {
    await ElMessageBox.confirm(
      `确定清空全部 ${count} 条浏览记录？清空后无法恢复。`,
      '清空浏览记录',
      {
        type: 'warning',
        confirmButtonText: '确认清空',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
        distinguishCancelAndClose: true,
      },
    )
  } catch {
    return
  }

  clearing.value = true
  try {
    await clearBrowseHistory()
    items.value = []
    ElMessage.success('浏览记录已清空')
  } finally {
    clearing.value = false
  }
}

function goProduct(item: BrowseHistoryItem) {
  if (isUnavailable(item)) return
  router.push(`/products/${item.productId}`)
}

onMounted(loadHistory)
</script>

<template>
  <div class="browse-history">
    <div class="page-header">
      <div>
        <p class="page-tag">BROWSE HISTORY</p>
        <h2 class="page-title">浏览记录</h2>
      </div>
      <el-button link @click="router.push('/user')">用户中心 →</el-button>
    </div>

    <div v-if="hasItems" class="list-toolbar">
      <span class="toolbar-count">{{ itemCountLabel }}</span>
      <button
        type="button"
        class="clear-all-btn"
        :disabled="loading || clearing"
        @click="handleClearAll"
      >
        <el-icon :class="{ 'is-loading': clearing }"><DeleteFilled /></el-icon>
        <span>{{ clearing ? '清空中...' : '清空全部' }}</span>
      </button>
    </div>

    <div v-loading="loading" class="history-list">
      <div v-if="!items.length && !loading" class="empty-state">
        <p>暂无浏览记录</p>
        <el-button type="primary" @click="router.push('/')">去逛逛</el-button>
      </div>

      <div
        v-for="item in items"
        :key="item.productId"
        class="history-card"
        :class="{ unavailable: isUnavailable(item) }"
        @click="goProduct(item)"
      >
        <div class="history-thumb">
          <img :src="productImage(item)" :alt="productTitle(item)" loading="lazy" />
        </div>

        <div class="history-info">
          <p class="history-title">{{ productTitle(item) }}</p>
          <p v-if="item.product" class="history-meta">
            {{ formatSalesCount(item.product.salesCount ?? 0, appStore.locale) }}
          </p>
          <p v-if="item.product && !isUnavailable(item)" class="history-price">
            {{ appStore.formatPrice(getMinPrice(item.product, appStore.currency)) }}
          </p>
          <p v-else class="history-unavailable">商品已下架或不可用</p>
          <p class="history-time">浏览于 {{ new Date(item.viewedAt).toLocaleString() }}</p>
        </div>

        <div class="history-actions">
          <el-button
            :icon="Delete"
            link
            type="danger"
            @click="handleRemove(item, $event)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.browse-history {
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 16px;
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius-lg);
  background: var(--cb-surface);
}

.toolbar-count {
  font-size: 13px;
  color: var(--cb-text-muted);
  letter-spacing: 0.02em;
}

.clear-all-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: rgba(248, 113, 113, 0.06);
  color: #f87171;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.clear-all-btn:hover:not(:disabled) {
  background: rgba(248, 113, 113, 0.12);
  border-color: #f87171;
  box-shadow: 0 0 12px rgba(248, 113, 113, 0.18);
}

.clear-all-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.clear-all-btn .el-icon {
  font-size: 14px;
}

.clear-all-btn .el-icon.is-loading {
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.page-tag {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-accent);
  opacity: 0.7;
  margin-bottom: 8px;
}

.page-title {
  font-family: var(--cb-font-display);
  font-size: 28px;
  letter-spacing: 0.06em;
  margin: 0;
  color: var(--cb-text);
}

.history-list {
  min-height: 240px;
}

.empty-state {
  text-align: center;
  padding: 64px 20px;
  color: var(--cb-text-muted);
}

.empty-state p {
  margin-bottom: 16px;
}

.history-card {
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius-lg);
  padding: 18px 20px;
  margin-bottom: 14px;
  background: var(--cb-surface);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.history-card:hover:not(.unavailable) {
  border-color: var(--cb-border-hover);
  box-shadow: var(--cb-glow-cyan);
  transform: translateY(-2px);
}

.history-card.unavailable {
  cursor: default;
  opacity: 0.75;
}

.history-thumb {
  width: 88px;
  height: 88px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--cb-border);
  background: rgba(201, 169, 98, 0.06);
  flex-shrink: 0;
}

.history-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.history-info {
  flex: 1;
  min-width: 0;
}

.history-title {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 600;
  color: var(--cb-text);
}

.history-meta {
  margin: 0 0 6px;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.history-price {
  margin: 0 0 6px;
  font-family: var(--cb-font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--cb-accent);
}

.history-unavailable {
  margin: 0 0 6px;
  font-size: 13px;
  color: #f87171;
}

.history-time {
  margin: 0;
  font-size: 12px;
  color: var(--cb-text-dim);
}

.history-actions {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .list-toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .clear-all-btn {
    justify-content: center;
    width: 100%;
  }

  .history-card {
    flex-wrap: wrap;
  }

  .history-actions {
    width: 100%;
    text-align: right;
  }
}
</style>
