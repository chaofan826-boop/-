<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import { getHotProducts } from '@/api/dashboard'
import type { HotProductRankItem, HotProductsPeriod, HotProductsSortBy } from '@/types/dashboard'

const props = defineProps<{
  title: string
  sectionTag: string
  metric: HotProductsSortBy
  period: HotProductsPeriod
  selectedDate: Date
  rangeSuffix: string
}>()

const loading = ref(false)
const ranking = ref<HotProductRankItem[]>([])
const rankingDate = ref('')
const chartRef = ref<HTMLElement | null>(null)
const chartInstance = shallowRef<echarts.ECharts | null>(null)

const isRevenue = computed(() => props.metric === 'revenue')

const rangeLabel = computed(() => {
  if (!rankingDate.value) return ''
  return `${rankingDate.value} ${props.rangeSuffix}`
})

const chartHeight = computed(() => Math.max(360, ranking.value.length * 56 + 48))

const sortedRanking = computed(() => [...ranking.value].sort((a, b) => a.rank - b.rank))

function formatQueryDate(date: Date, currentPeriod: HotProductsPeriod) {
  if (currentPeriod === 'all') return undefined
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  if (currentPeriod === 'year') return String(y)
  if (currentPeriod === 'month') return `${y}-${m}`
  return `${y}-${m}-${d}`
}

function productThumb(row: HotProductRankItem) {
  return row.mainImage || `https://picsum.photos/seed/p${row.productId}/80/80`
}

function truncateTitle(title: string, max = 14) {
  return title.length > max ? `${title.slice(0, max)}…` : title
}

function rankClass(rank: number) {
  if (rank === 1) return 'rank-gold'
  if (rank === 2) return 'rank-silver'
  if (rank === 3) return 'rank-bronze'
  return ''
}

function barColor(rank: number) {
  if (isRevenue.value) {
    if (rank === 1) {
      return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
        { offset: 0, color: '#6b5b95' },
        { offset: 1, color: '#e8d5a3' },
      ])
    }
    if (rank === 2) return '#b8bcc6'
    if (rank === 3) return '#c4a882'
    return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
      { offset: 0, color: 'rgba(139, 115, 85, 0.35)' },
      { offset: 1, color: 'rgba(232, 213, 163, 0.9)' },
    ])
  }

  if (rank === 1) {
    return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
      { offset: 0, color: '#8b7355' },
      { offset: 1, color: '#f5d78e' },
    ])
  }
  if (rank === 2) return '#b8bcc6'
  if (rank === 3) return '#d4a574'
  return new echarts.graphic.LinearGradient(0, 0, 1, 0, [
    { offset: 0, color: 'rgba(201, 169, 98, 0.35)' },
    { offset: 1, color: 'rgba(201, 169, 98, 0.9)' },
  ])
}

function metricValue(item: HotProductRankItem) {
  return isRevenue.value ? item.revenue : item.quantitySold
}

function formatMetricLabel(value: number) {
  return isRevenue.value ? `$${value.toFixed(2)}` : `${value}`
}

function renderChart() {
  if (!chartRef.value || !ranking.value.length) {
    chartInstance.value?.dispose()
    chartInstance.value = null
    return
  }

  if (!chartInstance.value) {
    chartInstance.value = echarts.init(chartRef.value)
  }

  const sorted = sortedRanking.value

  chartInstance.value.setOption(
    {
      backgroundColor: 'transparent',
      grid: {
        left: 12,
        right: isRevenue.value ? 72 : 28,
        top: 12,
        bottom: 12,
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(20, 20, 24, 0.96)',
        borderColor: 'rgba(201, 169, 98, 0.35)',
        textStyle: { color: '#f5f3ef', fontSize: 13 },
        formatter(params: unknown) {
          const items = Array.isArray(params) ? params : [params]
          const index = items[0]?.dataIndex ?? 0
          const item = sorted[index]
          if (!item) return ''
          return [
            `<div style="font-weight:600;margin-bottom:6px">${item.title.zh}</div>`,
            `<div style="color:#8a8880;font-size:12px;margin-bottom:8px">${item.spuCode}</div>`,
            `销量：<strong style="color:#c9a962">${item.quantitySold}</strong>`,
            `<br/>销售额：<strong style="color:#e8d5a3">$${item.revenue.toFixed(2)}</strong>`,
          ].join('')
        },
      },
      xAxis: {
        type: 'value',
        name: isRevenue.value ? '销售额 ($)' : '销量',
        nameTextStyle: { color: '#8a8880', padding: [0, 0, 0, 8] },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(201, 169, 98, 0.08)' } },
        axisLabel: {
          color: '#8a8880',
          formatter: (value: number) => (isRevenue.value ? `$${value}` : `${value}`),
        },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: sorted.map((item) => `#${item.rank} ${truncateTitle(item.title.zh)}`),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: '#b8b5ad',
          fontSize: 13,
          width: 160,
          overflow: 'truncate',
        },
      },
      series: [
        {
          name: isRevenue.value ? '销售额' : '销量',
          type: 'bar',
          barWidth: 22,
          data: sorted.map((item) => ({
            value: metricValue(item),
            itemStyle: {
              color: barColor(item.rank),
              borderRadius: [0, 6, 6, 0],
            },
          })),
          label: {
            show: true,
            position: 'right',
            color: isRevenue.value ? '#e8d5a3' : '#c9a962',
            fontWeight: 600,
            formatter: ({ value }: { value: number }) => formatMetricLabel(value),
          },
        },
      ],
    },
    true,
  )
}

function handleResize() {
  chartInstance.value?.resize()
}

async function loadRanking() {
  loading.value = true
  try {
    const date = formatQueryDate(props.selectedDate, props.period)
    const res = await getHotProducts({
      period: props.period,
      sortBy: props.metric,
      ...(date ? { date } : {}),
    })
    ranking.value = res.list
    rankingDate.value = res.date
    await nextTick()
    renderChart()
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.period, props.selectedDate] as const,
  () => {
    loadRanking()
  },
)

watch(chartHeight, async () => {
  await nextTick()
  chartInstance.value?.resize()
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
  loadRanking()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance.value?.dispose()
  chartInstance.value = null
})
</script>

<template>
  <div class="ranking-card">
    <div class="ranking-header">
      <div>
        <p class="section-tag">{{ sectionTag }}</p>
        <h3 class="section-title">{{ title }}</h3>
        <p v-if="rangeLabel" class="section-sub">{{ rangeLabel }} · Top 10</p>
      </div>
    </div>

    <div v-loading="loading" class="ranking-body">
      <div v-if="!ranking.length && !loading" class="chart-empty">该时段暂无销售数据</div>
      <template v-else>
        <div ref="chartRef" class="ranking-chart" :style="{ height: `${chartHeight}px` }" />
        <div class="ranking-legend">
          <div v-for="item in sortedRanking" :key="item.productId" class="legend-item">
            <span class="rank-badge" :class="rankClass(item.rank)">{{ item.rank }}</span>
            <img :src="productThumb(item)" :alt="item.title.zh" class="legend-thumb" />
            <div class="legend-meta">
              <strong>{{ item.title.zh }}</strong>
              <span v-if="isRevenue">销量 {{ item.quantitySold }}</span>
              <span v-else>${{ item.revenue.toFixed(2) }}</span>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ranking-card {
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius);
  background: var(--cb-surface);
  backdrop-filter: blur(12px);
  padding: 24px;
  height: 100%;
}

.ranking-header {
  margin-bottom: 20px;
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

.ranking-body {
  min-height: 360px;
}

.ranking-chart {
  width: 100%;
  min-height: 360px;
}

.chart-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  color: var(--cb-text-muted);
  font-size: 14px;
}

.ranking-legend {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--cb-border);
}

@media (min-width: 1600px) {
  .ranking-legend {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius);
  background: rgba(201, 169, 98, 0.04);
}

.legend-thumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--cb-border);
  flex-shrink: 0;
}

.legend-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.legend-meta strong {
  font-size: 13px;
  color: var(--cb-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-meta span {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  color: var(--cb-accent);
}

.rank-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-weight: 700;
  font-size: 12px;
  background: rgba(201, 169, 98, 0.12);
  color: var(--cb-accent);
  border: 1px solid var(--cb-border);
  flex-shrink: 0;
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
</style>
