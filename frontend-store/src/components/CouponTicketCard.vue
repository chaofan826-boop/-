<script setup lang="ts">
defineProps<{
  symbol: string
  amount: string
  amountLabel?: string
  title: string
  rule: string
  scopeLabel: string
  categories: string[]
  allCategories?: boolean
  dimmed?: boolean
  animate?: boolean
  delay?: string
}>()
</script>

<template>
  <article
    class="coupon-ticket"
    :class="{ 'is-dimmed': dimmed, 'is-animated': animate }"
    :style="delay ? { '--delay': delay } : undefined"
  >
    <div class="ticket-left">
      <span class="ticket-symbol">{{ symbol }}</span>
      <span class="ticket-value">{{ amount }}</span>
      <span class="ticket-label">{{ amountLabel ?? '立减' }}</span>
    </div>

    <div class="ticket-notch ticket-notch-top" aria-hidden="true" />
    <div class="ticket-notch ticket-notch-bottom" aria-hidden="true" />

    <div class="ticket-body">
      <p class="coupon-title">{{ title }}</p>
      <p class="coupon-rule">{{ rule }}</p>
      <div class="coupon-scope">
        <span class="scope-label">{{ scopeLabel }}</span>
        <span
          v-for="name in categories"
          :key="name"
          class="scope-tag"
          :class="{ 'is-all': allCategories }"
        >
          {{ name }}
        </span>
      </div>
      <slot name="extra" />
    </div>

    <slot name="action" />
  </article>
</template>

<style scoped>
.coupon-ticket {
  position: relative;
  display: grid;
  grid-template-columns: 68px 1fr 44px;
  width: 100%;
  max-width: 300px;
  min-height: 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid rgba(201, 169, 98, 0.22);
  background: linear-gradient(135deg, rgba(201, 169, 98, 0.1), rgba(201, 169, 98, 0.03));
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.coupon-ticket.is-animated {
  animation: ticket-in 0.45s ease both;
  animation-delay: var(--delay);
}

.coupon-ticket:hover {
  border-color: rgba(201, 169, 98, 0.38);
  transform: translateY(-1px);
  box-shadow: var(--cb-glow-cyan);
}

.coupon-ticket.is-dimmed {
  opacity: 0.72;
}

.ticket-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  background: linear-gradient(160deg, rgba(201, 169, 98, 0.22), rgba(168, 144, 96, 0.12));
  border-right: 1px dashed rgba(201, 169, 98, 0.35);
}

.ticket-symbol {
  font-size: 11px;
  font-weight: 600;
  color: var(--cb-gold-light);
  line-height: 1;
}

.ticket-value {
  margin-top: 1px;
  font-family: var(--cb-font-display);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: #f0c878;
  text-shadow: 0 2px 12px rgba(201, 169, 98, 0.35);
}

.ticket-label {
  margin-top: 2px;
  font-size: 9px;
  letter-spacing: 0.16em;
  color: var(--cb-text-muted);
}

.ticket-notch {
  position: absolute;
  left: 62px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--cb-surface-solid);
  border: 1px solid rgba(201, 169, 98, 0.22);
  z-index: 1;
}

.ticket-notch-top {
  top: -6px;
}

.ticket-notch-bottom {
  bottom: -6px;
}

.ticket-body {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 3px;
  padding: 8px 10px;
  min-width: 0;
}

.coupon-title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--cb-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.coupon-rule {
  margin: 0;
  font-size: 10px;
  line-height: 1.35;
  color: var(--cb-text-muted);
}

.coupon-scope {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 3px;
}

.scope-label {
  font-size: 10px;
  color: var(--cb-text-muted);
  white-space: nowrap;
}

.scope-tag {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 0 5px;
  border-radius: 999px;
  border: 1px solid rgba(201, 169, 98, 0.28);
  background: rgba(201, 169, 98, 0.1);
  font-size: 9px;
  line-height: 1.6;
  color: var(--cb-gold-light);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.scope-tag.is-all {
  border-color: rgba(103, 194, 58, 0.35);
  background: rgba(103, 194, 58, 0.12);
  color: #95d475;
}

:deep(.ticket-side) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  padding: 0;
  border: none;
  border-left: 1px dashed rgba(201, 169, 98, 0.35);
  border-radius: 0 10px 10px 0;
  background: linear-gradient(180deg, #e8d5a3 0%, #c9a962 55%, #a89060 100%);
  color: #1a1410;
  box-shadow: inset 1px 0 0 rgba(255, 255, 255, 0.2);
}

:deep(.action-content) {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  width: 100%;
  padding: 6px 2px;
}

:deep(.action-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 14px;
  line-height: 1;
  flex-shrink: 0;
}

:deep(.action-icon svg) {
  display: block;
}

:deep(.action-text) {
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
}

@keyframes ticket-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .coupon-ticket {
    grid-template-columns: 62px 1fr 40px;
  }

  .ticket-value {
    font-size: 20px;
  }

  .ticket-notch {
    left: 56px;
  }

  :deep(.ticket-side) {
    width: 40px;
  }

  :deep(.action-text) {
    font-size: 9px;
  }
}
</style>
