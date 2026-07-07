<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Present } from '@element-plus/icons-vue'
import { formatSalesCount } from '@/api/product'
import { useAppStore } from '@/stores/app'
import { resolveProductImage } from '@/utils/product-image'
import type { PromotionBlock } from '@/types/home'

defineProps<{
  promotions: PromotionBlock[]
}>()

const router = useRouter()
const appStore = useAppStore()
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

function localized(text: { zh: string; en: string } | null, fallback = '') {
  if (!text) return fallback
  return appStore.locale === 'zh' ? text.zh : text.en
}

function productTitle(p: { title: { zh: string; en: string } }) {
  return localized(p.title)
}

function productImage(p: { id: number; spuCode?: string; mainImage: string | null }, index = 0) {
  return resolveProductImage(p, index)
}

function savedAmount(original: number, sale: number) {
  return Math.max(0, Math.round((original - sale) * 100) / 100)
}

function getRemaining(endAt: string) {
  const diff = Math.max(0, new Date(endAt).getTime() - now.value)
  return {
    hours: Math.floor(diff / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1000),
    expired: diff === 0,
  }
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function goProduct(id: number) {
  router.push(`/products/${id}`)
}
</script>

<template>
  <section v-for="(block, blockIndex) in promotions" :key="block.id" class="promo-section">
    <div class="promo-glow" aria-hidden="true" />
    <div class="promo-ambient" aria-hidden="true" />

    <div class="promo-header">
      <div class="title-block">
        <span class="new-badge">NEW</span>
        <div>
          <div class="title-row">
            <p class="promo-tag">{{ localized(block.subtitle) }}</p>
            <span class="gift-chip">
              <el-icon><Present /></el-icon>
              {{ appStore.locale === 'zh' ? '新人礼遇' : 'Welcome Gift' }}
            </span>
          </div>
          <h2 class="section-title">{{ localized(block.title) }}</h2>
        </div>
      </div>

      <div class="header-actions">
        <span class="promo-badge">-{{ block.discountPercent }}%</span>
        <div v-if="!getRemaining(block.endAt).expired" class="countdown">
          <span class="countdown-label">{{ appStore.locale === 'zh' ? '距结束' : 'Ends in' }}</span>
          <div class="countdown-digits">
            <span class="digit">{{ pad(getRemaining(block.endAt).hours) }}</span>
            <span class="sep">:</span>
            <span class="digit">{{ pad(getRemaining(block.endAt).minutes) }}</span>
            <span class="sep">:</span>
            <span class="digit">{{ pad(getRemaining(block.endAt).seconds) }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="promo-track">
      <article
        v-for="(item, index) in block.items"
        :key="item.product.id"
        class="promo-card"
        :style="{ '--delay': `${blockIndex * 0.06 + index * 0.07}s` }"
        @click="goProduct(item.product.id)"
      >
        <div class="promo-img">
          <img :src="productImage(item.product, index)" :alt="productTitle(item.product)" loading="lazy" />
          <div class="img-overlay" />
          <span class="off-label">-{{ item.discountPercent }}%</span>
          <span class="save-tag">
            {{ appStore.locale === 'zh' ? '立省' : 'Save' }}
            {{ appStore.formatPrice(savedAmount(item.originalPrice, item.salePrice)) }}
          </span>
        </div>

        <div class="promo-info">
          <h3>{{ productTitle(item.product) }}</h3>
          <p class="sales-line">{{ formatSalesCount(item.product.salesCount, appStore.locale) }}</p>
          <div class="price-row">
            <span class="sale-price">{{ appStore.formatPrice(item.salePrice) }}</span>
            <span class="orig-price">{{ appStore.formatPrice(item.originalPrice) }}</span>
          </div>
          <div class="card-foot">
            <span class="cta-text">{{ appStore.locale === 'zh' ? '新人价抢购' : 'New user deal' }}</span>
            <span class="cta-icon">
              <el-icon><ArrowRight /></el-icon>
            </span>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.promo-section {
  position: relative;
  margin-bottom: 40px;
  padding: 24px;
  border-radius: var(--cb-radius-lg);
  border: 1px solid rgba(201, 169, 98, 0.2);
  background:
    radial-gradient(circle at 8% 0%, rgba(232, 213, 163, 0.1), transparent 38%),
    radial-gradient(circle at 92% 20%, rgba(120, 72, 56, 0.1), transparent 34%),
    linear-gradient(155deg, rgba(26, 20, 16, 0.92), rgba(18, 14, 11, 0.96)),
    rgba(22, 17, 14, 0.88);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.32);
  overflow: hidden;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.promo-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 240px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cb-accent), var(--cb-gold-dark), transparent);
  pointer-events: none;
}

.promo-ambient {
  position: absolute;
  inset: -60px auto auto -80px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201, 169, 98, 0.12), transparent 68%);
  pointer-events: none;
}

.promo-header {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--cb-border);
}

.title-block {
  display: flex;
  align-items: center;
  gap: 14px;
}

.new-badge {
  padding: 6px 10px;
  border-radius: 6px;
  background: linear-gradient(135deg, #e8d5a3, #c9a962 55%, #a89060);
  font-family: var(--cb-font-mono);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #1a1208;
  box-shadow: 0 0 20px rgba(201, 169, 98, 0.35);
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.promo-tag {
  margin: 0;
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--cb-accent);
  opacity: 0.85;
}

.gift-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  border: 1px solid rgba(201, 169, 98, 0.28);
  background: rgba(201, 169, 98, 0.08);
  font-size: 11px;
  font-weight: 600;
  color: var(--cb-gold-light);
}

.gift-chip .el-icon {
  font-size: 12px;
}

.section-title {
  margin: 0;
  font-family: var(--cb-font-display);
  font-size: 28px;
  letter-spacing: 0.08em;
  color: var(--cb-text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.promo-badge {
  flex-shrink: 0;
  padding: 8px 16px;
  border-radius: 999px;
  border: 1px solid rgba(201, 169, 98, 0.35);
  background: rgba(201, 169, 98, 0.1);
  font-family: var(--cb-font-display);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--cb-gold-light);
  box-shadow: 0 0 18px rgba(201, 169, 98, 0.12);
}

.countdown {
  display: flex;
  align-items: center;
  gap: 10px;
}

.countdown-label {
  font-size: 12px;
  color: var(--cb-text-dim);
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.countdown-digits {
  display: flex;
  align-items: center;
  gap: 4px;
}

.digit {
  min-width: 34px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(18, 14, 11, 0.78);
  border: 1px solid rgba(201, 169, 98, 0.22);
  font-family: var(--cb-font-mono);
  font-size: 16px;
  font-weight: 700;
  color: var(--cb-accent);
  text-align: center;
}

.sep {
  color: var(--cb-accent);
  font-weight: 700;
}

.promo-track {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 16px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 4px 2px 10px;
  scrollbar-width: none;
}

.promo-track::-webkit-scrollbar {
  display: none;
}

.promo-card {
  flex: 0 0 min(240px, 78vw);
  scroll-snap-align: start;
  border-radius: 14px;
  border: 1px solid rgba(201, 169, 98, 0.16);
  background: rgba(18, 14, 11, 0.82);
  overflow: hidden;
  cursor: pointer;
  animation: rise-in 0.55s ease both;
  animation-delay: var(--delay);
  transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease;
}

.promo-card:hover {
  transform: translateY(-5px);
  border-color: rgba(201, 169, 98, 0.38);
  box-shadow: 0 12px 32px rgba(201, 169, 98, 0.1);
}

.promo-img {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: rgba(22, 17, 14, 0.9);
}

.promo-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.img-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(18, 14, 11, 0.58) 100%);
  pointer-events: none;
}

.promo-card:hover .promo-img img {
  transform: scale(1.06);
}

.off-label {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #e8d5a3, #c9a962);
  font-size: 12px;
  font-weight: 700;
  color: #1a1208;
  box-shadow: 0 4px 14px rgba(201, 169, 98, 0.3);
}

.save-tag {
  position: absolute;
  left: 10px;
  bottom: 10px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(18, 14, 11, 0.82);
  border: 1px solid rgba(201, 169, 98, 0.28);
  backdrop-filter: blur(6px);
  font-size: 11px;
  font-weight: 600;
  color: var(--cb-gold-light);
}

.promo-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
}

.promo-info h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--cb-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 40px;
}

.sales-line {
  margin: 0;
  font-size: 11px;
  color: var(--cb-text-muted);
}

.price-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.sale-price {
  font-family: var(--cb-font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--cb-accent);
}

.orig-price {
  font-size: 12px;
  color: var(--cb-text-muted);
  text-decoration: line-through;
}

.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px dashed rgba(201, 169, 98, 0.16);
}

.cta-text {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--cb-text-dim);
  transition: color 0.2s ease;
}

.promo-card:hover .cta-text {
  color: var(--cb-accent);
}

.cta-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(201, 169, 98, 0.22);
  color: var(--cb-text-dim);
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.promo-card:hover .cta-icon {
  border-color: rgba(201, 169, 98, 0.45);
  color: var(--cb-accent);
  background: rgba(201, 169, 98, 0.08);
  transform: translateX(2px);
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

@media (max-width: 768px) {
  .promo-section {
    padding: 16px;
  }

  .promo-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .section-title {
    font-size: 24px;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .promo-card {
    flex-basis: 82vw;
  }
}
</style>
