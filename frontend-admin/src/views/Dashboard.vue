<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getDashboardOverview, getHotProducts } from '@/api/dashboard'
import { getProducts } from '@/api/product'
import type { HotProductRankItem, HotProductsPeriod } from '@/types/dashboard'

const router = useRouter()

const stats = ref({
  products: 0,
  active: 0,
  totalUsers: 0,
  todaySales: 0,
  totalSales: 0,
  pendingShipmentCount: 0,
})
const rankingLoading = ref(false)
const ranking = ref<HotProductRankItem[]>([])
const rankingDate = ref('')
const period = ref<HotProductsPeriod>('day')
const selectedDate = ref(new Date())

const periodOptions = [
  { label: '日榜', value: 'day' as const },
  { label: '月榜', value: 'month' as const },
  { label: '年榜', value: 'year' as const },
]

const datePickerType = computed(() => period.value)
const datePickerPlaceholder = computed(() => {
  if (period.value === 'year') return '选择年份'
  if (period.value === 'month') return '选择月份'
  return '选择日期'
})

const rangeLabel = computed(() => {
  if (!rankingDate.value) return ''
  if (period.value === 'day') return `${rankingDate.value} 当日销量`
  if (period.value === 'month') return `${rankingDate.value} 当月销量`
  return `${rankingDate.value} 年度销量`
})

function formatQueryDate(date: Date, currentPeriod: HotProductsPeriod) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  if (currentPeriod === 'year') return String(y)
  if (currentPeriod === 'month') return `${y}-${m}`
  return `${y}-${m}-${d}`
}

function rankClass(rank: number) {
  if (rank === 1) return 'rank-gold'
  if (rank === 2) return 'rank-silver'
  if (rank === 3) return 'rank-bronze'
  return ''
}

async function loadStats() {
  const [overview, res, activeRes] = await Promise.all([
    getDashboardOverview(),
    getProducts({ page: 1, pageSize: 1 }),
    getProducts({ page: 1, pageSize: 1, status: 'active' }),
  ])

  stats.value.totalUsers = overview.totalUsers
  stats.value.todaySales = overview.todaySales
  stats.value.totalSales = overview.totalSales
  stats.value.pendingShipmentCount = overview.pendingShipmentCount
  stats.value.products = res.total
  stats.value.active = activeRes.total
}

function goPendingShipment() {
  router.push({ path: '/orders', query: { status: 'paid' } })
}

async function loadHotProducts() {
  rankingLoading.value = true
  try {
    const res = await getHotProducts({
      period: period.value,
      date: formatQueryDate(selectedDate.value, period.value),
    })
    ranking.value = res.list
    rankingDate.value = res.date
  } finally {
    rankingLoading.value = false
  }
}

watch(period, () => {
  loadHotProducts()
})

watch(selectedDate, () => {
  loadHotProducts()
})

onMounted(async () => {
  await Promise.all([loadStats(), loadHotProducts()])
})
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <p class="page-tag">数据概览</p>
      <h2 class="page-title">仪表盘</h2>
    </div>

    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :md="8">
        <div class="stat-card stat-card-users">
          <div class="stat-glow stat-glow-users" />
          <p class="stat-label">用户总人数</p>
          <el-statistic :value="stats.totalUsers" />
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <div class="stat-card stat-card-sales">
          <div class="stat-glow stat-glow-sales" />
          <p class="stat-label">今日销售额</p>
          <el-statistic :value="stats.todaySales" prefix="$" :precision="2" />
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <div class="stat-card stat-card-ship stat-card-clickable" @click="goPendingShipment">
          <div class="stat-glow stat-glow-ship" />
          <p class="stat-label">待发货</p>
          <el-statistic :value="stats.pendingShipmentCount" />
          <p class="stat-hint">点击查看待发货订单 →</p>
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <div class="stat-card">
          <div class="stat-glow" />
          <p class="stat-label">商品总数</p>
          <el-statistic :value="stats.products" />
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <div class="stat-card stat-card-green">
          <div class="stat-glow stat-glow-green" />
          <p class="stat-label">已上架</p>
          <el-statistic :value="stats.active" />
        </div>
      </el-col>
      <el-col :xs="24" :sm="12" :md="8">
        <div class="stat-card stat-card-total-sales">
          <div class="stat-glow stat-glow-total-sales" />
          <p class="stat-label">平台总销售额</p>
          <el-statistic :value="stats.totalSales" prefix="$" :precision="2" />
        </div>
      </el-col>
    </el-row>

    <div class="ranking-card">
      <div class="ranking-header">
        <div>
          <p class="section-tag">SALES RANKING</p>
          <h3 class="section-title">热销商品排行榜</h3>
          <p v-if="rangeLabel" class="section-sub">{{ rangeLabel }} · Top 10</p>
        </div>
        <div class="ranking-filters">
          <el-radio-group v-model="period" size="small" class="period-group">
            <el-radio-button v-for="item in periodOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-radio-button>
          </el-radio-group>
          <el-date-picker
            v-model="selectedDate"
            :type="datePickerType"
            :placeholder="datePickerPlaceholder"
            size="small"
            class="date-picker"
            :clearable="false"
          />
        </div>
      </div>

      <el-table v-loading="rankingLoading" :data="ranking" class="ranking-table" empty-text="该时段暂无销售数据">
        <el-table-column label="排名" width="80" align="center">
          <template #default="{ row }">
            <span class="rank-badge" :class="rankClass(row.rank)">{{ row.rank }}</span>
          </template>
        </el-table-column>
        <el-table-column label="商品" min-width="280">
          <template #default="{ row }">
            <div class="product-cell">
              <img
                v-if="row.mainImage"
                :src="row.mainImage"
                :alt="row.title.zh"
                class="product-thumb"
              />
              <div v-else class="product-thumb placeholder">{{ row.title.zh?.[0] || '?' }}</div>
              <div class="product-meta">
                <strong>{{ row.title.zh }}</strong>
                <span>{{ row.spuCode }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="销量" width="120" align="center">
          <template #default="{ row }">
            <span class="metric-value">{{ row.quantitySold }}</span>
          </template>
        </el-table-column>
        <el-table-column label="销售额" width="140" align="right">
          <template #default="{ row }">
            <span class="metric-revenue">${{ row.revenue.toFixed(2) }}</span>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1100px;
}

.page-header {
  margin-bottom: 28px;
}

.page-tag {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-neon-cyan);
  opacity: 0.6;
  margin-bottom: 6px;
}

.page-title {
  font-family: var(--cb-font-display);
  font-size: 26px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--cb-text);
  text-shadow: 0 0 20px rgba(201, 169, 98, 0.25);
  margin: 0;
}

.stats-row {
  margin-bottom: 24px;
}

.stat-card {
  position: relative;
  padding: 24px;
  background: var(--cb-surface);
  backdrop-filter: blur(12px);
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius);
  margin-bottom: 16px;
  overflow: hidden;
  transition: transform 0.25s, box-shadow 0.25s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--cb-glow-cyan);
}

.stat-card-clickable {
  cursor: pointer;
}

.stat-hint {
  margin: 10px 0 0;
  font-size: 12px;
  color: var(--cb-text-muted);
  position: relative;
}

.stat-glow {
  position: absolute;
  top: -30px;
  right: -30px;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: rgba(201, 169, 98, 0.1);
  filter: blur(30px);
}

.stat-glow-green {
  background: rgba(34, 197, 94, 0.12);
}

.stat-glow-users {
  background: rgba(96, 165, 250, 0.12);
}

.stat-glow-sales {
  background: rgba(201, 169, 98, 0.18);
}

.stat-glow-ship {
  background: rgba(251, 191, 36, 0.14);
}

.stat-glow-total-sales {
  background: rgba(139, 115, 85, 0.14);
}

.stat-card-green :deep(.el-statistic__content) {
  color: #22c55e !important;
  text-shadow: 0 0 16px rgba(34, 197, 94, 0.4) !important;
}

.stat-card-users :deep(.el-statistic__content) {
  color: #60a5fa !important;
  text-shadow: 0 0 16px rgba(96, 165, 250, 0.35) !important;
}

.stat-card-sales :deep(.el-statistic__content) {
  color: var(--cb-accent) !important;
  text-shadow: 0 0 16px rgba(201, 169, 98, 0.35) !important;
}

.stat-card-ship :deep(.el-statistic__content) {
  color: #fbbf24 !important;
  text-shadow: 0 0 16px rgba(251, 191, 36, 0.35) !important;
}

.stat-card-total-sales :deep(.el-statistic__content) {
  color: var(--cb-neon-purple) !important;
  text-shadow: 0 0 16px rgba(139, 115, 85, 0.4) !important;
}

.stat-label {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--cb-text-muted);
  margin-bottom: 12px;
  position: relative;
}

.ranking-card {
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius);
  background: var(--cb-surface);
  backdrop-filter: blur(12px);
  padding: 24px;
}

.ranking-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.section-tag {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-accent);
  opacity: 0.7;
  margin-bottom: 8px;
}

.section-title {
  font-family: var(--cb-font-display);
  font-size: 20px;
  letter-spacing: 0.04em;
  margin: 0 0 6px;
  color: var(--cb-text);
}

.section-sub {
  margin: 0;
  font-size: 13px;
  color: var(--cb-text-dim);
}

.ranking-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.period-group :deep(.el-radio-button__inner) {
  min-width: 56px;
}

.date-picker {
  width: 160px;
}

.ranking-table {
  width: 100%;
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 13px;
  background: rgba(201, 169, 98, 0.12);
  color: var(--cb-accent);
  border: 1px solid var(--cb-border);
}

.rank-badge.rank-gold {
  background: rgba(201, 169, 98, 0.25);
  color: #f5d78e;
  box-shadow: 0 0 12px rgba(201, 169, 98, 0.35);
}

.rank-badge.rank-silver {
  background: rgba(192, 192, 192, 0.18);
  color: #d1d5db;
}

.rank-badge.rank-bronze {
  background: rgba(180, 120, 80, 0.18);
  color: #d4a574;
}

.product-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-thumb {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--cb-border);
  flex-shrink: 0;
}

.product-thumb.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(201, 169, 98, 0.12);
  color: var(--cb-accent);
  font-weight: 700;
}

.product-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.product-meta strong {
  color: var(--cb-text);
  font-size: 14px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.product-meta span {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  color: var(--cb-text-muted);
}

.metric-value {
  font-weight: 700;
  color: var(--cb-text);
}

.metric-revenue {
  font-family: var(--cb-font-mono);
  color: var(--cb-accent);
  font-weight: 600;
}
</style>
