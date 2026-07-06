<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getProducts } from '@/api/product'
import {
  createPromotion,
  deletePromotion,
  getPromotions,
  updatePromotion,
  updatePromotionStatus,
} from '@/api/promotion'
import { useUserStore } from '@/stores/user'
import type { Product } from '@/types/product'
import type {
  ProductSalePrices,
  Promotion,
  PromotionStatus,
  PromotionType,
} from '@/types/promotion'
import { PROMOTION_TYPE_LABELS } from '@/types/promotion'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const promotions = ref<Promotion[]>([])
const productOptions = ref<Product[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增活动')
const editingId = ref<number | null>(null)
const submitLoading = ref(false)
const statusLoadingId = ref<number | null>(null)

const activeTab = ref<PromotionType>('featured')
const filterStatus = ref<PromotionStatus | ''>('')

const form = reactive({
  type: 'featured' as PromotionType,
  titleZh: '',
  subtitleZh: '',
  subtitleEn: '',
  discountPercent: 0,
  productIds: [] as number[],
  salePrices: {} as ProductSalePrices,
  flashStock: 100,
  startAt: '',
  endAt: '',
  sortOrder: 0,
  status: 'active' as PromotionStatus,
})

const filteredPromotions = computed(() =>
  promotions.value.filter((p) => {
    if (p.type !== activeTab.value) return false
    if (filterStatus.value && p.status !== filterStatus.value) return false
    return true
  }),
)

const featuredPromotion = computed(() => promotions.value.find((p) => p.type === 'featured'))

const canCreateFeatured = computed(() => !featuredPromotion.value)

const canCreateInActiveTab = computed(() =>
  activeTab.value === 'featured' ? canCreateFeatured.value : true,
)

const exclusiveConflictType = computed(() => {
  if (form.type === 'flash_sale') return 'discount' as PromotionType
  if (form.type === 'discount') return 'flash_sale' as PromotionType
  return null
})

const conflictingProductMap = computed(() => {
  const map = new Map<number, Promotion>()
  const oppositeType = exclusiveConflictType.value
  if (!oppositeType) return map

  for (const promotion of promotions.value) {
    if (promotion.type !== oppositeType) continue
    if (promotion.id === editingId.value) continue
    for (const productId of promotion.productIds) {
      map.set(productId, promotion)
    }
  }
  return map
})

const exclusiveHint = computed(() => {
  if (form.type === 'flash_sale') {
    return '限时秒杀与新人专享不能包含相同商品。已参与新人专享的商品无法再次加入。'
  }
  if (form.type === 'discount') {
    return '新人专享与限时秒杀不能包含相同商品。已参与限时秒杀的商品无法再次加入。'
  }
  return ''
})

const selectedProducts = computed(() =>
  productOptions.value.filter((p) => form.productIds.includes(p.id)),
)

function getProductConflict(productId: number) {
  return conflictingProductMap.value.get(productId)
}

function warnProductConflict(productId: number) {
  const conflict = getProductConflict(productId)
  if (!conflict) return false

  const existingLabel = conflict.type === 'flash_sale' ? '限时秒杀' : '新人专享'
  const targetLabel = form.type === 'flash_sale' ? '限时秒杀' : '新人专享'
  const product = productOptions.value.find((item) => item.id === productId)
  const productName = product?.title.zh ?? `商品#${productId}`
  ElMessage.warning(
    `「${productName}」已参与${existingLabel}「${conflict.title.zh}」，不能同时设置为${targetLabel}`,
  )
  return true
}

function defaultDateRange() {
  const start = new Date()
  const end = new Date()
  end.setDate(end.getDate() + 7)
  return {
    startAt: start.toISOString().slice(0, 19),
    endAt: end.toISOString().slice(0, 19),
  }
}

function resetForm(type: PromotionType = activeTab.value) {
  editingId.value = null
  const dates = defaultDateRange()
  Object.assign(form, {
    type,
    titleZh: '',
    subtitleZh: '',
    subtitleEn: '',
    discountPercent: type === 'discount' ? 15 : type === 'flash_sale' ? 30 : 0,
    productIds: [],
    salePrices: {},
    flashStock: 100,
    startAt: dates.startAt,
    endAt: dates.endAt,
    sortOrder: 0,
    status: 'active' as PromotionStatus,
  })
}

function ensureSalePriceRow(productId: number) {
  const key = String(productId)
  if (!form.salePrices[key]) {
    form.salePrices[key] = { USD: undefined, CNY: undefined }
  }
}

watch(
  () => [...form.productIds],
  (ids, prev) => {
    if (prev?.length) {
      const added = ids.filter((id) => !prev.includes(id))
      const blocked = added.filter((id) => getProductConflict(id))
      if (blocked.length) {
        blocked.forEach((id) => warnProductConflict(id))
        form.productIds = ids.filter((id) => !blocked.includes(id))
        return
      }
    }

    if (form.type !== 'flash_sale') return
    for (const id of ids) ensureSalePriceRow(id)
    for (const key of Object.keys(form.salePrices)) {
      if (!ids.includes(Number(key))) delete form.salePrices[key]
    }
  },
)

async function loadProductOptions() {
  const res = await getProducts({ status: 'active', pageSize: 100 })
  productOptions.value = res.list
}

async function loadPromotions() {
  loading.value = true
  try {
    promotions.value = await getPromotions()
  } finally {
    loading.value = false
  }
}

function rowClassName({ row }: { row: Promotion }) {
  return row.status === 'inactive' ? 'row-inactive' : ''
}

function openCreate() {
  if (activeTab.value === 'featured' && !canCreateFeatured.value) {
    ElMessage.warning('臻品推荐只能设置一条，请编辑已有配置')
    return
  }
  resetForm(activeTab.value)
  dialogTitle.value = `新增${PROMOTION_TYPE_LABELS[activeTab.value]}`
  dialogVisible.value = true
}

function toLocalDatetime(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function openEdit(row: Promotion) {
  editingId.value = row.id
  dialogTitle.value = `编辑${PROMOTION_TYPE_LABELS[row.type]}`
  Object.assign(form, {
    type: row.type,
    titleZh: row.title.zh,
    subtitleZh: row.subtitle?.zh ?? '',
    subtitleEn: row.subtitle?.en ?? '',
    discountPercent: row.discountPercent,
    productIds: [...row.productIds],
    salePrices: row.salePrices ? { ...row.salePrices } : {},
    flashStock: row.flashStock ?? 100,
    startAt: toLocalDatetime(row.startAt),
    endAt: toLocalDatetime(row.endAt),
    sortOrder: row.sortOrder,
    status: row.status,
  })
  for (const id of form.productIds) ensureSalePriceRow(id)
  dialogVisible.value = true
}

function buildTitle(required = true) {
  const zh = form.titleZh.trim()
  if (!zh) return required ? undefined : null
  return { zh, en: zh }
}

function buildSubtitle() {
  if (!form.subtitleZh && !form.subtitleEn) return null
  if (!form.subtitleZh || !form.subtitleEn) {
    ElMessage.warning('副标题需同时填写中文和英文，或留空')
    return undefined
  }
  return { zh: form.subtitleZh, en: form.subtitleEn }
}

function buildSalePricesPayload(): ProductSalePrices | null {
  if (form.type !== 'flash_sale') return null
  const payload: ProductSalePrices = {}
  for (const id of form.productIds) {
    const row = form.salePrices[String(id)]
    if (row && (row.USD != null || row.CNY != null)) {
      payload[String(id)] = {
        USD: row.USD != null ? Number(row.USD) : undefined,
        CNY: row.CNY != null ? Number(row.CNY) : undefined,
      }
    }
  }
  return Object.keys(payload).length ? payload : null
}

async function handleSubmit() {
  if (!userStore.token) {
    ElMessage.warning('登录已过期，请重新登录')
    router.push('/login')
    return
  }

  const title = buildTitle()
  if (!title) return

  let subtitle: ReturnType<typeof buildSubtitle> = null
  if (!editingId.value) {
    subtitle = buildSubtitle()
    if (subtitle === undefined) return
  }

  if (!form.productIds.length) {
    ElMessage.warning('请选择商品')
    return
  }
  if (!form.startAt || !form.endAt) {
    ElMessage.warning('请设置活动时间')
    return
  }
  if (form.type === 'featured' && !editingId.value && !canCreateFeatured.value) {
    ElMessage.warning('臻品推荐只能设置一条')
    return
  }
  if (form.type === 'discount' && form.discountPercent <= 0) {
    ElMessage.warning('请设置优惠比例')
    return
  }
  if (form.type === 'flash_sale') {
    const salePrices = buildSalePricesPayload()
    if (!salePrices && form.discountPercent <= 0) {
      ElMessage.warning('限时秒杀需设置秒杀价或优惠比例')
      return
    }
  }

  submitLoading.value = true
  try {
    const payload = {
      type: form.type,
      title,
      discountPercent: form.type === 'featured' ? 0 : form.discountPercent,
      productIds: form.productIds,
      salePrices: buildSalePricesPayload(),
      flashStock: form.type === 'flash_sale' ? form.flashStock : null,
      startAt: new Date(form.startAt).toISOString(),
      endAt: new Date(form.endAt).toISOString(),
      sortOrder: form.sortOrder,
      status: form.status,
      ...(editingId.value ? {} : { subtitle }),
    }

    if (editingId.value) {
      await updatePromotion({ id: editingId.value, ...payload })
      ElMessage.success('更新成功')
    } else {
      await createPromotion(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadPromotions()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: Promotion) {
  await ElMessageBox.confirm(`确定删除「${row.title.zh}」？`, '删除确认', { type: 'warning' })
  await deletePromotion(row.id)
  ElMessage.success('删除成功')
  await loadPromotions()
}

async function handleStatusToggle(row: Promotion, enabled: boolean) {
  const nextStatus: PromotionStatus = enabled ? 'active' : 'inactive'
  if (row.status === nextStatus) return

  statusLoadingId.value = row.id
  try {
    await updatePromotionStatus(row.id, nextStatus)
    row.status = nextStatus
    ElMessage.success(enabled ? '已启用' : '已停用')
  } finally {
    statusLoadingId.value = null
  }
}

function productThumb(p: { id: number; mainImage?: string | null }) {
  return p.mainImage || `https://picsum.photos/seed/p${p.id}/80/80`
}

function removeProduct(id: number) {
  form.productIds = form.productIds.filter((itemId) => itemId !== id)
}

function toggleProduct(id: number) {
  if (form.productIds.includes(id)) {
    removeProduct(id)
    return
  }
  if (warnProductConflict(id)) return
  form.productIds.push(id)
}

function productLabel(id: number) {
  const p = productOptions.value.find((item) => item.id === id)
  return p ? `${p.title.zh} (${p.spuCode})` : `#${id}`
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN')
}

onMounted(async () => {
  await Promise.all([loadProductOptions(), loadPromotions()])
})
</script>

<template>
  <div class="promotions-page">
    <div class="toolbar">
      <div>
        <p class="page-tag">首页营销</p>
        <h2 class="page-title">首页营销配置</h2>
      </div>
      <el-button
        type="primary"
        :icon="Plus"
        :disabled="!canCreateInActiveTab"
        @click="openCreate"
      >
        新增{{ PROMOTION_TYPE_LABELS[activeTab] }}
      </el-button>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true">
        <el-form-item label="状态">
          <el-select v-model="filterStatus" placeholder="全部" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-tabs v-model="activeTab" class="promo-tabs">
      <el-tab-pane label="臻品推荐" name="featured" />
      <el-tab-pane label="限时秒杀" name="flash_sale" />
      <el-tab-pane label="新人专享" name="discount" />
    </el-tabs>

    <el-alert
      v-if="activeTab === 'flash_sale'"
      type="warning"
      :closable="false"
      show-icon
      class="featured-hint"
      title="限时秒杀与新人专享不能包含相同商品，设置时请避免重复选择。"
    />

    <el-alert
      v-if="activeTab === 'discount'"
      type="warning"
      :closable="false"
      show-icon
      class="featured-hint"
      title="新人专享与限时秒杀不能包含相同商品，设置时请避免重复选择。"
    />

    <el-alert
      v-if="activeTab === 'featured'"
      type="info"
      :closable="false"
      show-icon
      class="featured-hint"
      title="臻品推荐仅支持一条配置，用于首页「臻品推荐」区块展示多个精选商品。"
    />

    <el-card shadow="never">
      <el-table
        v-loading="loading"
        :data="filteredPromotions"
        :row-class-name="rowClassName"
        stripe
      >
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="标题" min-width="160">
          <template #default="{ row }">
            <div>{{ row.title.zh }}</div>
          </template>
        </el-table-column>
        <el-table-column label="商品数" width="80">
          <template #default="{ row }">{{ row.productIds.length }}</template>
        </el-table-column>
        <el-table-column v-if="activeTab === 'discount'" label="优惠" width="80">
          <template #default="{ row }">{{ row.discountPercent }}%</template>
        </el-table-column>
        <el-table-column v-if="activeTab === 'flash_sale'" label="秒杀配置" min-width="140">
          <template #default="{ row }">
            <span v-if="row.salePrices && Object.keys(row.salePrices).length">自定义秒杀价</span>
            <span v-else-if="row.discountPercent">{{ row.discountPercent }}% 折扣</span>
            <span v-else class="sub-text">—</span>
          </template>
        </el-table-column>
        <el-table-column label="活动时间" min-width="200">
          <template #default="{ row }">
            <div class="sub-text">{{ formatTime(row.startAt) }}</div>
            <div class="sub-text">至 {{ formatTime(row.endAt) }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="70" />
        <el-table-column label="启用" width="110" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'active'"
              :loading="statusLoadingId === row.id"
              inline-prompt
              active-text="开"
              inactive-text="关"
              @change="(val: boolean) => handleStatusToggle(row, val)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="820px" destroy-on-close>
      <el-form label-width="110px">
        <el-form-item label="活动类型">
          <el-select v-model="form.type" :disabled="!!editingId" style="width: 220px">
            <el-option
              label="臻品推荐"
              value="featured"
              :disabled="!canCreateFeatured && form.type !== 'featured'"
            />
            <el-option label="限时秒杀" value="flash_sale" />
            <el-option label="新人专享" value="discount" />
          </el-select>
        </el-form-item>
        <el-form-item label="标题" required>
          <el-input v-model="form.titleZh" placeholder="如 臻品推荐 / 新人专享" />
        </el-form-item>
        <el-alert
          v-if="exclusiveHint"
          type="warning"
          :closable="false"
          show-icon
          class="exclusive-alert"
          :title="exclusiveHint"
        />
        <el-form-item v-if="!editingId" label="中文副标题">
          <el-input v-model="form.subtitleZh" placeholder="可选" />
        </el-form-item>
        <el-form-item v-if="!editingId" label="英文副标题">
          <el-input v-model="form.subtitleEn" placeholder="Optional" />
        </el-form-item>

        <el-form-item v-if="form.type === 'discount'" label="优惠比例" required>
          <el-input-number v-model="form.discountPercent" :min="1" :max="99" />
          <span class="hint"> % OFF</span>
        </el-form-item>

        <el-form-item v-if="form.type === 'flash_sale'" label="默认折扣">
          <el-input-number v-model="form.discountPercent" :min="0" :max="99" />
          <span class="hint"> 未设秒杀价时按此比例计算</span>
        </el-form-item>

        <el-form-item v-if="form.type === 'flash_sale'" label="秒杀库存">
          <el-input-number v-model="form.flashStock" :min="1" style="width: 160px" />
        </el-form-item>

        <el-form-item label="选择商品" required>
          <el-select
            v-model="form.productIds"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            popper-class="promo-product-select"
            placeholder="搜索并选择参与活动的商品"
            style="width: 100%"
          >
            <el-option
              v-for="p in productOptions"
              :key="p.id"
              :label="`${p.title.zh} (${p.spuCode})`"
              :value="p.id"
              :disabled="!!getProductConflict(p.id)"
            >
              <div class="product-option">
                <img :src="productThumb(p)" class="option-thumb" alt="" loading="lazy" />
                <div class="option-info">
                  <span class="option-title">{{ p.title.zh }}</span>
                  <span class="option-code">{{ p.spuCode }}</span>
                  <span v-if="getProductConflict(p.id)" class="option-conflict">
                    已参与{{ getProductConflict(p.id)?.type === 'flash_sale' ? '限时秒杀' : '新人专享' }}
                  </span>
                </div>
              </div>
            </el-option>
          </el-select>

          <div v-if="productOptions.length" class="product-picker">
            <p class="picker-hint">点击卡片选择 / 取消商品</p>
            <div class="product-grid">
              <button
                v-for="p in productOptions"
                :key="p.id"
                type="button"
                :class="[
                  'product-card',
                  {
                    selected: form.productIds.includes(p.id),
                    conflict: !!getProductConflict(p.id),
                  },
                ]"
                :disabled="!!getProductConflict(p.id)"
                @click="toggleProduct(p.id)"
              >
                <img :src="productThumb(p)" :alt="p.title.zh" loading="lazy" />
                <div class="card-info">
                  <span class="card-title">{{ p.title.zh }}</span>
                  <span class="card-code">{{ p.spuCode }}</span>
                  <span v-if="getProductConflict(p.id)" class="card-conflict">
                    已参与{{ getProductConflict(p.id)?.type === 'flash_sale' ? '限时秒杀' : '新人专享' }}
                  </span>
                </div>
                <span v-if="form.productIds.includes(p.id)" class="card-check">✓</span>
              </button>
            </div>
          </div>
        </el-form-item>

        <el-form-item v-if="form.type === 'flash_sale' && selectedProducts.length" label="秒杀价格">
          <div class="price-table">
            <div v-for="p in selectedProducts" :key="p.id" class="price-row">
              <div class="price-product">
                <img :src="productThumb(p)" class="price-thumb" alt="" />
                <span class="price-label">{{ p.title.zh }}</span>
              </div>
              <el-input-number
                v-model="form.salePrices[String(p.id)].USD"
                :min="0"
                :precision="2"
                placeholder="USD"
                controls-position="right"
              />
              <el-input-number
                v-model="form.salePrices[String(p.id)].CNY"
                :min="0"
                :precision="2"
                placeholder="CNY"
                controls-position="right"
              />
            </div>
          </div>
        </el-form-item>

        <el-form-item label="开始时间" required>
          <el-date-picker
            v-model="form.startAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="开始时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束时间" required>
          <el-date-picker
            v-model="form.endAt"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm:ss"
            placeholder="结束时间"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" style="width: 160px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 160px">
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.page-tag {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-neon-cyan);
  opacity: 0.6;
  margin-bottom: 4px;
}

.page-title {
  margin: 0;
  font-family: var(--cb-font-display);
  font-size: 22px;
  letter-spacing: 0.06em;
  color: var(--cb-text);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-card {
  margin-bottom: 16px;
}

.promo-tabs {
  margin-bottom: 16px;
}

.featured-hint {
  margin-bottom: 16px;
}

.exclusive-alert {
  margin-bottom: 16px;
}

.promotions-page :deep(.row-inactive) {
  opacity: 0.55;
}

.sub-text {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.hint {
  margin-left: 8px;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.price-table {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
}

.price-row {
  display: grid;
  grid-template-columns: minmax(160px, 1fr) 140px 140px;
  gap: 10px;
  align-items: center;
}

.price-label {
  font-size: 13px;
  color: var(--cb-text-dim);
}

.product-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
}

.option-thumb {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--cb-border);
  flex-shrink: 0;
}

.option-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.option-title {
  font-size: 13px;
  color: var(--cb-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.option-code {
  font-size: 11px;
  color: var(--cb-text-muted);
}

.option-conflict {
  font-size: 11px;
  color: #fbbf24;
}

.product-picker {
  margin-top: 12px;
  width: 100%;
}

.picker-hint {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
}

.product-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0;
  border: 1px solid var(--cb-border);
  border-radius: 8px;
  background: rgba(14, 14, 16, 0.6);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
  text-align: left;
}

.product-card:hover {
  border-color: var(--cb-border-hover);
}

.product-card.selected {
  border-color: var(--cb-accent);
  box-shadow: 0 0 0 1px rgba(201, 169, 98, 0.35);
}

.product-card.conflict {
  opacity: 0.55;
  cursor: not-allowed;
}

.product-card.conflict:hover {
  border-color: var(--cb-border);
  box-shadow: none;
}

.card-conflict {
  font-size: 10px;
  color: #fbbf24;
  line-height: 1.3;
}

.product-card img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  background: rgba(18, 18, 22, 0.8);
}

.card-info {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.card-title {
  font-size: 12px;
  color: var(--cb-text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-code {
  font-size: 10px;
  color: var(--cb-text-muted);
}

.card-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--cb-accent);
  color: #1a1a1a;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.price-product {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.price-thumb {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid var(--cb-border);
  flex-shrink: 0;
}
</style>

<style>
.promo-product-select .el-select-dropdown__item {
  height: auto;
  padding-top: 6px;
  padding-bottom: 6px;
}
</style>
