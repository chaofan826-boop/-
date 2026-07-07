<script setup lang="ts">
import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  type PaymentMethod,
} from '@/utils/payment-method'

const model = defineModel<PaymentMethod>({ default: DEFAULT_PAYMENT_METHOD })
</script>

<template>
  <div class="payment-picker">
    <p v-if="$slots.label" class="picker-label">
      <slot name="label" />
    </p>
    <p v-else class="picker-label">选择支付方式</p>

    <div class="payment-options">
      <button
        v-for="item in PAYMENT_METHODS"
        :key="item.value"
        type="button"
        class="payment-option"
        :class="[`theme-${item.theme}`, { 'is-active': model === item.value }]"
        @click="model = item.value"
      >
        <span class="payment-icon" aria-hidden="true">{{ item.shortLabel.charAt(0) }}</span>
        <span class="payment-copy">
          <strong>{{ item.label }}</strong>
          <span>{{ item.desc }}</span>
        </span>
        <span class="payment-check" :class="{ visible: model === item.value }">✓</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.payment-picker {
  width: 100%;
}

.picker-label {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--cb-text);
}

.payment-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.payment-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--cb-border);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;
}

.payment-option:hover {
  border-color: rgba(201, 169, 98, 0.35);
  transform: translateY(-1px);
}

.payment-option.is-active {
  border-color: rgba(201, 169, 98, 0.55);
  box-shadow: 0 0 0 1px rgba(201, 169, 98, 0.16);
  background: rgba(201, 169, 98, 0.08);
}

.payment-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
}

.theme-wechat .payment-icon {
  background: linear-gradient(135deg, #09bb07, #07c160);
}

.theme-alipay .payment-icon {
  background: linear-gradient(135deg, #1677ff, #0958d9);
}

.theme-paypal .payment-icon {
  background: linear-gradient(135deg, #003087, #009cde);
}

.theme-unionpay .payment-icon {
  background: linear-gradient(135deg, #c8102e, #e21836);
}

.payment-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.payment-copy strong {
  font-size: 14px;
  color: var(--cb-text);
}

.payment-copy span {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.payment-check {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid var(--cb-border);
  color: transparent;
  font-size: 12px;
  line-height: 18px;
  text-align: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.payment-check.visible {
  border-color: var(--cb-accent);
  background: var(--cb-accent);
  color: #16110e;
  font-weight: 700;
}

@media (max-width: 640px) {
  .payment-options {
    grid-template-columns: 1fr;
  }
}
</style>
