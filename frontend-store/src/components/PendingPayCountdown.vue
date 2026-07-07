<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  formatPendingPayCountdown,
  getPendingPayRemainingMs,
  type PendingPayOrderLike,
} from '@/utils/pending-order'

const props = defineProps<{
  order: PendingPayOrderLike
  compact?: boolean
}>()

const emit = defineEmits<{
  expired: []
}>()

const remainingMs = ref(getPendingPayRemainingMs(props.order))
let timer: ReturnType<typeof setInterval> | null = null

const countdownText = computed(() => formatPendingPayCountdown(remainingMs.value))
const isUrgent = computed(() => remainingMs.value > 0 && remainingMs.value <= 5 * 60 * 1000)

function tick() {
  remainingMs.value = getPendingPayRemainingMs(props.order)
  if (remainingMs.value <= 0) {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    emit('expired')
  }
}

onMounted(() => {
  tick()
  timer = setInterval(tick, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})
</script>

<template>
  <div class="pending-countdown" :class="{ compact, urgent: isUrgent }">
    <span class="countdown-label">{{ compact ? '剩余' : '支付剩余时间' }}</span>
    <strong class="countdown-value">{{ countdownText }}</strong>
    <span v-if="!compact" class="countdown-tip">超时将自动取消订单</span>
  </div>
</template>

<style scoped>
.pending-countdown {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(212, 175, 55, 0.1);
  border: 1px solid rgba(212, 175, 55, 0.28);
}

.pending-countdown.compact {
  padding: 6px 10px;
  gap: 6px;
}

.pending-countdown.urgent {
  background: rgba(231, 76, 60, 0.12);
  border-color: rgba(231, 76, 60, 0.35);
}

.countdown-label {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.countdown-value {
  font-family: var(--cb-font-mono);
  font-size: 18px;
  letter-spacing: 0.08em;
  color: #f0d78a;
}

.pending-countdown.urgent .countdown-value {
  color: #ff8a80;
}

.countdown-tip {
  width: 100%;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.compact .countdown-tip {
  display: none;
}
</style>
