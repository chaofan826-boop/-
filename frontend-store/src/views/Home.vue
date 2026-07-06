<script setup lang="ts">
import { onMounted, reactive, ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { getBanners } from '@/api/banner'
import { getHomeFeatured } from '@/api/home'
import { getMinPrice, getProducts, formatSalesCount } from '@/api/product'
import HomeFlashSale from '@/components/home/HomeFlashSale.vue'
import HomeHotRanking from '@/components/home/HomeHotRanking.vue'
import HomePromotions from '@/components/home/HomePromotions.vue'
import type { Banner } from '@/types/banner'
import type { HomeFeatured } from '@/types/home'
import type { Product } from '@/types/product'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const loading = ref(false)
const products = ref<Product[]>([])
const banners = ref<Banner[]>([])
const total = ref(0)
const carouselRef = ref<{ prev: () => void; next: () => void } | null>(null)
const activeBannerIndex = ref(0)
const featured = ref<HomeFeatured | null>(null)

const isDefaultBrowse = computed(() => !query.keyword)

const featuredTitle = computed(() => {
  if (query.keyword) {
    return appStore.locale === 'zh' ? '搜索结果' : 'Search Results'
  }
  if (featured.value?.featured?.title) {
    const t = featured.value.featured.title
    return appStore.locale === 'zh' ? t.zh : t.en
  }
  return appStore.locale === 'zh' ? '全部商品' : 'All Products'
})

const showProductSection = computed(() => {
  if (query.keyword) return true
  return (featured.value?.featured?.products?.length ?? 0) > 0
})

const displayProducts = computed(() => {
  if (isDefaultBrowse.value && featured.value?.featured?.products?.length) {
    return featured.value.featured.products as unknown as Product[]
  }
  return products.value
})

const showPagination = computed(() => {
  if (isDefaultBrowse.value && featured.value?.featured?.products?.length) {
    return false
  }
  return total.value > query.pageSize
})

const query = reactive({
  page: 1,
  pageSize: 12,
  keyword: '',
})

function syncKeywordFromRoute() {
  const kw = typeof route.query.keyword === 'string' ? route.query.keyword.trim() : ''
  query.keyword = kw
  query.page = 1
}

function clearSearch() {
  query.keyword = ''
  query.page = 1
  router.replace({ path: '/' })
  loadProducts()
}

function bannerTitle(b: Banner) {
  if (!b.title) return ''
  return appStore.locale === 'zh' ? b.title.zh : b.title.en
}

function productImage(p: Product) {
  return p.mainImage || `https://picsum.photos/seed/${p.id}/400/400`
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
  banners.value = await getBanners()
}

async function loadProducts() {
  loading.value = true
  try {
    const res = await getProducts({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
    })
    products.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

watch(
  () => route.query.keyword,
  () => {
    syncKeywordFromRoute()
    loadProducts()
  },
)

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
  syncKeywordFromRoute()
  await Promise.all([loadBanners(), loadFeatured(), loadProducts()])
})
</script>
<template>
  <div>
    <section class="hero home-wide-block">
      <div class="hero-bg" />
      <div class="hero-line" />
      <div class="hero-content">
        <p class="hero-badge">PREMIUM COLLECTION</p>
        <h1>
          <span class="hero-title-main">全球臻品</span>
          <span class="hero-title-sub">尊享跨境购物体验</span>
        </h1>
        <p class="hero-desc">甄选全球好物 · 品质臻选 · 尊享直邮</p>
        <div class="hero-stats">
          <div class="stat">
            <span class="stat-num">50+</span>
            <span class="stat-label">国家直邮</span>
          </div>
          <div class="stat-divider" />
          <div class="stat">
            <span class="stat-num">24h</span>
            <span class="stat-label">极速发货</span>
          </div>
          <div class="stat-divider" />
          <div class="stat">
            <span class="stat-num">100%</span>
            <span class="stat-label">正品保障</span>
          </div>
        </div>
      </div>
    </section>

    <section v-if="banners.length" class="banner-section home-wide-block">
      <div class="banner-frame">
        <div class="banner-glow" />
        <el-carousel
          ref="carouselRef"
          height="420px"
          :interval="5000"
          arrow="never"
          indicator-position="outside"
          :pause-on-hover="true"
          @change="(i: number) => (activeBannerIndex = i)"
        >
          <el-carousel-item v-for="b in banners" :key="b.id">
            <div class="banner-slide" @click="handleBannerClick(b)">
              <img :src="b.imageUrl" :alt="bannerTitle(b) || 'banner'" loading="lazy" />
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

    <HomePromotions v-if="featured?.promotions?.length" :promotions="featured.promotions" />

    <HomeHotRanking v-if="featured?.hotRanking.length" :items="featured.hotRanking" />

    <section v-if="showProductSection" v-loading="loading" class="product-section">
      <div class="section-head">
        <p class="section-label">{{ featuredTitle }}</p>
        <div v-if="query.keyword" class="search-tag">
          <span>「{{ query.keyword }}」共 {{ total }} 件</span>
          <el-button link type="primary" @click="clearSearch">清除</el-button>
        </div>
      </div>
      <el-row :gutter="16">
        <el-col v-for="p in displayProducts" :key="p.id" :xs="12" :sm="8" :md="6" :lg="6">
          <div class="product-card" @click="router.push(`/products/${p.id}`)">
            <div class="img-wrap">
              <img :src="productImage(p)" :alt="displayTitle(p)" loading="lazy" />
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
        <p>{{ query.keyword ? '未找到相关商品' : '暂无商品' }}</p>
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
}

.banner-frame :deep(.el-carousel__container) {
  border-radius: var(--cb-radius-lg);
}

.banner-frame :deep(.el-carousel__indicators--outside) {
  margin-top: 14px;
  padding: 0 16px 4px;
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
  height: 420px;
  cursor: pointer;
  overflow: hidden;
}

.banner-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.02);
  transition: transform 6s ease;
}

.banner-frame :deep(.el-carousel__item.is-active) .banner-slide img {
  transform: scale(1.06);
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

.search-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--cb-text-dim);
}

.hero {
  position: relative;
  border-radius: var(--cb-radius-lg);
  padding: 72px 32px;
  margin-bottom: 40px;
  overflow: hidden;
  border: 1px solid var(--cb-border);
  background: linear-gradient(145deg, rgba(18, 18, 22, 0.95), rgba(10, 10, 12, 0.98));
  box-shadow: var(--cb-shadow-elevated);
}

.hero-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 80% at 80% 20%, rgba(201, 169, 98, 0.1), transparent 55%),
    radial-gradient(ellipse 50% 60% at 10% 90%, rgba(139, 115, 85, 0.06), transparent 50%);
  pointer-events: none;
}

.hero-line {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--cb-accent), transparent);
}

.hero-content {
  position: relative;
  z-index: 1;
  text-align: center;
}

.hero-badge {
  font-family: var(--cb-font-body);
  font-size: 11px;
  letter-spacing: 0.35em;
  color: var(--cb-accent);
  margin-bottom: 20px;
  text-transform: uppercase;
}

.hero h1 {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.hero-title-main {
  font-family: var(--cb-font-display);
  font-size: clamp(2rem, 5vw, 3.2rem);
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--cb-text);
}

.hero-title-sub {
  font-family: var(--cb-font-display);
  font-size: clamp(1rem, 2.5vw, 1.4rem);
  font-weight: 500;
  font-style: italic;
  color: var(--cb-gold-light);
  letter-spacing: 0.2em;
}

.hero-desc {
  color: var(--cb-text-dim);
  font-size: 15px;
  letter-spacing: 0.12em;
  margin-bottom: 36px;
}

.hero-stats {
  display: inline-flex;
  align-items: center;
  gap: 32px;
  padding: 20px 40px;
  background: rgba(201, 169, 98, 0.04);
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius-lg);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.stat-num {
  font-family: var(--cb-font-display);
  font-size: 26px;
  font-weight: 600;
  color: var(--cb-accent);
}

.stat-label {
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-text-muted);
  text-transform: uppercase;
}

.stat-divider {
  width: 1px;
  height: 36px;
  background: var(--cb-border);
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
    height: 260px !important;
  }

  .banner-slide {
    height: 260px;
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

  .banner-frame :deep(.el-carousel__indicators--outside) {
    margin-top: 10px;
  }

  .hero {
    padding: 48px 20px;
  }

  .hero-stats {
    gap: 20px;
    padding: 16px 24px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .stat-divider {
    display: none;
  }
}
</style>

