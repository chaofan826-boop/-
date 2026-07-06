<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { getCategory, getMinPrice, getProducts, formatSalesCount } from '@/api/product'
import { useAppStore } from '@/stores/app'
import type { Category, Product } from '@/types/product'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const loading = ref(false)
const category = ref<Category | null>(null)
const products = ref<Product[]>([])
const total = ref(0)

const categoryId = computed(() => Number(route.params.id))

const query = reactive({
  page: 1,
  pageSize: 12,
})

const pageTitle = computed(() => {
  if (!category.value) {
    return appStore.locale === 'zh' ? '分类商品' : 'Category'
  }
  return appStore.locale === 'zh' ? category.value.name.zh : category.value.name.en
})

function productImage(p: Product) {
  return p.mainImage || `https://picsum.photos/seed/${p.id}/400/400`
}

function displayTitle(p: Product) {
  return appStore.locale === 'zh' ? p.title.zh : p.title.en
}

async function loadCategory() {
  if (!Number.isFinite(categoryId.value) || categoryId.value <= 0) {
    category.value = null
    return
  }
  try {
    category.value = await getCategory(categoryId.value)
  } catch {
    category.value = null
  }
}

async function loadProducts() {
  if (!Number.isFinite(categoryId.value) || categoryId.value <= 0) {
    products.value = []
    total.value = 0
    return
  }

  loading.value = true
  try {
    const res = await getProducts({
      page: query.page,
      pageSize: query.pageSize,
      categoryId: categoryId.value,
    })
    products.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

async function loadPage() {
  query.page = 1
  await Promise.all([loadCategory(), loadProducts()])
}

watch(categoryId, loadPage, { immediate: true })
</script>

<template>
  <div class="category-page">
    <div class="page-head">
      <button type="button" class="back-btn" @click="router.push('/')">
        <el-icon><ArrowLeft /></el-icon>
        <span>{{ appStore.locale === 'zh' ? '返回首页' : 'Home' }}</span>
      </button>
      <div class="title-block">
        <p class="page-tag">{{ appStore.locale === 'zh' ? '精选分类' : 'Categories' }}</p>
        <h1>{{ pageTitle }}</h1>
        <p v-if="!loading" class="result-count">
          {{ appStore.locale === 'zh' ? `共 ${total} 件商品` : `${total} products` }}
        </p>
      </div>
    </div>

    <section v-loading="loading" class="product-section">
      <el-row v-if="products.length" :gutter="16">
        <el-col v-for="p in products" :key="p.id" :xs="12" :sm="8" :md="6" :lg="6">
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

      <div v-if="!loading && !products.length" class="empty-state">
        <p>{{ appStore.locale === 'zh' ? '该分类暂无商品' : 'No products in this category' }}</p>
      </div>

      <div v-if="total > query.pageSize" class="pagination">
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
.page-head {
  margin-bottom: 28px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--cb-border);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--cb-text-dim);
  font-size: 13px;
  cursor: pointer;
  transition: color 0.25s;
}

.back-btn:hover {
  color: var(--cb-accent);
}

.page-tag {
  margin: 0 0 6px;
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-accent);
  opacity: 0.7;
}

.title-block h1 {
  margin: 0;
  font-family: var(--cb-font-display);
  font-size: clamp(1.5rem, 3vw, 2rem);
  letter-spacing: 0.08em;
  color: var(--cb-text);
}

.result-count {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--cb-text-muted);
}

.product-section {
  min-height: 240px;
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

.empty-state {
  padding: 48px 16px;
  text-align: center;
  color: var(--cb-text-muted);
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 40px;
}
</style>
