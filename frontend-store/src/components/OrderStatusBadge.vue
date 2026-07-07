<script setup lang="ts">
import { orderStatusClass, orderStatusLabel } from '@/utils/order-status'

withDefaults(
  defineProps<{
    status: string
    size?: 'sm' | 'md'
    showDot?: boolean
  }>(),
  {
    size: 'md',
    showDot: true,
  },
)
</script>

<template>
  <span class="order-status" :class="[orderStatusClass(status), `size-${size}`]">
    <span v-if="showDot" class="status-dot" aria-hidden="true" />
    <span class="status-text">{{ orderStatusLabel(status) }}</span>
  </span>
</template>

<style scoped>
.order-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  line-height: 1;
  white-space: nowrap;
}

.order-status.size-sm {
  padding: 4px 10px;
  font-size: 11px;
  gap: 5px;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-pending {
  color: #f0d78a;
  background: rgba(212, 175, 55, 0.14);
  border-color: rgba(212, 175, 55, 0.38);
  box-shadow: 0 0 14px rgba(212, 175, 55, 0.12);
}

.status-pending .status-dot {
  background: #d4af37;
  box-shadow: 0 0 8px rgba(212, 175, 55, 0.65);
  animation: status-pulse 1.6s ease-in-out infinite;
}

.status-paid {
  color: #16110e;
  background: linear-gradient(135deg, #e8d5a3, #c9a962 58%, #a89060);
  border-color: rgba(232, 213, 163, 0.45);
  box-shadow: 0 4px 14px rgba(201, 169, 98, 0.22);
}

.status-paid .status-dot {
  background: #16110e;
  opacity: 0.55;
}

.status-shipped {
  color: #dce8ff;
  background: rgba(96, 132, 188, 0.16);
  border-color: rgba(130, 164, 214, 0.34);
  box-shadow: 0 0 14px rgba(96, 132, 188, 0.1);
}

.status-shipped .status-dot {
  background: #8eb0e8;
  box-shadow: 0 0 8px rgba(142, 176, 232, 0.5);
}

.status-completed {
  color: #b8e0b8;
  background: rgba(88, 148, 88, 0.16);
  border-color: rgba(120, 168, 120, 0.34);
}

.status-completed .status-dot {
  background: #7cb87c;
  box-shadow: 0 0 8px rgba(124, 184, 124, 0.45);
}

.status-cancelled {
  color: #9a9690;
  background: rgba(120, 118, 112, 0.12);
  border-color: rgba(120, 118, 112, 0.24);
}

.status-cancelled .status-dot {
  background: #7a7872;
  opacity: 0.8;
}

@keyframes status-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.25);
    opacity: 0.65;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-pending .status-dot {
    animation: none;
  }
}
</style>
