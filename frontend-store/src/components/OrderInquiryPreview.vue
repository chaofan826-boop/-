<script setup lang="ts">
import type { Order, OrderItem } from '@/api/order'
import OrderStatusBadge from '@/components/OrderStatusBadge.vue'
import { useAppStore } from '@/stores/app'

defineProps<{
  order: Order
  compact?: boolean
}>()

const appStore = useAppStore()

function itemImage(item: OrderItem) {
  if (item.product?.mainImage) return item.product.mainImage
  return `https://picsum.photos/seed/p${item.productId}/120/120`
}

function itemTitle(item: OrderItem) {
  return item.product?.title?.zh || '商品'
}
</script>

<template>
  <div class="order-preview" :class="{ compact }">
    <div class="preview-head">
      <div class="preview-head-left">
        <span class="preview-no">{{ order.orderNo }}</span>
        <span class="preview-time">{{ new Date(order.createdAt).toLocaleString('zh-CN') }}</span>
      </div>
      <OrderStatusBadge :status="order.status" size="sm" />
    </div>

    <div class="preview-items">
      <div v-for="item in order.items" :key="item.id" class="preview-item">
        <div class="preview-thumb">
          <img :src="itemImage(item)" :alt="itemTitle(item)" loading="lazy" />
          <span v-if="item.quantity > 1" class="qty-badge">×{{ item.quantity }}</span>
        </div>
        <div class="preview-item-info">
          <p class="preview-item-title">{{ itemTitle(item) }}</p>
          <p class="preview-item-meta">
            <span>{{ appStore.formatPrice(Number(item.price)) }}</span>
            <span>× {{ item.quantity }}</span>
          </p>
        </div>
      </div>
    </div>

    <div class="preview-foot">
      <div class="preview-address">
        <span class="foot-label">收货地址</span>
        <p>{{ order.shippingAddress }}</p>
      </div>
      <div class="preview-total">
        <span class="foot-label">订单合计</span>
        <strong>{{ appStore.formatPrice(Number(order.totalAmount)) }}</strong>
      </div>
    </div>
  </div>
</template>

<style scoped>
.order-preview {
  border-radius: var(--cb-radius-lg);
  border: 1px solid var(--cb-border);
  background: rgba(10, 10, 12, 0.62);
  overflow: hidden;
}

.preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 14px;
  border-bottom: 1px solid rgba(201, 169, 98, 0.12);
  background: rgba(201, 169, 98, 0.04);
}

.preview-head-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.preview-no {
  font-family: var(--cb-font-mono);
  font-size: 12px;
  color: var(--cb-accent);
  word-break: break-all;
}

.preview-time {
  font-size: 11px;
  color: var(--cb-text-muted);
}

.preview-items {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  max-height: 220px;
  overflow-y: auto;
}

.order-preview.compact .preview-items {
  max-height: 160px;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-thumb {
  position: relative;
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--cb-border);
  background: rgba(18, 18, 22, 0.9);
}

.preview-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qty-badge {
  position: absolute;
  right: 4px;
  bottom: 4px;
  padding: 1px 5px;
  border-radius: 999px;
  background: rgba(10, 10, 12, 0.82);
  border: 1px solid rgba(201, 169, 98, 0.28);
  font-size: 10px;
  font-weight: 600;
  color: var(--cb-gold-light);
}

.preview-item-info {
  flex: 1;
  min-width: 0;
}

.preview-item-title {
  margin: 0 0 4px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--cb-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-item-meta {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.preview-foot {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  padding: 12px 14px;
  border-top: 1px dashed rgba(201, 169, 98, 0.14);
  background: rgba(8, 8, 10, 0.35);
}

.preview-address {
  min-width: 0;
}

.foot-label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--cb-text-muted);
}

.preview-address p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--cb-text-dim);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.preview-total {
  flex-shrink: 0;
  text-align: right;
}

.preview-total strong {
  font-family: var(--cb-font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--cb-accent);
}
</style>
