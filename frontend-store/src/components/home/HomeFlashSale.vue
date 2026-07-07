<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatSalesCount } from '@/api/product'
import { useCountdown } from '@/composables/useCountdown'
import { useAppStore } from '@/stores/app'
import { resolveProductImage } from '@/utils/product-image'
import type { FlashSaleSection } from '@/types/home'

const props = defineProps<{
  data: FlashSaleSection
}>()

const router = useRouter()
const appStore = useAppStore()
const { remaining, pad } = useCountdown(() => props.data.endsAt)

const title = computed(() =>
  appStore.locale === 'zh' ? props.data.title.zh : props.data.title.en,
)

function productTitle(p: { title: { zh: string; en: string } }) {
  return appStore.locale === 'zh' ? p.title.zh : p.title.en
}

function productImage(p: { id: number; spuCode?: string; mainImage: string | null }, index = 0) {
  return resolveProductImage(p, index)
}
</script>

<template>
  <section class="flash-section">
    <div class="section-top">
      <div class="title-block">
        <span class="flash-badge">FLASH</span>
        <h2 class="section-title">{{ title }}</h2>
      </div>
      <div v-if="remaining && !remaining.expired" class="countdown">
        <span class="countdown-label">{{ appStore.locale === 'zh' ? '距结束' : 'Ends in' }}</span>
        <div class="countdown-digits">
          <span class="digit">{{ pad(remaining.hours) }}</span>
          <span class="sep">:</span>
          <span class="digit">{{ pad(remaining.minutes) }}</span>
          <span class="sep">:</span>
          <span class="digit">{{ pad(remaining.seconds) }}</span>
        </div>
      </div>
    </div>

    <div class="flash-grid">
      <div
        v-for="(item, index) in data.items"
        :key="item.product.id"
        class="flash-card"
        @click="router.push(`/products/${item.product.id}`)"
      >
        <div class="flash-img">
          <img :src="productImage(item.product, index)" :alt="productTitle(item.product)" loading="lazy" />
          <span class="discount-tag">-{{ item.discountPercent }}%</span>
        </div>
        <div class="flash-info">
          <h3>{{ productTitle(item.product) }}</h3>
          <div class="price-row">
            <span class="sale-price">{{ appStore.formatPrice(item.salePrice) }}</span>
            <span class="orig-price">{{ appStore.formatPrice(item.originalPrice) }}</span>
          </div>
          <p class="sales-line">{{ formatSalesCount(item.product.salesCount, appStore.locale) }}</p>
          <div class="progress-wrap">
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${item.soldPercent}%` }" />
            </div>
            <span class="progress-text">
              {{ appStore.locale === 'zh' ? `已抢 ${item.soldPercent}%` : `${item.soldPercent}% sold` }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.flash-section {
  margin-bottom: 40px;
  padding: 24px;
  border-radius: var(--cb-radius-lg);
  border: 1px solid rgba(201, 169, 98, 0.35);
  background:
    linear-gradient(135deg, rgba(201, 169, 98, 0.08), rgba(10, 10, 12, 0.95)),
    rgba(14, 14, 16, 0.9);
  box-shadow: var(--cb-shadow-elevated);
}

.section-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.title-block {
  display: flex;
  align-items: center;
  gap: 12px;
}

.flash-badge {
  padding: 4px 10px;
  border-radius: 4px;
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  font-family: var(--cb-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: #fff;
}

.section-title {
  margin: 0;
  font-family: var(--cb-font-display);
  font-size: 24px;
  letter-spacing: 0.08em;
  color: var(--cb-text);
}

.countdown {
  display: flex;
  align-items: center;
  gap: 12px;
}

.countdown-label {
  font-size: 13px;
  color: var(--cb-text-dim);
  letter-spacing: 0.06em;
}

.countdown-digits {
  display: flex;
  align-items: center;
  gap: 4px;
}

.digit {
  min-width: 36px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--cb-border);
  font-family: var(--cb-font-mono);
  font-size: 18px;
  font-weight: 700;
  color: var(--cb-accent);
  text-align: center;
}

.sep {
  color: var(--cb-accent);
  font-weight: 700;
}

.flash-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.flash-card {
  display: flex;
  gap: 14px;
  padding: 14px;
  border-radius: var(--cb-radius-lg);
  border: 1px solid var(--cb-border);
  background: rgba(10, 10, 12, 0.75);
  cursor: pointer;
  transition: border-color 0.25s, transform 0.25s;
}

.flash-card:hover {
  border-color: var(--cb-accent);
  transform: translateY(-2px);
}

.flash-img {
  position: relative;
  flex-shrink: 0;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
}

.flash-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.discount-tag {
  position: absolute;
  top: 6px;
  left: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(192, 57, 43, 0.92);
  font-size: 11px;
  font-weight: 700;
  color: #fff;
}

.flash-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.flash-info h3 {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--cb-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 10px;
}

.sale-price {
  font-family: var(--cb-font-display);
  font-size: 20px;
  font-weight: 600;
  color: #e74c3c;
}

.orig-price {
  font-size: 12px;
  color: var(--cb-text-muted);
  text-decoration: line-through;
}

.sales-line {
  margin: 0 0 8px;
  font-size: 11px;
  color: var(--cb-text-muted);
}

.progress-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-bar {
  height: 6px;
  border-radius: 3px;
  background: rgba(201, 169, 98, 0.12);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, #c0392b, var(--cb-accent));
  transition: width 0.4s ease;
}

.progress-text {
  font-size: 11px;
  color: var(--cb-text-muted);
}

@media (max-width: 992px) {
  .flash-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .flash-section {
    padding: 16px;
  }

  .flash-card {
    flex-direction: column;
  }

  .flash-img {
    width: 100%;
    height: 140px;
  }
}
</style>
