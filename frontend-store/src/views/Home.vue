<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { getBanners } from '@/api/banner'
import { isHeroBanner } from '@/utils/banner'
import { getHomeFeatured } from '@/api/home'
import { getMinPrice, getProducts, formatSalesCount } from '@/api/product'
import HomeHeroCard from '@/components/home/HomeHeroCard.vue'
import HomeFeaturedProducts from '@/components/home/HomeFeaturedProducts.vue'
import HomeFlashSale from '@/components/home/HomeFlashSale.vue'
import HomeHotRanking from '@/components/home/HomeHotRanking.vue'
import HomePromotions from '@/components/home/HomePromotions.vue'
import type { Banner } from '@/types/banner'
import type { HomeFeatured } from '@/types/home'
import type { Product } from '@/types/product'
import { useAppStore } from '@/stores/app'
import { resolveProductImage } from '@/utils/product-image'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const loading = ref(false)
const products = ref<Product[]>([])
const banners = ref<Banner[]>([])
const total = ref(0)
const carouselRef = ref<{ prev: () => void; next: () => void } | null>(null)
const activeBannerIndex = ref(0)
const bannerHeight = ref('420px')
const featured = ref<HomeFeatured | null>(null)

function updateBannerHeight() {
  bannerHeight.value = window.innerWidth <= 768 ? '260px' : '420px'
}

function preloadBannerImages(items: Banner[]) {
  for (const banner of items) {
    if (isHeroBanner(banner)) continue
    const img = new Image()
    img.decoding = 'async'
    img.src = banner.imageUrl
  }
}

const useFeaturedProducts = computed(() => (featured.value?.featured?.products?.length ?? 0) > 0)

const featuredTitle = computed(() => {
  if (featured.value?.featured?.title) {
    const t = featured.value.featured.title
    return appStore.locale === 'zh' ? t.zh : t.en
  }
  return appStore.locale === 'zh' ? '全部商品' : 'All Products'
})

const showProductSection = computed(() => {
  return useFeaturedProducts.value || products.value.length > 0 || loading.value
})

const displayProducts = computed(() => {
  if (useFeaturedProducts.value) {
    return featured.value!.featured!.products as unknown as Product[]
  }
  return products.value
})

const showPagination = computed(() => {
  if (useFeaturedProducts.value) {
    return false
  }
  return total.value > query.pageSize
})

const query = reactive({
  page: 1,
  pageSize: 12,
})

function bannerTitle(b: Banner) {
  if (!b.title) return ''
  return appStore.locale === 'zh' ? b.title.zh : b.title.en
}

function productImage(p: Product, index = 0) {
  return resolveProductImage(p, index)
}

function displayTitle(p: Product) {
  return appStore.locale === 'zh' ? p.title.zh : p.title.en
}

function handleBannerClick(b: Banner) {
  if (!b.linkUrl) return
  if (/^https?:\/\//i.test(b.linkUrl)) {
    window.open(b.linkUrl, '_blank')
    return
  }
  router.push(b.linkUrl)
}

async function loadFeatured() {
  featured.value = await getHomeFeatured(appStore.currency)
}

async function loadBanners() {
  const list = await getBanners()
  banners.value = list
  preloadBannerImages(list)
}

async function loadProducts() {
  loading.value = true
  try {
    const res = await getProducts({
      page: query.page,
      pageSize: query.pageSize,
    })
    products.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

watch(
  () => appStore.currency,
  () => {
    loadFeatured()
  },
)

watch(
  () => route.fullPath,
  () => {
    if (route.path === '/') {
      loadFeatured()
    }
  },
)

onMounted(async () => {
  updateBannerHeight()
  window.addEventListener('resize', updateBannerHeight)
  await Promise.all([loadBanners(), loadFeatured(), loadProducts()])
})

onUnmounted(() => {
  window.removeEventListener('resize', updateBannerHeight)
})
</script>
<template>
  <div class="home-page">
    <div class="home-bg-motion" aria-hidden="true">
      <span class="bg-orb bg-orb-1" />
      <span class="bg-orb bg-orb-2" />
      <span class="bg-orb bg-orb-3" />
      <span class="bg-orb bg-orb-4" />
      <span class="bg-orb bg-orb-5" />
      <span class="bg-orb bg-orb-6" />
      <span class="bg-orb bg-orb-7" />
      <span class="bg-orb bg-orb-8" />
      <span class="bg-ring bg-ring-1" />
      <span class="bg-ring bg-ring-2" />
      <span class="bg-ring bg-ring-3" />
      <span class="bg-streak bg-streak-1" />
      <span class="bg-streak bg-streak-2" />
      <span class="bg-streak bg-streak-3" />
      <span class="bg-arc bg-arc-1" />
      <span class="bg-arc bg-arc-2" />
      <span class="bg-dot bg-dot-1" />
      <span class="bg-dot bg-dot-2" />
      <span class="bg-dot bg-dot-3" />
      <span class="bg-dot bg-dot-4" />
      <span class="bg-dot bg-dot-5" />
      <span class="bg-dot bg-dot-6" />
    </div>

    <section v-if="banners.length" class="banner-section home-wide-block">
      <div class="banner-frame">
        <div class="banner-glow" />
        <el-carousel
          ref="carouselRef"
          :height="bannerHeight"
          :interval="5000"
          arrow="never"
          :pause-on-hover="true"
          :motion-blur="false"
          @change="(i: number) => (activeBannerIndex = i)"
        >
          <el-carousel-item v-for="(b, index) in banners" :key="b.id">
            <div
              v-if="isHeroBanner(b)"
              class="banner-slide banner-slide--hero"
              @click="handleBannerClick(b)"
            >
              <HomeHeroCard variant="banner" />
            </div>
            <div v-else class="banner-slide" @click="handleBannerClick(b)">
              <img
                :src="b.imageUrl"
                :alt="bannerTitle(b) || 'banner'"
                :loading="index <= 1 ? 'eager' : 'lazy'"
                :fetchpriority="index === 0 ? 'high' : 'auto'"
                decoding="async"
                draggable="false"
              />
              <div class="banner-overlay" />
              <div v-if="bannerTitle(b)" class="banner-caption">
                <span class="caption-line" />
                <span class="caption-text">{{ bannerTitle(b) }}</span>
              </div>
            </div>
          </el-carousel-item>
        </el-carousel>

        <button
          v-if="banners.length > 1"
          type="button"
          class="banner-nav banner-nav--prev"
          aria-label="上一张"
          @click="carouselRef?.prev()"
        >
          <el-icon><ArrowLeft /></el-icon>
        </button>
        <button
          v-if="banners.length > 1"
          type="button"
          class="banner-nav banner-nav--next"
          aria-label="下一张"
          @click="carouselRef?.next()"
        >
          <el-icon><ArrowRight /></el-icon>
        </button>

        <div v-if="banners.length > 1" class="banner-counter">
          <span class="counter-current">{{ String(activeBannerIndex + 1).padStart(2, '0') }}</span>
          <span class="counter-sep">/</span>
          <span class="counter-total">{{ String(banners.length).padStart(2, '0') }}</span>
        </div>
      </div>
    </section>

    <HomeFlashSale v-if="featured?.flashSale?.items?.length" :data="featured.flashSale" />

    <HomeHotRanking v-if="featured?.hotRanking.length" :items="featured.hotRanking" />

    <HomePromotions v-if="featured?.promotions?.length" :promotions="featured.promotions" />

    <HomeFeaturedProducts
      v-if="useFeaturedProducts && displayProducts.length"
      :products="displayProducts"
      :title="featuredTitle"
    />

    <section v-else-if="showProductSection" v-loading="loading" class="product-section">
      <div class="section-head">
        <p class="section-label">{{ featuredTitle }}</p>
      </div>
      <el-row :gutter="16">
        <el-col v-for="(p, index) in displayProducts" :key="p.id" :xs="12" :sm="8" :md="6" :lg="6">
          <div class="product-card" @click="router.push(`/products/${p.id}`)">
            <div class="img-wrap">
              <img :src="productImage(p, index)" :alt="displayTitle(p)" loading="lazy" />
            </div>
            <div class="info">
              <h3>{{ displayTitle(p) }}</h3>
              <p class="price">{{ appStore.formatPrice(getMinPrice(p, appStore.currency)) }}</p>
              <p class="sku-count">
                {{ formatSalesCount(p.salesCount ?? 0, appStore.locale) }}
                · {{ p.skus?.length || 0 }} 款规格
              </p>
            </div>
          </div>
        </el-col>
      </el-row>

      <div v-if="!loading && !displayProducts.length" class="empty-state">
        <p>{{ appStore.locale === 'zh' ? '暂无商品' : 'No products' }}</p>
      </div>

      <div v-if="showPagination" class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          :page-size="query.pageSize"
          :total="total"
          layout="prev, pager, next"
          @change="loadProducts"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  position: relative;
  isolation: isolate;
  padding-bottom: 8px;
}

.home-page::before {
  content: '';
  position: absolute;
  top: -24px;
  bottom: -48px;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  background:
    radial-gradient(ellipse 75% 48% at 50% -6%, rgba(232, 213, 163, 0.11), transparent 54%),
    radial-gradient(ellipse 40% 36% at 8% 55%, rgba(120, 72, 56, 0.14), transparent 58%),
    radial-gradient(ellipse 36% 32% at 92% 72%, rgba(168, 120, 80, 0.1), transparent 56%),
    linear-gradient(180deg, #16110e 0%, #1a1410 38%, #120e0b 100%);
  pointer-events: none;
  z-index: -1;
}

.home-page::after {
  content: '';
  position: absolute;
  top: -24px;
  bottom: -48px;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  opacity: 0.5;
  pointer-events: none;
  z-index: -1;
}

.home-bg-motion {
  position: absolute;
  top: -24px;
  bottom: -48px;
  left: 50%;
  transform: translateX(-50%);
  width: 100vw;
  overflow: hidden;
  pointer-events: none;
  z-index: 0;
}

.home-bg-motion > span {
  position: absolute;
  display: block;
  pointer-events: none;
}

.bg-orb {
  border-radius: 50%;
  filter: blur(48px);
  opacity: 0.55;
  mix-blend-mode: screen;
}

.bg-orb-1 {
  top: 6%;
  left: 8%;
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, rgba(245, 235, 220, 0.22) 0%, rgba(232, 213, 163, 0.08) 45%, transparent 70%);
  animation: bg-drift-a 22s ease-in-out infinite;
}

.bg-orb-2 {
  top: 18%;
  right: 6%;
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, rgba(255, 248, 240, 0.18) 0%, rgba(201, 169, 98, 0.06) 50%, transparent 72%);
  animation: bg-drift-b 26s ease-in-out infinite;
}

.bg-orb-3 {
  top: 42%;
  left: 14%;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(232, 213, 163, 0.16) 0%, rgba(168, 120, 80, 0.05) 55%, transparent 75%);
  animation: bg-drift-c 19s ease-in-out infinite;
}

.bg-orb-4 {
  top: 58%;
  right: 12%;
  width: 320px;
  height: 320px;
  background: radial-gradient(circle, rgba(255, 250, 245, 0.14) 0%, rgba(201, 169, 98, 0.05) 48%, transparent 70%);
  animation: bg-drift-d 30s ease-in-out infinite;
}

.bg-orb-5 {
  bottom: 8%;
  left: 38%;
  width: 240px;
  height: 240px;
  background: radial-gradient(circle, rgba(245, 230, 210, 0.15) 0%, rgba(120, 72, 56, 0.04) 52%, transparent 74%);
  animation: bg-drift-e 24s ease-in-out infinite;
}

.bg-orb-6 {
  top: 8%;
  left: 52%;
  width: 160px;
  height: 160px;
  background: radial-gradient(circle, rgba(255, 252, 248, 0.2) 0%, rgba(232, 213, 163, 0.06) 50%, transparent 72%);
  animation: bg-drift-c 21s ease-in-out infinite 3s;
}

.bg-orb-7 {
  top: 65%;
  left: 4%;
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(240, 228, 210, 0.14) 0%, rgba(201, 169, 98, 0.04) 55%, transparent 76%);
  animation: bg-drift-b 27s ease-in-out infinite 6s;
}

.bg-orb-8 {
  top: 48%;
  right: 4%;
  width: 140px;
  height: 140px;
  filter: blur(36px);
  background: radial-gradient(circle, rgba(255, 248, 240, 0.2) 0%, rgba(168, 120, 80, 0.05) 58%, transparent 78%);
  animation: bg-drift-a 17s ease-in-out infinite 1.5s;
}

.bg-ring {
  border-radius: 50%;
  border: 1px solid rgba(232, 213, 163, 0.14);
  box-shadow:
    0 0 24px rgba(232, 213, 163, 0.06),
    inset 0 0 20px rgba(255, 248, 240, 0.04);
  opacity: 0.45;
}

.bg-ring-1 {
  top: 28%;
  right: 22%;
  width: 120px;
  height: 120px;
  animation: bg-ring-spin 36s linear infinite, bg-pulse 8s ease-in-out infinite;
}

.bg-ring-2 {
  bottom: 22%;
  left: 10%;
  width: 88px;
  height: 88px;
  border-color: rgba(255, 248, 240, 0.12);
  animation: bg-ring-spin 28s linear infinite reverse, bg-pulse 10s ease-in-out infinite 2s;
}

.bg-ring-3 {
  top: 12%;
  left: 28%;
  width: 64px;
  height: 64px;
  border-color: rgba(232, 213, 163, 0.1);
  animation: bg-ring-spin 32s linear infinite, bg-pulse 12s ease-in-out infinite 5s;
}

.bg-streak {
  height: 1px;
  border-radius: 999px;
  background: linear-gradient(90deg, transparent, rgba(232, 213, 163, 0.28), rgba(255, 248, 240, 0.12), transparent);
  opacity: 0.35;
  filter: blur(0.5px);
}

.bg-streak-1 {
  top: 35%;
  left: -8%;
  width: 42%;
  transform: rotate(-8deg);
  animation: bg-streak-slide 18s ease-in-out infinite;
}

.bg-streak-2 {
  top: 72%;
  right: -6%;
  width: 36%;
  transform: rotate(6deg);
  animation: bg-streak-slide-b 22s ease-in-out infinite 4s;
}

.bg-streak-3 {
  top: 52%;
  left: 22%;
  width: 28%;
  transform: rotate(-14deg);
  background: linear-gradient(90deg, transparent, rgba(255, 248, 240, 0.2), rgba(232, 213, 163, 0.1), transparent);
  animation: bg-streak-slide-c 20s ease-in-out infinite 2s;
}

.bg-arc {
  border-radius: 50%;
  border: 1px solid transparent;
  border-top-color: rgba(255, 248, 240, 0.18);
  border-right-color: rgba(232, 213, 163, 0.08);
  opacity: 0.4;
}

.bg-arc-1 {
  top: 38%;
  right: 8%;
  width: 160px;
  height: 160px;
  animation: bg-arc-float 25s ease-in-out infinite;
}

.bg-arc-2 {
  bottom: 32%;
  right: 36%;
  width: 100px;
  height: 100px;
  border-top-color: rgba(232, 213, 163, 0.14);
  animation: bg-arc-float 20s ease-in-out infinite reverse 3s;
}

.bg-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 248, 240, 0.75);
  box-shadow: 0 0 12px rgba(232, 213, 163, 0.45);
}

.bg-dot-1 {
  top: 14%;
  left: 46%;
  animation: bg-dot-twinkle 4s ease-in-out infinite;
}

.bg-dot-2 {
  top: 52%;
  right: 28%;
  animation: bg-dot-twinkle 5.5s ease-in-out infinite 1.2s;
}

.bg-dot-3 {
  bottom: 18%;
  left: 62%;
  animation: bg-dot-twinkle 6s ease-in-out infinite 2.4s;
}

.bg-dot-4 {
  top: 32%;
  left: 22%;
  width: 4px;
  height: 4px;
  animation: bg-dot-twinkle 7s ease-in-out infinite 0.8s;
}

.bg-dot-5 {
  top: 78%;
  right: 18%;
  animation: bg-dot-twinkle 4.8s ease-in-out infinite 3s;
}

.bg-dot-6 {
  top: 24%;
  right: 42%;
  width: 5px;
  height: 5px;
  animation: bg-dot-twinkle 5.2s ease-in-out infinite 1.8s;
}

@keyframes bg-drift-a {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.5;
  }
  50% {
    transform: translate(36px, 28px) scale(1.08);
    opacity: 0.72;
  }
}

@keyframes bg-drift-b {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.42;
  }
  50% {
    transform: translate(-32px, 40px) scale(1.12);
    opacity: 0.65;
  }
}

@keyframes bg-drift-c {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.48;
  }
  50% {
    transform: translate(24px, -30px) scale(1.06);
    opacity: 0.68;
  }
}

@keyframes bg-drift-d {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.4;
  }
  50% {
    transform: translate(-40px, -24px) scale(1.1);
    opacity: 0.62;
  }
}

@keyframes bg-drift-e {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.44;
  }
  50% {
    transform: translate(20px, -36px) scale(1.07);
    opacity: 0.66;
  }
}

@keyframes bg-ring-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes bg-pulse {
  0%,
  100% {
    opacity: 0.28;
  }
  50% {
    opacity: 0.55;
  }
}

@keyframes bg-streak-slide {
  0%,
  100% {
    transform: translateX(0) rotate(-8deg);
    opacity: 0.2;
  }
  50% {
    transform: translateX(48px) rotate(-8deg);
    opacity: 0.45;
  }
}

@keyframes bg-streak-slide-b {
  0%,
  100% {
    transform: translateX(0) rotate(6deg);
    opacity: 0.18;
  }
  50% {
    transform: translateX(-40px) rotate(6deg);
    opacity: 0.42;
  }
}

@keyframes bg-streak-slide-c {
  0%,
  100% {
    transform: translateX(0) rotate(-14deg);
    opacity: 0.15;
  }
  50% {
    transform: translateX(32px) rotate(-14deg);
    opacity: 0.38;
  }
}

@keyframes bg-arc-float {
  0%,
  100% {
    transform: rotate(0deg) translateY(0);
    opacity: 0.28;
  }
  50% {
    transform: rotate(180deg) translateY(-20px);
    opacity: 0.52;
  }
}

@keyframes bg-dot-twinkle {
  0%,
  100% {
    transform: scale(0.8);
    opacity: 0.25;
  }
  50% {
    transform: scale(1.35);
    opacity: 0.9;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-bg-motion > span {
    animation: none !important;
    opacity: 0.35;
  }
}

.home-wide-block {
  --banner-bleed: 28px;
  width: calc(100% + var(--banner-bleed) * 2);
  max-width: min(1320px, calc(100vw - 32px));
  margin-left: calc(-1 * var(--banner-bleed));
  margin-right: calc(-1 * var(--banner-bleed));
}

.banner-section {
  margin-bottom: 32px;
}

.banner-frame {
  position: relative;
  border-radius: var(--cb-radius-lg);
  overflow: hidden;
  border: 1px solid var(--cb-border);
  box-shadow: var(--cb-shadow-elevated);
  background: #060608;
}

.banner-glow {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 160px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cb-accent), var(--cb-gold-dark), transparent);
  z-index: 3;
  pointer-events: none;
}

.banner-frame :deep(.el-carousel) {
  --el-carousel-indicator-height: 6px;
  --el-carousel-transition-duration: 0.52s;
}

.banner-frame :deep(.el-carousel__container) {
  transform: translateZ(0);
  overflow: hidden;
}

.banner-frame :deep(.el-carousel__item) {
  width: 100%;
  overflow: hidden;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.banner-frame :deep(.el-carousel__item.is-animating) .banner-slide img {
  transition: none;
  transform: translateZ(0) scale(1.08);
}

.banner-frame :deep(.el-carousel__indicators) {
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(10, 10, 12, 0.52);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 5;
}

.banner-frame :deep(.el-carousel__indicator) {
  padding: 6px 4px;
}

.banner-frame :deep(.el-carousel__button) {
  width: 28px;
  height: 3px;
  border-radius: 2px;
  background: rgba(201, 169, 98, 0.25);
  opacity: 1;
  transition: width 0.35s ease, background 0.35s ease;
}

.banner-frame :deep(.el-carousel__indicator.is-active .el-carousel__button) {
  width: 40px;
  background: linear-gradient(90deg, var(--cb-gold-dark), var(--cb-accent));
}

.banner-nav {
  position: absolute;
  top: 50%;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-top: -22px;
  padding: 0;
  border: 1px solid rgba(201, 169, 98, 0.45);
  border-radius: 50%;
  background: rgba(10, 10, 12, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  color: var(--cb-accent);
  cursor: pointer;
  transition:
    background 0.25s ease,
    border-color 0.25s ease,
    box-shadow 0.25s ease,
    transform 0.25s ease,
    color 0.25s ease;
}

.banner-nav .el-icon {
  font-size: 18px;
}

.banner-nav--prev {
  left: 16px;
}

.banner-nav--next {
  right: 16px;
}

.banner-nav:hover {
  background: rgba(201, 169, 98, 0.15);
  border-color: var(--cb-accent);
  box-shadow: var(--cb-glow-cyan);
  color: var(--cb-gold-light);
}

.banner-nav:active {
  transform: scale(0.94);
}

.banner-nav--prev:hover {
  transform: translateX(-2px);
}

.banner-nav--next:hover {
  transform: translateX(2px);
}

.banner-counter {
  position: absolute;
  right: 20px;
  bottom: 20px;
  z-index: 4;
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(201, 169, 98, 0.3);
  background: rgba(10, 10, 12, 0.65);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-family: var(--cb-font-mono);
  font-size: 12px;
  letter-spacing: 0.12em;
  pointer-events: none;
}

.counter-current {
  color: var(--cb-accent);
  font-weight: 600;
}

.counter-sep,
.counter-total {
  color: var(--cb-text-muted);
}

.banner-slide {
  position: relative;
  width: 100%;
  height: 100%;
  cursor: pointer;
  overflow: hidden;
  background: #060608;
}

.banner-slide img {
  position: absolute;
  inset: -3px;
  width: calc(100% + 6px);
  height: calc(100% + 6px);
  object-fit: cover;
  transform: translateZ(0) scale(1.08);
  transform-origin: center center;
  user-select: none;
  -webkit-user-drag: none;
}

.banner-frame :deep(.el-carousel__item.is-active) .banner-slide img {
  transform: translateZ(0) scale(1.12);
  transition: transform 7s linear;
}

.banner-frame :deep(.el-carousel__item:not(.is-active)) .banner-slide img {
  transition: none;
  transform: translateZ(0) scale(1.08);
}

.banner-overlay {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.35) 0%, transparent 28%, transparent 72%, rgba(0, 0, 0, 0.35) 100%),
    linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, transparent 35%, rgba(0, 0, 0, 0.55) 100%);
  pointer-events: none;
}

.banner-caption {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 10px;
  padding: 36px 88px 32px 36px;
  pointer-events: none;
}

.caption-line {
  width: 48px;
  height: 2px;
  background: linear-gradient(90deg, var(--cb-accent), transparent);
}

.caption-text {
  font-family: var(--cb-font-display);
  font-size: clamp(1.25rem, 3vw, 2rem);
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.1em;
  text-shadow: 0 2px 24px rgba(0, 0, 0, 0.6);
  line-height: 1.3;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--cb-border);
}

.section-head .section-label {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.banner-slide--hero {
  cursor: default;
  background: #120e0b;
}

.banner-slide--hero :deep(.hero-card) {
  border-radius: 0;
}

.section-label {
  font-family: var(--cb-font-display);
  font-size: 20px;
  letter-spacing: 0.08em;
  color: var(--cb-text);
}

.product-section {
  min-height: 200px;
}

.product-card {
  background: var(--cb-surface);
  border-radius: var(--cb-radius-lg);
  overflow: hidden;
  cursor: pointer;
  margin-bottom: 20px;
  transition: transform 0.35s ease, box-shadow 0.35s ease;
  border: 1px solid var(--cb-border);
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--cb-shadow-elevated);
  border-color: var(--cb-border-hover);
}

.img-wrap {
  position: relative;
  aspect-ratio: 1;
  overflow: hidden;
  background: rgba(18, 18, 22, 0.8);
}

.img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.product-card:hover .img-wrap img {
  transform: scale(1.04);
}

.info {
  padding: 16px;
  background: rgba(14, 14, 16, 0.95);
}

.info h3 {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  color: var(--cb-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 42px;
}

.price {
  font-family: var(--cb-font-display);
  color: var(--cb-accent);
  font-size: 20px;
  font-weight: 600;
  margin-top: 10px;
}

.sku-count {
  font-size: 11px;
  letter-spacing: 0.06em;
  color: var(--cb-text-muted);
  margin-top: 6px;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}

@media (max-width: 768px) {
  .home-wide-block {
    --banner-bleed: 0px;
    width: 100%;
    max-width: none;
    margin-left: 0;
    margin-right: 0;
  }

  .banner-frame :deep(.el-carousel) {
    --el-carousel-transition-duration: 0.48s;
  }

  .banner-slide {
    height: 100%;
  }

  .banner-nav {
    width: 36px;
    height: 36px;
    margin-top: -18px;
  }

  .banner-nav .el-icon {
    font-size: 15px;
  }

  .banner-nav--prev {
    left: 10px;
  }

  .banner-nav--next {
    right: 10px;
  }

  .banner-caption {
    padding: 20px 56px 20px 20px;
    gap: 8px;
  }

  .caption-line {
    width: 32px;
  }

  .banner-counter {
    right: 12px;
    bottom: 12px;
    padding: 4px 10px;
    font-size: 11px;
  }

  .banner-frame :deep(.el-carousel__indicators) {
    bottom: 12px;
    padding: 6px 12px;
  }
}
</style>

