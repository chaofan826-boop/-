<script setup lang="ts">
import { useRouter } from 'vue-router'
import { getSkuPrice, formatSalesCount } from '@/api/product'
import { useAppStore } from '@/stores/app'
import type { HomeProductCard, HotRankItem } from '@/types/home'

defineProps<{
  items: HotRankItem[]
}>()

const router = useRouter()
const appStore = useAppStore()

function productTitle(p: { title: { zh: string; en: string } }) {
  return appStore.locale === 'zh' ? p.title.zh : p.title.en
}

function productImage(p: { id: number; mainImage: string | null }) {
  return p.mainImage || `https://picsum.photos/seed/p${p.id}/400/400`
}

function minPrice(product: HomeProductCard) {
  if (!product.skus?.length) return 0
  return Math.min(...product.skus.map((s) => getSkuPrice(s, appStore.currency)))
}

function rankClass(rank: number) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return ''
}
</script>

<template>
  <section class="hot-section">
    <div class="section-head">
      <div>
        <p class="hot-tag">HOT RANKING</p>
        <h2 class="section-title">{{ appStore.locale === 'zh' ? '热门榜单' : 'Hot Ranking' }}</h2>
      </div>
    </div>

    <div class="hot-list">
      <div
        v-for="item in items"
        :key="item.product.id"
        class="hot-item"
        @click="router.push(`/products/${item.product.id}`)"
      >
        <span class="rank" :class="rankClass(item.rank)">{{ item.rank }}</span>
        <img :src="productImage(item.product)" :alt="productTitle(item.product)" class="hot-thumb" loading="lazy" />
        <div class="hot-info">
          <h3>{{ productTitle(item.product) }}</h3>
            <p class="hot-meta">
              <span class="heat-tag">{{ item.heatLabel }}</span>
              <span class="sales">
                {{ formatSalesCount(item.salesCount, appStore.locale) }}
              </span>
            </p>
        </div>
        <div class="hot-price">
          {{ appStore.formatPrice(minPrice(item.product)) }}
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hot-section {
  margin-bottom: 40px;
}

.section-head {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--cb-border);
}

.hot-tag {
  margin: 0 0 4px;
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-accent);
  opacity: 0.7;
}

.section-title {
  margin: 0;
  font-family: var(--cb-font-display);
  font-size: 22px;
  letter-spacing: 0.08em;
  color: var(--cb-text);
}

.hot-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.hot-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: var(--cb-radius-lg);
  border: 1px solid var(--cb-border);
  background: rgba(14, 14, 16, 0.85);
  cursor: pointer;
  transition: border-color 0.25s, background 0.25s;
}

.hot-item:hover {
  border-color: var(--cb-border-hover);
  background: rgba(201, 169, 98, 0.04);
}

.rank {
  flex-shrink: 0;
  width: 28px;
  font-family: var(--cb-font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--cb-text-muted);
  text-align: center;
}

.rank.gold {
  color: #e8d5a3;
  text-shadow: 0 0 12px rgba(232, 213, 163, 0.4);
}

.rank.silver {
  color: #b8b5ad;
}

.rank.bronze {
  color: #a89060;
}

.hot-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--cb-border);
}

.hot-info {
  flex: 1;
  min-width: 0;
}

.hot-info h3 {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--cb-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.hot-meta {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
}

.heat-tag {
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(201, 169, 98, 0.12);
  color: var(--cb-accent);
  font-weight: 600;
}

.sales {
  color: var(--cb-text-muted);
}

.hot-price {
  flex-shrink: 0;
  font-family: var(--cb-font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--cb-accent);
}

@media (max-width: 768px) {
  .hot-item {
    flex-wrap: wrap;
    gap: 10px;
  }

  .hot-price {
    width: 100%;
    padding-left: 42px;
    text-align: left;
  }
}
</style>
