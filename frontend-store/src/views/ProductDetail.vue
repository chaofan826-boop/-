<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { formatSpec, formatSalesCount, getProduct, getSkuPrice } from '@/api/product'
import { recordBrowseHistory } from '@/api/browse-history'
import { quoteProductPricing } from '@/api/promotion'
import type { Product, ProductSku } from '@/types/product'
import { useAppStore } from '@/stores/app'
import { useCartStore } from '@/stores/cart'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const cartStore = useCartStore()
const userStore = useUserStore()

const loading = ref(false)
const product = ref<Product | null>(null)
const selectedSkuId = ref<number | null>(null)
const quantity = ref(1)
const activeImage = ref('')

const colors = computed(() => {
  if (!product.value?.skus) return []
  return [...new Set(product.value.skus.map((s) => s.color).filter(Boolean))] as string[]
})

const sizes = computed(() => {
  if (!product.value?.skus) return []
  return [...new Set(product.value.skus.map((s) => s.size).filter(Boolean))] as string[]
})

const selectedColor = ref<string>('')
const selectedSize = ref<string>('')

const pricing = ref<{
  originalPrice: number
  salePrice: number
  promotionType?: 'flash_sale' | 'discount' | null
  promotionTitle?: { zh: string; en: string } | null
} | null>(null)

const promoTypeFallback: Record<string, { zh: string; en: string }> = {
  flash_sale: { zh: '限时秒杀', en: 'Flash Sale' },
  discount: { zh: '专享优惠', en: 'Special Offer' },
}

const images = computed(() => {
  if (!product.value) return []
  const list = [product.value.mainImage, ...(product.value.images || [])].filter(Boolean) as string[]
  if (!list.length && product.value.id) {
    return [`https://picsum.photos/seed/${product.value.id}/600/600`]
  }
  return list
})

const selectedSku = computed<ProductSku | null>(() => {
  if (!product.value?.skus) return null
  if (selectedSkuId.value) {
    return product.value.skus.find((s) => s.id === selectedSkuId.value) || null
  }
  return product.value.skus.find(
    (s) =>
      (!selectedColor.value || s.color === selectedColor.value) &&
      (!selectedSize.value || s.size === selectedSize.value),
  ) || null
})

const currentPrice = computed(() => {
  if (!selectedSku.value) return 0
  return getSkuPrice(selectedSku.value, appStore.currency)
})

const displaySalePrice = computed(() => pricing.value?.salePrice ?? currentPrice.value)
const displayOriginalPrice = computed(() => pricing.value?.originalPrice ?? currentPrice.value)
const hasPromotion = computed(() => displaySalePrice.value < displayOriginalPrice.value)

const promotionLabel = computed(() => {
  if (!hasPromotion.value || !pricing.value) return ''
  const title = pricing.value.promotionTitle
  if (title?.zh || title?.en) {
    return appStore.locale === 'zh' ? title.zh || title.en : title.en || title.zh
  }
  const type = pricing.value.promotionType
  if (type && promoTypeFallback[type]) {
    return appStore.locale === 'zh' ? promoTypeFallback[type].zh : promoTypeFallback[type].en
  }
  return appStore.locale === 'zh' ? '促销' : 'Promo'
})

const promotionTagClass = computed(() => {
  if (pricing.value?.promotionType === 'flash_sale') return 'flash'
  return 'discount'
})

async function refreshPricing() {
  if (!product.value || !selectedSku.value) {
    pricing.value = null
    return
  }
  try {
    const [row] = await quoteProductPricing(
      [{ productId: product.value.id, productSkuId: selectedSku.value.id }],
      appStore.currency,
    )
    if (row) {
      pricing.value = {
        originalPrice: row.originalPrice,
        salePrice: row.salePrice,
        promotionType: row.promotionType,
        promotionTitle: row.promotionTitle,
      }
    } else {
      pricing.value = null
    }
  } catch {
    pricing.value = null
  }
}

function pickSkuBySpec() {
  const sku = product.value?.skus.find(
    (s) =>
      (!selectedColor.value || s.color === selectedColor.value) &&
      (!selectedSize.value || s.size === selectedSize.value),
  )
  if (sku) selectedSkuId.value = sku.id
}

function selectColor(color: string) {
  selectedColor.value = color
  pickSkuBySpec()
}

function selectSize(size: string) {
  selectedSize.value = size
  pickSkuBySpec()
}

async function addToCart() {
  if (!product.value || !selectedSku.value) {
    ElMessage.warning('请选择规格')
    return
  }
  if (selectedSku.value.stock < quantity.value) {
    ElMessage.warning('库存不足')
    return
  }

  if (!pricing.value) {
    await refreshPricing()
  }

  const originalPrice = pricing.value?.originalPrice ?? getSkuPrice(selectedSku.value, appStore.currency)
  const salePrice = pricing.value?.salePrice ?? originalPrice

  cartStore.addItem({
    productId: product.value.id,
    productSkuId: selectedSku.value.id,
    title: appStore.locale === 'zh' ? product.value.title.zh : product.value.title.en,
    specText: formatSpec(selectedSku.value),
    imageUrl: selectedSku.value.imageUrl || images.value[0] || '',
    price: salePrice,
    originalPrice,
    currency: appStore.currency,
    quantity: quantity.value,
    stock: selectedSku.value.stock,
  })
  ElMessage.success('已加入购物车')
}

async function buyNow() {
  await addToCart()
  router.push('/cart')
}

async function loadProduct(id: number) {
  loading.value = true
  try {
    product.value = await getProduct(id)
    activeImage.value = images.value[0] || ''
    if (product.value.skus?.length) {
      const first = product.value.skus[0]
      selectedSkuId.value = first.id
      selectedColor.value = first.color || ''
      selectedSize.value = first.size || ''
    }
    await refreshPricing()

    if (userStore.token && product.value) {
      recordBrowseHistory(product.value.id).catch(() => undefined)
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProduct(Number(route.params.id))
})

watch(
  () => route.params.id,
  (id) => {
    if (id) loadProduct(Number(id))
  },
)

watch(selectedSku, () => {
  refreshPricing()
})

watch(
  () => appStore.currency,
  () => {
    refreshPricing()
  },
)
</script>

<template>
  <div v-loading="loading" class="detail-page">
    <template v-if="product">
      <el-row :gutter="32">
        <el-col :xs="24" :md="12">
          <div class="gallery">
            <div class="main-img">
              <img :src="activeImage || images[0]" :alt="product.title.zh" />
            </div>
            <div v-if="images.length > 1" class="thumb-list">
              <img
                v-for="(img, i) in images"
                :key="i"
                :src="img"
                :class="{ active: activeImage === img }"
                @click="activeImage = img"
              />
            </div>
          </div>
        </el-col>

        <el-col :xs="24" :md="12">
          <div class="info-panel">
            <h1>{{ appStore.locale === 'zh' ? product.title.zh : product.title.en }}</h1>
            <p class="sales-line">{{ formatSalesCount(product.salesCount ?? 0, appStore.locale) }}</p>
            <div class="price-block">
              <div class="price-main">
                <p class="price" :class="{ promo: hasPromotion }">{{ appStore.formatPrice(displaySalePrice) }}</p>
                <p v-if="hasPromotion" class="orig-price">{{ appStore.formatPrice(displayOriginalPrice) }}</p>
              </div>
              <span v-if="hasPromotion && promotionLabel" class="promo-tag" :class="promotionTagClass">
                {{ promotionLabel }}
              </span>
            </div>
            <p class="desc">{{ product.description }}</p>

            <div v-if="colors.length" class="spec-group">
              <label>颜色</label>
              <div class="spec-options">
                <button
                  v-for="c in colors"
                  :key="c"
                  :class="['spec-btn', { active: selectedColor === c }]"
                  @click="selectColor(c)"
                >
                  {{ c }}
                </button>
              </div>
            </div>

            <div v-if="sizes.length" class="spec-group">
              <label>尺寸</label>
              <div class="spec-options">
                <button
                  v-for="s in sizes"
                  :key="s"
                  :class="['spec-btn', { active: selectedSize === s }]"
                  @click="selectSize(s)"
                >
                  {{ s }}
                </button>
              </div>
            </div>

            <div v-if="selectedSku" class="stock-info">
              库存：{{ Number(selectedSku.stock) }} 件 · SKU: {{ selectedSku.skuCode }}
            </div>

            <div class="qty-row">
              <label>数量</label>
              <el-input-number
                v-model="quantity"
                :min="1"
                :max="Math.max(1, Number(selectedSku?.stock) || 1)"
                size="large"
              />
            </div>

            <div class="actions">
              <el-button type="primary" size="large" @click="addToCart">加入购物车</el-button>
              <el-button size="large" @click="buyNow">立即购买</el-button>
            </div>
          </div>
        </el-col>
      </el-row>
    </template>
  </div>
</template>

<style scoped>
.detail-page {
  min-height: 400px;
}

.gallery .main-img {
  aspect-ratio: 1;
  border-radius: var(--cb-radius-lg);
  overflow: hidden;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid var(--cb-border);
  box-shadow: var(--cb-glow-cyan);
}

.gallery .main-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-list {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  overflow-x: auto;
}

.thumb-list img {
  width: 72px;
  height: 72px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  flex-shrink: 0;
  transition: all 0.25s;
  opacity: 0.7;
}

.thumb-list img:hover {
  opacity: 1;
}

.thumb-list img.active {
  border-color: var(--cb-neon-cyan);
  box-shadow: var(--cb-glow-cyan);
  opacity: 1;
}

.info-panel {
  background: var(--cb-surface);
  backdrop-filter: blur(16px);
  border-radius: var(--cb-radius-lg);
  padding: 28px;
  border: 1px solid var(--cb-border);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.info-panel h1 {
  font-family: var(--cb-font-display);
  font-size: clamp(1.2rem, 3vw, 1.6rem);
  line-height: 1.4;
  margin-bottom: 8px;
  letter-spacing: 0.04em;
  color: var(--cb-text);
}

.sales-line {
  font-size: 13px;
  color: var(--cb-text-muted);
  letter-spacing: 0.04em;
  margin-bottom: 12px;
}

.price-block {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.price-main {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 12px;
}

.promo-tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.promo-tag.flash {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  color: #fff;
}

.promo-tag.discount {
  border: 1px solid var(--cb-accent);
  background: rgba(201, 169, 98, 0.12);
  color: var(--cb-accent);
}

.price {
  font-family: var(--cb-font-display);
  color: var(--cb-neon-cyan);
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 0 20px rgba(201, 169, 98, 0.45);
}

.price.promo {
  color: #e74c3c;
  text-shadow: 0 0 20px rgba(231, 76, 60, 0.35);
}

.orig-price {
  margin: 0;
  font-size: 18px;
  color: var(--cb-text-muted);
  text-decoration: line-through;
}

.desc {
  color: var(--cb-text-dim);
  line-height: 1.7;
  margin-bottom: 24px;
  font-size: 15px;
}

.spec-group {
  margin-bottom: 20px;
}

.spec-group label {
  display: block;
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--cb-neon-cyan);
  opacity: 0.7;
  margin-bottom: 10px;
  text-transform: uppercase;
}

.spec-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.spec-btn {
  padding: 10px 18px;
  border: 1px solid var(--cb-border);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.8);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--cb-text-dim);
  transition: all 0.25s;
}

.spec-btn:hover {
  border-color: var(--cb-border-hover);
  color: var(--cb-neon-cyan);
}

.spec-btn.active {
  border-color: var(--cb-neon-cyan);
  color: var(--cb-neon-cyan);
  background: rgba(201, 169, 98, 0.1);
  box-shadow: var(--cb-glow-cyan);
}

.stock-info {
  font-family: var(--cb-font-mono);
  font-size: 12px;
  color: var(--cb-text-muted);
  margin-bottom: 16px;
  letter-spacing: 0.04em;
}

.qty-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.qty-row label {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.1em;
  color: var(--cb-text-muted);
  text-transform: uppercase;
}

.actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.actions .el-button {
  flex: 1;
  min-width: 140px;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.actions .el-button:not(.el-button--primary) {
  background: rgba(201, 169, 98, 0.08) !important;
  border: 1px solid var(--cb-border) !important;
  color: var(--cb-neon-cyan) !important;
}

@media (max-width: 768px) {
  .info-panel {
    margin-top: 20px;
    padding: 16px;
  }

  .actions .el-button {
    width: 100%;
  }
}
</style>
