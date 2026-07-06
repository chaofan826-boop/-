<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import DashboardRankingCard from '@/components/DashboardRankingCard.vue'
import { getDashboardOverview } from '@/api/dashboard'
import { getProducts } from '@/api/product'
import type { HotProductsPeriod } from '@/types/dashboard'

const router = useRouter()

const stats = ref({
  products: 0,
  active: 0,
  totalUsers: 0,
  todaySales: 0,
  totalSales: 0,
  pendingShipmentCount: 0,
})

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

const rangeSuffix = computed(() => {
  if (period.value === 'day') return '当日'
  if (period.value === 'month') return '当月'
  return '年度'
})

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

onMounted(async () => {
  await loadStats()
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

    <div class="ranking-toolbar">
      <p class="toolbar-label">排行榜筛选</p>
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

    <el-row :gutter="20" class="ranking-row">
      <el-col :xs="24" :lg="12">
        <DashboardRankingCard
          title="热销商品排行榜"
          section-tag="SALES RANKING"
          metric="quantity"
          :period="period"
          :selected-date="selectedDate"
          :range-suffix="`${rangeSuffix}销量`"
        />
      </el-col>
      <el-col :xs="24" :lg="12">
        <DashboardRankingCard
          title="商品销售额排行榜"
          section-tag="REVENUE RANKING"
          metric="revenue"
          :period="period"
          :selected-date="selectedDate"
          :range-suffix="`${rangeSuffix}销售额`"
        />
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.dashboard {
  max-width: 1200px;
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

.ranking-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px 20px;
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius);
  background: var(--cb-surface);
  flex-wrap: wrap;
}

.toolbar-label {
  margin: 0;
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--cb-text-muted);
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

.ranking-row :deep(.el-col) {
  margin-bottom: 20px;
}
</style>
