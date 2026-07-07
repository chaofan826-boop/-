<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Trophy } from '@element-plus/icons-vue'
import { getSkuPrice, formatSalesCount } from '@/api/product'
import { useAppStore } from '@/stores/app'
import { resolveProductImage } from '@/utils/product-image'
import type { HomeProductCard, HotRankItem } from '@/types/home'

const props = defineProps<{
  items: HotRankItem[]
}>()

const router = useRouter()
const appStore = useAppStore()

const maxSales = computed(() => Math.max(...props.items.map((item) => item.salesCount), 1))

const podiumItems = computed(() => {
  const top3 = props.items.filter((item) => item.rank <= 3)
  return [2, 1, 3]
    .map((rank) => top3.find((item) => item.rank === rank))
    .filter((item): item is HotRankItem => Boolean(item))
})

const listItems = computed(() => props.items.filter((item) => item.rank > 3))

function productTitle(p: { title: { zh: string; en: string } }) {
  return appStore.locale === 'zh' ? p.title.zh : p.title.en
}

function productImage(p: HomeProductCard, index = 0) {
  return resolveProductImage(p, index)
}

function minPrice(product: HomeProductCard) {
  if (!product.skus?.length) return 0
  return Math.min(...product.skus.map((s) => getSkuPrice(s, appStore.currency)))
}

function heatPercent(salesCount: number) {
  return Math.max(10, Math.round((salesCount / maxSales.value) * 100))
}

function rankClass(rank: number) {
  if (rank === 1) return 'gold'
  if (rank === 2) return 'silver'
  if (rank === 3) return 'bronze'
  return ''
}

function goProduct(id: number) {
  router.push(`/products/${id}`)
}
</script>

<template>
  <section class="hot-section">
    <div class="hot-glow" aria-hidden="true" />
    <div class="hot-ambient" aria-hidden="true" />

    <div class="section-top">
      <div class="title-block">
        <span class="hot-badge">HOT</span>
        <div>
          <div class="title-row">
            <p class="hot-tag">HOT RANKING</p>
            <span class="live-tag">
              <span class="live-dot" />
              {{ appStore.locale === 'zh' ? '实时更新' : 'Live' }}
            </span>
          </div>
          <h2 class="section-title">{{ appStore.locale === 'zh' ? '热门榜单' : 'Hot Ranking' }}</h2>
        </div>
      </div>
      <p class="section-desc">
        {{ appStore.locale === 'zh' ? '按销量实时排序，一眼锁定人气爆款' : 'Ranked by live sales — spot the crowd favorites' }}
      </p>
    </div>

    <div v-if="podiumItems.length" class="podium-stage">
      <div
        v-for="(item, index) in podiumItems"
        :key="item.product.id"
        class="podium-col"
        :style="{ '--delay': `${index * 0.08}s` }"
      >
        <article
          class="podium-card"
          :class="[`rank-${item.rank}`, rankClass(item.rank)]"
          @click="goProduct(item.product.id)"
        >
          <div v-if="item.rank === 1" class="champion-crown" aria-hidden="true">
            <el-icon><Trophy /></el-icon>
          </div>

          <div class="podium-rank">
            <span class="rank-medal" :class="rankClass(item.rank)">
              <span class="rank-num">{{ item.rank }}</span>
            </span>
            <div class="rank-text">
              <span class="heat-chip">{{ item.heatLabel }}</span>
            </div>
          </div>

          <div class="podium-media">
            <img :src="productImage(item.product, item.rank - 1)" :alt="productTitle(item.product)" loading="lazy" />
            <div class="media-overlay" />
            <span v-if="item.rank === 1" class="top-ribbon">
              {{ appStore.locale === 'zh' ? '榜首' : '#1 Pick' }}
            </span>
          </div>

          <div class="podium-body">
            <h3>{{ productTitle(item.product) }}</h3>
            <div class="heat-row">
              <span class="sales-line">{{ formatSalesCount(item.salesCount, appStore.locale) }}</span>
              <span class="heat-index">{{ heatPercent(item.salesCount) }}%</span>
            </div>
            <div class="heat-bar">
              <div class="heat-fill" :style="{ width: `${heatPercent(item.salesCount)}%` }" />
            </div>
            <div class="price-row">
              <span class="price">{{ appStore.formatPrice(minPrice(item.product)) }}</span>
              <span class="view-link">
                {{ appStore.locale === 'zh' ? '立即查看' : 'View' }}
                <el-icon><ArrowRight /></el-icon>
              </span>
            </div>
          </div>
        </article>

        <div class="podium-base" :class="rankClass(item.rank)" aria-hidden="true">
          <span>{{ item.rank }}</span>
        </div>
      </div>
    </div>

    <div v-if="listItems.length" class="list-wrap">
      <div class="list-head">
        <span class="list-title">{{ appStore.locale === 'zh' ? '更多热销' : 'More Best Sellers' }}</span>
        <span class="list-count">{{ listItems.length }} {{ appStore.locale === 'zh' ? '件' : 'items' }}</span>
      </div>

      <div class="hot-list">
        <article
          v-for="(item, index) in listItems"
          :key="item.product.id"
          class="hot-item"
          :style="{ '--delay': `${0.24 + index * 0.05}s` }"
          @click="goProduct(item.product.id)"
        >
          <div class="item-rank-wrap">
            <span class="list-rank">{{ item.rank }}</span>
          </div>

          <div class="item-media">
            <img :src="productImage(item.product, index)" :alt="productTitle(item.product)" loading="lazy" />
            <span class="heat-tag">{{ item.heatLabel }}</span>
          </div>

          <div class="item-info">
            <h3>{{ productTitle(item.product) }}</h3>
            <p class="sales">{{ formatSalesCount(item.salesCount, appStore.locale) }}</p>
            <div class="mini-heat">
              <div class="mini-heat-fill" :style="{ width: `${heatPercent(item.salesCount)}%` }" />
            </div>
          </div>

          <div class="item-foot">
            <span class="item-price">{{ appStore.formatPrice(minPrice(item.product)) }}</span>
            <span class="item-link">
              <el-icon><ArrowRight /></el-icon>
            </span>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hot-section {
  position: relative;
  margin-bottom: 40px;
  padding: 24px;
  border-radius: var(--cb-radius-lg);
  border: 1px solid rgba(201, 169, 98, 0.28);
  background:
    radial-gradient(circle at 12% 0%, rgba(232, 213, 163, 0.1), transparent 36%),
    radial-gradient(circle at 88% 18%, rgba(201, 169, 98, 0.06), transparent 32%),
    linear-gradient(160deg, rgba(201, 169, 98, 0.06), rgba(10, 10, 12, 0.97)),
    rgba(14, 14, 16, 0.92);
  box-shadow: var(--cb-shadow-elevated);
  overflow: hidden;
}

.hot-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 260px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cb-accent), var(--cb-gold-dark), transparent);
  pointer-events: none;
}

.hot-ambient {
  position: absolute;
  inset: auto -80px -120px auto;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 169, 98, 0.12), transparent 68%);
  pointer-events: none;
}

.section-top {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 26px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--cb-border);
}

.title-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.hot-badge {
  padding: 6px 10px;
  border-radius: 6px;
  background: linear-gradient(135deg, #e8d5a3, #c9a962 55%, #8b7355);
  font-family: var(--cb-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #0a0a0c;
  box-shadow: 0 0 20px rgba(201, 169, 98, 0.35);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
}

.hot-tag {
  margin: 0;
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-accent);
  opacity: 0.75;
}

.live-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(34, 197, 94, 0.35);
  background: rgba(34, 197, 94, 0.08);
  font-size: 11px;
  font-weight: 600;
  color: #86efac;
}

.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 8px #22c55e;
  animation: pulse-live 1.8s ease-in-out infinite;
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
  max-width: 300px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--cb-text-muted);
  text-align: right;
}

.podium-stage {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.16fr) minmax(0, 0.92fr);
  align-items: end;
  gap: 12px;
  margin-bottom: 22px;
}

.podium-col {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  animation: rise-in 0.55s ease both;
  animation-delay: var(--delay);
}

.podium-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  border: 1px solid var(--cb-border);
  background: rgba(8, 8, 10, 0.86);
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
}

.podium-card:hover {
  transform: translateY(-5px);
  border-color: var(--cb-border-hover);
  box-shadow: var(--cb-glow-cyan);
}

.podium-card.rank-1 {
  border-color: rgba(232, 213, 163, 0.5);
  background:
    linear-gradient(180deg, rgba(232, 213, 163, 0.1), rgba(8, 8, 10, 0.92)),
    rgba(8, 8, 10, 0.86);
  box-shadow: 0 0 0 1px rgba(232, 213, 163, 0.08), 0 18px 40px rgba(0, 0, 0, 0.35);
}

.podium-card.rank-1::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(232, 213, 163, 0.06) 50%, transparent 70%);
  transform: translateX(-120%);
  animation: shimmer 4.5s ease-in-out infinite;
  pointer-events: none;
}

.champion-crown {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(10, 10, 12, 0.72);
  border: 1px solid rgba(232, 213, 163, 0.45);
  color: #e8d5a3;
  box-shadow: 0 0 16px rgba(232, 213, 163, 0.25);
}

.champion-crown .el-icon {
  font-size: 18px;
}

.podium-rank {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px 0;
}

.rank-medal {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(201, 169, 98, 0.25);
  background: rgba(10, 10, 12, 0.8);
  flex-shrink: 0;
}

.rank-medal.gold {
  border-color: rgba(232, 213, 163, 0.55);
  box-shadow: 0 0 18px rgba(232, 213, 163, 0.22);
}

.rank-medal.silver {
  border-color: rgba(200, 196, 188, 0.45);
}

.rank-medal.bronze {
  border-color: rgba(168, 144, 96, 0.45);
}

.rank-num {
  font-family: var(--cb-font-display);
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
  color: var(--cb-text);
}

.rank-medal.gold .rank-num {
  color: #e8d5a3;
}

.rank-medal.silver .rank-num {
  color: #c8c4bc;
}

.rank-medal.bronze .rank-num {
  color: #a89060;
}

.rank-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.heat-chip {
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(201, 169, 98, 0.12);
  border: 1px solid rgba(201, 169, 98, 0.22);
  font-size: 11px;
  font-weight: 600;
  color: var(--cb-accent);
}

.podium-media {
  position: relative;
  margin: 12px 16px 0;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--cb-border);
}

.podium-card.rank-1 .podium-media {
  aspect-ratio: 4 / 3.15;
}

.podium-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.media-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 55%, rgba(8, 8, 10, 0.55) 100%);
  pointer-events: none;
}

.podium-card:hover .podium-media img {
  transform: scale(1.06);
}

.top-ribbon {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 1;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #e8d5a3, #c9a962);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #0a0a0c;
}

.podium-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px 16px;
  flex: 1;
}

.podium-body h3 {
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

.podium-card.rank-1 .podium-body h3 {
  font-size: 16px;
}

.heat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.sales-line {
  margin: 0;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.heat-index {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--cb-accent);
}

.heat-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(201, 169, 98, 0.1);
  overflow: hidden;
}

.heat-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8b7355, var(--cb-accent), #e8d5a3);
  transition: width 0.5s ease;
}

.price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: auto;
  padding-top: 2px;
}

.price {
  font-family: var(--cb-font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--cb-accent);
}

.podium-card.rank-1 .price {
  font-size: 26px;
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

.podium-card:hover .view-link {
  color: var(--cb-accent);
  transform: translateX(2px);
}

.podium-base {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  border-radius: 8px 8px 12px 12px;
  font-family: var(--cb-font-display);
  font-size: 18px;
  font-weight: 700;
  color: rgba(10, 10, 12, 0.55);
}

.podium-base.gold {
  height: 52px;
  background: linear-gradient(180deg, #e8d5a3, #a89060);
  box-shadow: 0 8px 24px rgba(232, 213, 163, 0.18);
}

.podium-base.silver {
  height: 36px;
  background: linear-gradient(180deg, #d8d4cc, #9a9690);
}

.podium-base.bronze {
  height: 28px;
  background: linear-gradient(180deg, #b89868, #7a6548);
}

.list-wrap {
  position: relative;
  z-index: 1;
}

.list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.list-title {
  font-family: var(--cb-font-display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--cb-text);
}

.list-count {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.hot-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.hot-item {
  display: grid;
  grid-template-columns: 32px 72px minmax(0, 1fr);
  grid-template-rows: auto auto;
  gap: 10px 12px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid var(--cb-border);
  background: rgba(10, 10, 12, 0.74);
  cursor: pointer;
  animation: rise-in 0.5s ease both;
  animation-delay: var(--delay);
  transition: border-color 0.25s ease, background 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}

.hot-item:hover {
  border-color: var(--cb-border-hover);
  background: rgba(201, 169, 98, 0.05);
  transform: translateY(-2px);
  box-shadow: var(--cb-glow-cyan);
}

.item-rank-wrap {
  grid-row: 1 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-rank {
  font-family: var(--cb-font-display);
  font-size: 24px;
  font-weight: 700;
  color: var(--cb-text-muted);
  opacity: 0.85;
}

.item-media {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--cb-border);
}

.item-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.hot-item:hover .item-media img {
  transform: scale(1.05);
}

.heat-tag {
  position: absolute;
  left: 4px;
  bottom: 4px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(10, 10, 12, 0.82);
  border: 1px solid rgba(201, 169, 98, 0.28);
  color: var(--cb-accent);
  font-size: 10px;
  font-weight: 600;
}

.item-info {
  min-width: 0;
}

.item-info h3 {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--cb-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.sales {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.mini-heat {
  height: 4px;
  border-radius: 999px;
  background: rgba(201, 169, 98, 0.1);
  overflow: hidden;
}

.mini-heat-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #8b7355, var(--cb-accent));
}

.item-foot {
  grid-column: 2 / 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-top: 2px;
  border-top: 1px dashed rgba(201, 169, 98, 0.14);
}

.item-price {
  font-family: var(--cb-font-display);
  font-size: 18px;
  font-weight: 700;
  color: var(--cb-accent);
}

.item-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--cb-border);
  color: var(--cb-text-dim);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.hot-item:hover .item-link {
  border-color: var(--cb-accent);
  color: var(--cb-accent);
  background: rgba(201, 169, 98, 0.08);
}

@keyframes rise-in {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse-live {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(0.88);
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
  .podium-stage {
    display: flex;
    gap: 14px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    padding-bottom: 6px;
    scrollbar-width: none;
  }

  .podium-stage::-webkit-scrollbar {
    display: none;
  }

  .podium-col {
    flex: 0 0 min(78vw, 320px);
    scroll-snap-align: center;
  }

  .podium-card.rank-1 .podium-media {
    aspect-ratio: 4 / 3;
  }

  .section-desc {
    max-width: none;
    text-align: left;
  }

  .hot-list {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .hot-section {
    padding: 16px;
  }

  .section-top {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-title {
    font-size: 24px;
  }

  .podium-col {
    flex-basis: 84vw;
  }

  .hot-item {
    grid-template-columns: 28px 64px minmax(0, 1fr);
  }

  .item-media {
    width: 64px;
    height: 64px;
  }

  .list-rank {
    font-size: 20px;
  }
}
</style>
