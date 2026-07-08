<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { getDashboardOrderTrends } from '@/api/dashboard'
import type { DashboardOrderTrendDay } from '@/types/dashboard'

const MAX_RANGE_DAYS = 366

const loading = ref(false)
const trendDays = ref<DashboardOrderTrendDay[]>([])
const trendLabel = ref('')
const chartRef = ref<HTMLElement | null>(null)
const chartInstance = shallowRef<echarts.ECharts | null>(null)

function formatDay(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function createDefaultRange(): [string, string] {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 6)
  return [formatDay(start), formatDay(end)]
}

const dateRange = ref<[string, string]>(createDefaultRange())

const rangeDescription = computed(() => {
  if (trendLabel.value) return `${trendLabel.value} · 平台下单人数、订单数与订单额走势（不含已取消订单）`
  if (dateRange.value.length === 2) {
    return `${dateRange.value[0]} ~ ${dateRange.value[1]} · 平台下单人数、订单数与订单额走势（不含已取消订单）`
  }
  return '平台下单人数、订单数与订单额走势（不含已取消订单）'
})

function countRangeDays(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00`)
  const endDate = new Date(`${end}T00:00:00`)
  const diffMs = endDate.getTime() - startDate.getTime()
  return Math.floor(diffMs / 86400000) + 1
}

function disableFutureDate(date: Date) {
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  return date.getTime() > today.getTime()
}

function renderChart() {
  if (!chartRef.value) return

  if (!chartInstance.value) {
    chartInstance.value = echarts.init(chartRef.value)
  }

  const labels = trendDays.value.map((item) => item.label)
  const userCounts = trendDays.value.map((item) => item.orderUserCount)
  const orderCounts = trendDays.value.map((item) => item.orderCount)
  const amountsUsd = trendDays.value.map((item) => item.orderAmountUsd)
  const amountsCny = trendDays.value.map((item) => item.orderAmountCny)
  const showDataZoom = trendDays.value.length > 31

  chartInstance.value.setOption(
    {
      backgroundColor: 'transparent',
      grid: {
        left: 48,
        right: 56,
        top: 48,
        bottom: showDataZoom ? 56 : 28,
        containLabel: true,
      },
      dataZoom: showDataZoom
        ? [
            {
              type: 'inside',
              start: Math.max(0, 100 - Math.round((31 / trendDays.value.length) * 100)),
              end: 100,
            },
            {
              type: 'slider',
              height: 18,
              bottom: 8,
              borderColor: 'rgba(201, 169, 98, 0.2)',
              fillerColor: 'rgba(201, 169, 98, 0.12)',
              handleStyle: { color: '#c9a962' },
              textStyle: { color: '#9a9690' },
            },
          ]
        : undefined,
      legend: {
        top: 0,
        right: 0,
        textStyle: { color: '#b8bcc6' },
        data: ['下单人数', '订单数', '订单额 (USD)', '订单额 (CNY)'],
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(10, 10, 12, 0.92)',
        borderColor: 'rgba(201, 169, 98, 0.35)',
        textStyle: { color: '#f5f0e6' },
        formatter(params: Array<{ axisValue: string; seriesName: string; value: number; color: string }>) {
          const date = trendDays.value.find((item) => item.label === params[0]?.axisValue)?.date ?? params[0]?.axisValue
          const lines = [`<strong>${date}</strong>`]
          for (const item of params) {
            let value = `${item.value}`
            if (item.seriesName === '订单额 (USD)') value = `$${Number(item.value).toFixed(2)}`
            else if (item.seriesName === '订单额 (CNY)') value = `¥${Number(item.value).toFixed(2)}`
            else if (item.seriesName === '下单人数') value = `${item.value} 人`
            else if (item.seriesName === '订单数') value = `${item.value} 单`
            lines.push(`${item.seriesName}：${value}`)
          }
          return lines.join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: labels,
        axisLine: { lineStyle: { color: 'rgba(201, 169, 98, 0.25)' } },
        axisLabel: {
          color: '#9a9690',
          interval: trendDays.value.length > 14 ? 'auto' : 0,
          rotate: trendDays.value.length > 14 ? 35 : 0,
        },
        axisTick: { show: false },
      },
      yAxis: [
        {
          type: 'value',
          name: '人数 / 订单数',
          minInterval: 1,
          nameTextStyle: { color: '#9a9690', padding: [0, 0, 0, 8] },
          axisLabel: { color: '#9a9690' },
          splitLine: { lineStyle: { color: 'rgba(201, 169, 98, 0.08)' } },
        },
        {
          type: 'value',
          name: '订单额',
          nameTextStyle: { color: '#e8d5a3', padding: [0, 8, 0, 0] },
          axisLabel: {
            color: '#9a9690',
            formatter: (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}k` : `${value}`),
          },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '下单人数',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          yAxisIndex: 0,
          data: userCounts,
          lineStyle: { width: 3, color: '#60a5fa' },
          itemStyle: { color: '#60a5fa', borderColor: '#0a0a0c', borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(96, 165, 250, 0.28)' },
              { offset: 1, color: 'rgba(96, 165, 250, 0.02)' },
            ]),
          },
        },
        {
          name: '订单数',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          yAxisIndex: 0,
          data: orderCounts,
          lineStyle: { width: 3, color: '#7cb87c' },
          itemStyle: { color: '#7cb87c', borderColor: '#0a0a0c', borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(124, 184, 124, 0.22)' },
              { offset: 1, color: 'rgba(124, 184, 124, 0.02)' },
            ]),
          },
        },
        {
          name: '订单额 (USD)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          yAxisIndex: 1,
          data: amountsUsd,
          lineStyle: { width: 3, color: '#e8d5a3' },
          itemStyle: { color: '#c9a962', borderColor: '#0a0a0c', borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(201, 169, 98, 0.24)' },
              { offset: 1, color: 'rgba(201, 169, 98, 0.02)' },
            ]),
          },
        },
        {
          name: '订单额 (CNY)',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 8,
          yAxisIndex: 1,
          data: amountsCny,
          lineStyle: { width: 3, color: '#f87171' },
          itemStyle: { color: '#ef4444', borderColor: '#0a0a0c', borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(239, 68, 68, 0.18)' },
              { offset: 1, color: 'rgba(239, 68, 68, 0.02)' },
            ]),
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

async function loadTrends() {
  if (!dateRange.value?.[0] || !dateRange.value?.[1]) return

  const [startDate, endDate] = dateRange.value
  if (countRangeDays(startDate, endDate) > MAX_RANGE_DAYS) {
    ElMessage.warning(`时间范围最多选择 ${MAX_RANGE_DAYS} 天`)
    return
  }

  loading.value = true
  try {
    const res = await getDashboardOrderTrends({ startDate, endDate })
    trendDays.value = res.days
    trendLabel.value = res.label ?? `${startDate} ~ ${endDate}`
    await nextTick()
    renderChart()
  } finally {
    loading.value = false
  }
}

function handleRangeChange(value: [string, string] | null) {
  if (!value?.[0] || !value?.[1]) return
  void loadTrends()
}

function resetRange() {
  dateRange.value = createDefaultRange()
  void loadTrends()
}

watch(trendDays, async () => {
  await nextTick()
  renderChart()
})

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  await loadTrends()
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  chartInstance.value?.dispose()
  chartInstance.value = null
})
</script>

<template>
  <div class="trend-card">
    <div class="trend-header">
      <div class="trend-heading">
        <p class="section-tag">ORDER TRENDS</p>
        <h3 class="section-title">订单趋势</h3>
        <p class="section-desc">{{ rangeDescription }}</p>
      </div>
      <div class="trend-filters">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          size="small"
          class="trend-range-picker"
          :disabled-date="disableFutureDate"
          :clearable="false"
          @change="handleRangeChange"
        />
        <el-button size="small" @click="resetRange">近 7 日</el-button>
      </div>
    </div>

    <div v-loading="loading" class="chart-wrap">
      <div ref="chartRef" class="trend-chart" />
    </div>
  </div>
</template>

<style scoped>
.trend-card {
  padding: 20px 22px 18px;
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius);
  background: var(--cb-surface);
  margin-bottom: 24px;
}

.trend-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.trend-heading {
  min-width: 0;
  flex: 1 1 280px;
}

.trend-filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.trend-range-picker {
  width: 280px;
}

.section-tag {
  margin: 0 0 6px;
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-neon-cyan);
  opacity: 0.65;
}

.section-title {
  margin: 0;
  font-family: var(--cb-font-display);
  font-size: 20px;
  letter-spacing: 0.05em;
  color: var(--cb-text);
}

.section-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--cb-text-muted);
}

.chart-wrap {
  min-height: 380px;
}

.trend-chart {
  width: 100%;
  height: 380px;
}
</style>
