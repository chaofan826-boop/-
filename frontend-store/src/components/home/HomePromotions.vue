<script setup lang="ts">
import { useRouter } from 'vue-router'
import { formatSalesCount } from '@/api/product'
import { useAppStore } from '@/stores/app'
import type { PromotionBlock } from '@/types/home'

defineProps<{
  promotions: PromotionBlock[]
}>()

const router = useRouter()
const appStore = useAppStore()

function localized(text: { zh: string; en: string } | null, fallback = '') {
  if (!text) return fallback
  return appStore.locale === 'zh' ? text.zh : text.en
}

function productTitle(p: { title: { zh: string; en: string } }) {
  return localized(p.title)
}

function productImage(p: { id: number; mainImage: string | null }) {
  return p.mainImage || `https://picsum.photos/seed/p${p.id}/400/400`
}
</script>

<template>
  <section v-for="block in promotions" :key="block.id" class="promo-section">
    <div class="promo-header">
      <div>
        <p class="promo-tag">{{ localized(block.subtitle) }}</p>
        <h2 class="section-title">{{ localized(block.title) }}</h2>
      </div>
      <span class="promo-badge">{{ block.discountPercent }}% OFF</span>
    </div>

    <el-scrollbar>
      <div class="promo-scroll">
        <div
          v-for="item in block.items"
          :key="item.product.id"
          class="promo-card"
          @click="router.push(`/products/${item.product.id}`)"
        >
          <div class="promo-img">
            <img :src="productImage(item.product)" :alt="productTitle(item.product)" loading="lazy" />
            <span class="off-label">-{{ item.discountPercent }}%</span>
          </div>
          <div class="promo-info">
            <h3>{{ productTitle(item.product) }}</h3>
            <div class="price-row">
              <span class="sale-price">{{ appStore.formatPrice(item.salePrice) }}</span>
              <span class="orig-price">{{ appStore.formatPrice(item.originalPrice) }}</span>
            </div>
            <p class="sales-line">{{ formatSalesCount(item.product.salesCount, appStore.locale) }}</p>
          </div>
        </div>
      </div>
    </el-scrollbar>
  </section>
</template>

<style scoped>
.promo-section {
  margin-bottom: 36px;
}

.promo-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--cb-border);
}

.promo-tag {
  margin: 0 0 4px;
  font-size: 12px;
  letter-spacing: 0.1em;
  color: var(--cb-text-muted);
}

.section-title {
  margin: 0;
  font-family: var(--cb-font-display);
  font-size: 22px;
  letter-spacing: 0.08em;
  color: var(--cb-text);
}

.promo-badge {
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid var(--cb-accent);
  background: rgba(201, 169, 98, 0.1);
  font-family: var(--cb-font-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--cb-accent);
}

.promo-scroll {
  display: flex;
  gap: 14px;
  padding: 4px 2px 8px;
}

.promo-card {
  flex-shrink: 0;
  width: 180px;
  border-radius: var(--cb-radius-lg);
  border: 1px solid var(--cb-border);
  background: var(--cb-surface);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
}

.promo-card:hover {
  transform: translateY(-4px);
  border-color: var(--cb-border-hover);
  box-shadow: var(--cb-glow-cyan);
}

.promo-img {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: rgba(18, 18, 22, 0.8);
}

.promo-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.promo-card:hover .promo-img img {
  transform: scale(1.05);
}

.off-label {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(201, 169, 98, 0.92);
  font-size: 11px;
  font-weight: 700;
  color: #1a1a1a;
}

.promo-info {
  padding: 12px;
}

.promo-info h3 {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--cb-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.sale-price {
  font-family: var(--cb-font-display);
  font-size: 17px;
  font-weight: 600;
  color: var(--cb-accent);
}

.orig-price {
  font-size: 11px;
  color: var(--cb-text-muted);
  text-decoration: line-through;
}

.sales-line {
  margin: 6px 0 0;
  font-size: 11px;
  color: var(--cb-text-muted);
}
</style>
