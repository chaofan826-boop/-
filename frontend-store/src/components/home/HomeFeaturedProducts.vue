<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import { formatSalesCount, getMinPrice } from '@/api/product'
import { useAppStore } from '@/stores/app'
import type { Product } from '@/types/product'
import { resolveProductImage } from '@/utils/product-image'

const props = defineProps<{
  products: Product[]
  title: string
}>()

const router = useRouter()
const appStore = useAppStore()

const gridClass = computed(() => {
  const count = props.products.length
  if (count <= 1) return 'layout-single'
  if (count === 2) return 'layout-duo'
  if (count === 3) return 'layout-trio'
  return 'layout-bento'
})

function productImage(p: Product, index: number) {
  return resolveProductImage(p, index)
}

function displayTitle(p: Product) {
  return appStore.locale === 'zh' ? p.title.zh : p.title.en
}

function itemClass(index: number) {
  if (props.products.length <= 1) return 'item-hero'
  if (props.products.length === 2) return 'item-duo'
  if (props.products.length === 3) {
    if (index === 0) return 'item-hero'
    return 'item-side'
  }
  if (index === 0) return 'item-hero'
  if (index === 1 || index === 2) return 'item-side'
  if (index === 3) return 'item-wide'
  return 'item-compact'
}

function goProduct(id: number) {
  router.push(`/products/${id}`)
}
</script>

<template>
  <section class="featured-section">
    <div class="featured-glow" aria-hidden="true" />

    <div class="section-head">
      <div class="title-block">
        <span class="featured-badge">PICKS</span>
        <div>
          <p class="featured-tag">CURATED SELECTION</p>
          <h2 class="section-title">{{ title }}</h2>
        </div>
      </div>
      <p class="section-desc">
        {{ appStore.locale === 'zh' ? '编辑臻选 · 品质好物' : 'Editor’s picks · Premium quality' }}
      </p>
    </div>

    <div class="featured-grid" :class="gridClass">
      <article
        v-for="(p, index) in products"
        :key="p.id"
        class="featured-item"
        :class="itemClass(index)"
        :style="{ '--delay': `${index * 0.07}s` }"
        @click="goProduct(p.id)"
      >
        <div class="item-media">
          <img :src="productImage(p, index)" :alt="displayTitle(p)" loading="lazy" />
          <div class="media-warmwash" aria-hidden="true" />
          <div class="media-shine" aria-hidden="true" />
          <div class="media-overlay" />
          <div class="media-vignette" aria-hidden="true" />
          <span v-if="index === 0" class="pick-ribbon">
            {{ appStore.locale === 'zh' ? '臻选' : 'Pick' }}
          </span>
          <span class="index-badge">{{ String(index + 1).padStart(2, '0') }}</span>
        </div>

        <div class="item-body">
          <h3>{{ displayTitle(p) }}</h3>
          <div class="item-meta">
            <span class="price">{{ appStore.formatPrice(getMinPrice(p, appStore.currency)) }}</span>
            <span class="meta-text">
              {{ formatSalesCount(p.salesCount ?? 0, appStore.locale) }}
            </span>
          </div>
          <div class="item-foot">
            <span class="sku-text">{{ p.skus?.length || 0 }} {{ appStore.locale === 'zh' ? '款规格' : 'SKUs' }}</span>
            <span class="view-link">
              {{ appStore.locale === 'zh' ? '查看' : 'View' }}
              <el-icon><ArrowRight /></el-icon>
            </span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.featured-section {
  position: relative;
  margin-bottom: 40px;
  padding: 24px;
  border-radius: var(--cb-radius-lg);
  border: 1px solid rgba(201, 169, 98, 0.22);
  background:
    radial-gradient(circle at 88% 0%, rgba(232, 213, 163, 0.1), transparent 40%),
    linear-gradient(155deg, rgba(26, 20, 16, 0.92), rgba(18, 14, 11, 0.96)),
    rgba(22, 17, 14, 0.88);
  box-shadow: var(--cb-shadow-elevated);
  overflow: hidden;
}

.featured-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cb-accent), var(--cb-gold-dark), transparent);
  pointer-events: none;
}

.section-head {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--cb-border);
}

.title-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.featured-badge {
  padding: 6px 10px;
  border-radius: 6px;
  background: linear-gradient(135deg, #e8d5a3, #c9a962 55%, #8b7355);
  font-family: var(--cb-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #1a1208;
  box-shadow: 0 0 20px rgba(201, 169, 98, 0.35);
}

.featured-tag {
  margin: 0 0 4px;
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-accent);
  opacity: 0.75;
}

.section-title {
  margin: 0;
  font-family: var(--cb-font-display);
  font-size: 28px;
  letter-spacing: 0.08em;
  color: var(--cb-text);
}

.section-desc {
  margin: 0;
  font-size: 13px;
  color: var(--cb-text-muted);
}

.featured-grid {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 14px;
}

.featured-item {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  border: 1px solid var(--cb-border);
  background: rgba(22, 17, 14, 0.9);
  overflow: hidden;
  cursor: pointer;
  animation: rise-in 0.55s ease both;
  animation-delay: var(--delay);
  transition: transform 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
}

.featured-item:hover {
  transform: translateY(-4px);
  border-color: rgba(201, 169, 98, 0.42);
  box-shadow: var(--cb-glow-cyan);
}

.featured-grid.layout-bento {
  grid-template-columns: repeat(12, minmax(0, 1fr));
  grid-auto-rows: minmax(140px, auto);
}

.featured-grid.layout-bento .item-hero {
  grid-column: 1 / span 7;
  grid-row: span 2;
}

.featured-grid.layout-bento .item-side:nth-of-type(2) {
  grid-column: 8 / span 5;
}

.featured-grid.layout-bento .item-side:nth-of-type(3) {
  grid-column: 8 / span 5;
}

.featured-grid.layout-bento .item-wide {
  grid-column: 1 / span 12;
}

.featured-grid.layout-bento .item-compact {
  grid-column: span 4;
}

.featured-grid.layout-trio {
  grid-template-columns: 1.2fr 1fr;
  grid-template-rows: auto auto;
}

.featured-grid.layout-trio .item-hero {
  grid-row: 1 / span 2;
}

.featured-grid.layout-duo {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.featured-grid.layout-single {
  grid-template-columns: 1fr;
  max-width: 520px;
}

.item-media {
  position: relative;
  flex: 1;
  min-height: 160px;
  overflow: hidden;
  background:
    radial-gradient(ellipse 85% 75% at 50% 38%, rgba(42, 32, 24, 0.55) 0%, rgba(18, 14, 11, 1) 100%),
    #120e0b;
}

.item-hero .item-media {
  min-height: 280px;
}

.item-duo .item-media {
  min-height: 220px;
}

.item-side .item-media {
  min-height: 130px;
}

.item-wide .item-media {
  min-height: 200px;
}

.item-compact .item-media {
  min-height: 150px;
}

.item-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 42%;
  filter: saturate(0.82) brightness(0.86) contrast(1.06);
  transition: transform 0.45s ease, filter 0.45s ease;
}

.featured-item:hover .item-media img {
  transform: scale(1.05);
  filter: saturate(0.9) brightness(0.92) contrast(1.08);
}

.media-warmwash {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(145deg, rgba(26, 20, 16, 0.42) 0%, rgba(201, 169, 98, 0.1) 52%, rgba(18, 14, 11, 0.38) 100%);
  mix-blend-mode: soft-light;
  pointer-events: none;
}

.media-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 35%, rgba(232, 213, 163, 0.12) 50%, transparent 65%);
  transform: translateX(-120%);
  animation: shimmer 5s ease-in-out infinite;
  pointer-events: none;
}

.media-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(180deg, rgba(22, 17, 14, 0.22) 0%, transparent 38%, rgba(8, 6, 5, 0.78) 100%);
  pointer-events: none;
}

.media-vignette {
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 72px rgba(8, 6, 5, 0.55);
  pointer-events: none;
}

.pick-ribbon {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
  padding: 4px 12px;
  border-radius: 999px;
  background: linear-gradient(135deg, #e8d5a3, #c9a962);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #1a1208;
}

.index-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  font-family: var(--cb-font-display);
  font-size: 28px;
  font-weight: 700;
  line-height: 1;
  color: rgba(245, 243, 239, 0.22);
}

.item-hero .index-badge {
  font-size: 42px;
}

.item-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px 16px;
}

.item-body h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--cb-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-hero .item-body h3 {
  font-size: 18px;
}

.item-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.price {
  font-family: var(--cb-font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--cb-accent);
}

.item-hero .price {
  font-size: 26px;
}

.meta-text {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.item-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px dashed rgba(201, 169, 98, 0.14);
}

.sku-text {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.view-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  color: var(--cb-text-dim);
  transition: color 0.2s ease, transform 0.2s ease;
}

.featured-item:hover .view-link {
  color: var(--cb-accent);
  transform: translateX(2px);
}

.item-wide {
  flex-direction: row;
}

.item-wide .item-media {
  flex: 0 0 42%;
  min-height: 180px;
}

.item-wide .item-body {
  flex: 1;
  justify-content: center;
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes shimmer {
  0%,
  100% {
    transform: translateX(-120%);
  }
  45% {
    transform: translateX(120%);
  }
}

@media (max-width: 992px) {
  .featured-grid.layout-bento,
  .featured-grid.layout-trio,
  .featured-grid.layout-duo {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .featured-grid.layout-bento .item-hero,
  .featured-grid.layout-bento .item-side,
  .featured-grid.layout-bento .item-wide,
  .featured-grid.layout-bento .item-compact,
  .featured-grid.layout-trio .item-hero,
  .featured-grid.layout-trio .item-side {
    grid-column: auto;
    grid-row: auto;
  }

  .item-wide {
    flex-direction: column;
  }

  .item-wide .item-media {
    flex: none;
    width: 100%;
  }
}

@media (max-width: 768px) {
  .featured-section {
    padding: 16px;
  }

  .section-head {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-title {
    font-size: 24px;
  }

  .featured-grid.layout-bento,
  .featured-grid.layout-trio,
  .featured-grid.layout-duo {
    grid-template-columns: 1fr;
  }

  .item-hero .item-media {
    min-height: 240px;
  }
}
</style>
