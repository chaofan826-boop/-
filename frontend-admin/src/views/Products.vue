<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'
import {
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  updateProduct,
  updateProductStatus,
} from '@/api/product'
import { getCategories } from '@/api/category'
import { uploadProductImage } from '@/api/upload'
import { useUserStore } from '@/stores/user'
import type { Category } from '@/types/category'
import type { Product, ProductSku, ProductStatus } from '@/types/product'

type FormSku = ProductSku & { _clientKey: string }

const router = useRouter()
const userStore = useUserStore()

let nextSkuKey = 0

function createClientKey(id?: number) {
  return id != null ? `sku-${id}` : `new-${++nextSkuKey}`
}

const loading = ref(false)
const products = ref<Product[]>([])
const categoryOptions = ref<Category[]>([])
const total = ref(0)
const dialogVisible = ref(false)
const dialogTitle = ref('新增商品')
const editingId = ref<number | null>(null)
const submitLoading = ref(false)
const mainImageUploading = ref(false)
const galleryUploading = ref(false)

const MAX_GALLERY = 8

const query = reactive({
  page: 1,
  pageSize: 10,
  keyword: '',
  status: '' as ProductStatus | '',
  categoryId: undefined as number | undefined,
})

const defaultSku = (): FormSku => ({
  _clientKey: createClientKey(),
  skuCode: '',
  color: '',
  size: '',
  prices: { USD: 0, CNY: 0 },
  stock: 0,
})

function toFormSku(s: ProductSku): FormSku {
  return {
    _clientKey: createClientKey(s.id),
    id: s.id,
    skuCode: s.skuCode,
    color: s.color || '',
    size: s.size || '',
    prices: { ...s.prices },
    stock: Math.max(0, Number(s.stock) || 0),
  }
}

function buildSkuPayload(s: FormSku) {
  const payload: {
    id?: number
    skuCode: string
    color?: string
    size?: string
    prices: Record<string, number>
    stock: number
  } = {
    skuCode: s.skuCode,
    color: s.color || undefined,
    size: s.size || undefined,
    prices: {
      USD: Number(s.prices?.USD) || 0,
      CNY: Number(s.prices?.CNY) || 0,
    },
    stock: Math.max(0, Number(s.stock) || 0),
  }
  if (s.id != null && !Number.isNaN(Number(s.id))) {
    payload.id = Number(s.id)
  }
  return payload
}

const form = reactive({
  merchantId: 1,
  spuCode: '',
  titleZh: '',
  titleEn: '',
  description: '',
  status: 'draft' as ProductStatus,
  categoryId: undefined as number | undefined,
  salesCount: 0,
  mainImage: '',
  images: [] as string[],
  skus: [defaultSku()] as FormSku[],
})

function resetForm() {
  editingId.value = null
  Object.assign(form, {
    merchantId: 1,
    spuCode: '',
    titleZh: '',
    titleEn: '',
    description: '',
    status: 'draft' as ProductStatus,
    categoryId: undefined,
    salesCount: 0,
    mainImage: '',
    images: [] as string[],
    skus: [defaultSku()],
  })
}

function productThumb(row: Product) {
  return row.mainImage || `https://picsum.photos/seed/p${row.id}/80/80`
}

function beforeImageUpload(file: File) {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowed.includes(file.type)) {
    ElMessage.warning('仅支持 JPG、PNG、GIF、WebP 格式')
    return false
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB')
    return false
  }
  return true
}

async function handleMainImageUpload(options: UploadRequestOptions) {
  mainImageUploading.value = true
  try {
    const res = await uploadProductImage(options.file as File)
    form.mainImage = res.url
    ElMessage.success('主图上传成功')
    options.onSuccess?.(res)
  } catch (err) {
    options.onError?.(err as Error)
  } finally {
    mainImageUploading.value = false
  }
}

async function handleGalleryUpload(options: UploadRequestOptions) {
  if (form.images.length >= MAX_GALLERY) {
    ElMessage.warning(`图集最多 ${MAX_GALLERY} 张`)
    options.onError?.(new Error('limit'))
    return
  }
  galleryUploading.value = true
  try {
    const res = await uploadProductImage(options.file as File)
    form.images.push(res.url)
    ElMessage.success('图片已添加')
    options.onSuccess?.(res)
  } catch (err) {
    options.onError?.(err as Error)
  } finally {
    galleryUploading.value = false
  }
}

function removeGalleryImage(index: number) {
  form.images.splice(index, 1)
}

function setAsMainImage(url: string) {
  form.mainImage = url
}

async function loadCategoryOptions() {
  categoryOptions.value = await getCategories({ status: 'active' })
}

async function loadProducts() {
  loading.value = true
  try {
    const res = await getProducts({
      page: query.page,
      pageSize: query.pageSize,
      keyword: query.keyword || undefined,
      status: query.status || undefined,
      categoryId: query.categoryId,
    })
    products.value = res.list
    total.value = res.total
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.page = 1
  loadProducts()
}

function openCreate() {
  resetForm()
  dialogTitle.value = '新增商品'
  dialogVisible.value = true
}

async function openEdit(row: Product) {
  dialogTitle.value = '编辑商品'
  editingId.value = row.id
  const detail = await getProduct(row.id)
  Object.assign(form, {
    merchantId: detail.merchantId,
    spuCode: detail.spuCode,
    titleZh: detail.title.zh,
    titleEn: detail.title.en,
    description: detail.description || '',
    status: detail.status,
    categoryId: detail.categoryId ?? undefined,
    salesCount: detail.salesCount ?? 0,
    mainImage: detail.mainImage || '',
    images: detail.images?.length ? [...detail.images] : [],
    skus: detail.skus?.length
      ? detail.skus.map((s) => toFormSku(s))
      : [defaultSku()],
  })
  dialogVisible.value = true
}

function addSkuRow() {
  form.skus.push(defaultSku())
}

async function removeSkuRow(index: number) {
  if (form.skus.length <= 1) {
    ElMessage.warning('至少保留一个 SKU')
    return
  }

  const sku = form.skus[index]
  if (sku.id != null) {
    try {
      await ElMessageBox.confirm(
        `确定移除 SKU「${sku.skuCode}」？保存后将从商品中删除该规格。`,
        '移除确认',
        { type: 'warning' },
      )
    } catch {
      return
    }
  }

  form.skus.splice(index, 1)
}

async function handleSubmit() {
  if (!userStore.token) {
    ElMessage.warning('登录已过期，请重新登录')
    router.push('/login')
    return
  }

  if (!form.spuCode || !form.titleZh || !form.titleEn) {
    ElMessage.warning('请填写 SPU 编码和中英文标题')
    return
  }
  for (const sku of form.skus) {
    if (!sku.skuCode) {
      ElMessage.warning('请填写 SKU 编码')
      return
    }
  }

  submitLoading.value = true
  try {
    const payload = {
      merchantId: form.merchantId,
      spuCode: form.spuCode,
      title: { zh: form.titleZh, en: form.titleEn },
      description: form.description,
      status: form.status,
      categoryId: form.categoryId ?? null,
      salesCount: Math.max(0, Number(form.salesCount) || 0),
      mainImage: form.mainImage.trim() || null,
      images: form.images.length ? form.images : null,
      skus: form.skus.map(buildSkuPayload),
    }
    if (editingId.value) {
      await updateProduct({
        id: Number(editingId.value),
        ...payload,
      })
      ElMessage.success('更新成功')
    } else {
      await createProduct(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadProducts()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: Product) {
  await ElMessageBox.confirm(`确定删除商品「${row.title.zh}」？`, '删除确认', { type: 'warning' })
  await deleteProduct(row.id)
  ElMessage.success('删除成功')
  await loadProducts()
}

async function handleStatusChange(row: Product, status: ProductStatus) {
  await updateProductStatus(row.id, status)
  ElMessage.success(status === 'active' ? '已上架' : '已下架')
  await loadProducts()
}

function statusTagType(status: ProductStatus) {
  return status === 'active' ? 'success' : status === 'draft' ? 'info' : 'danger'
}

function statusLabel(status: ProductStatus) {
  const map: Record<ProductStatus, string> = {
    draft: '草稿',
    active: '已上架',
    inactive: '已下架',
  }
  return map[status]
}

onMounted(async () => {
  await loadCategoryOptions()
  await loadProducts()
})
</script>

<template>
  <div>
    <div class="toolbar">
      <div>
        <p class="page-tag">商品管理</p>
        <h2 class="page-title">商品管理</h2>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增商品</el-button>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="关键词">
          <el-input v-model="query.keyword" placeholder="SPU / 商品名" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="草稿" value="draft" />
            <el-option label="已上架" value="active" />
            <el-option label="已下架" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="query.categoryId" placeholder="全部" clearable style="width: 140px">
            <el-option
              v-for="cat in categoryOptions"
              :key="cat.id"
              :label="cat.name.zh"
              :value="cat.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="products" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="图片" width="72">
          <template #default="{ row }">
            <img :src="productThumb(row)" alt="" class="table-thumb" />
          </template>
        </el-table-column>
        <el-table-column prop="spuCode" label="SPU编码" width="140" />
        <el-table-column label="商品名称" min-width="180">
          <template #default="{ row }">
            <div>{{ row.title.zh }}</div>
            <div class="sub-text">{{ row.title.en }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="merchantId" label="商户ID" width="90" />
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            {{ row.category?.name?.zh || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="SKU数" width="80">
          <template #default="{ row }">{{ row.skus?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="销量" width="90">
          <template #default="{ row }">{{ row.salesCount ?? 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="row.status !== 'active'"
              link
              type="success"
              @click="handleStatusChange(row, 'active')"
            >
              上架
            </el-button>
            <el-button
              v-if="row.status === 'active'"
              link
              type="warning"
              @click="handleStatusChange(row, 'inactive')"
            >
              下架
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @change="loadProducts"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="860px" destroy-on-close>
      <el-form label-width="100px">
        <el-divider content-position="left">SPU 信息</el-divider>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="商户ID" required>
              <el-input-number v-model="form.merchantId" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="SPU编码" required>
              <el-input v-model="form.spuCode" placeholder="如 SPU-001" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="中文标题" required>
              <el-input v-model="form.titleZh" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="英文标题" required>
              <el-input v-model="form.titleEn" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="分类">
              <el-select v-model="form.categoryId" placeholder="未分类" clearable style="width: 100%">
                <el-option
                  v-for="cat in categoryOptions"
                  :key="cat.id"
                  :label="`${cat.name.zh} / ${cat.name.en}`"
                  :value="cat.id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="form.status" style="width: 100%">
                <el-option label="草稿" value="draft" />
                <el-option label="已上架" value="active" />
                <el-option label="已下架" value="inactive" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="销量">
              <el-input-number v-model="form.salesCount" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">商品图片</el-divider>
        <el-form-item label="主图">
          <div class="image-section">
            <el-upload
              class="main-uploader"
              :show-file-list="false"
              accept="image/jpeg,image/png,image/gif,image/webp"
              :http-request="handleMainImageUpload"
              :before-upload="beforeImageUpload"
              :disabled="mainImageUploading"
            >
              <img v-if="form.mainImage" :src="form.mainImage" class="main-preview" alt="主图" />
              <div v-else class="upload-placeholder">
                <el-icon><Plus /></el-icon>
                <span>上传主图</span>
              </div>
            </el-upload>
            <div class="image-url-field">
              <el-input v-model="form.mainImage" placeholder="或粘贴图片 URL" clearable />
              <el-button v-if="form.mainImage" link type="danger" @click="form.mainImage = ''">清除主图</el-button>
            </div>
          </div>
        </el-form-item>

        <el-form-item label="图集">
          <div class="gallery-section">
            <div v-for="(img, index) in form.images" :key="`${img}-${index}`" class="gallery-item">
              <img :src="img" alt="" />
              <div class="gallery-actions">
                <el-button link type="primary" size="small" @click="setAsMainImage(img)">设为主图</el-button>
                <el-button link type="danger" size="small" @click="removeGalleryImage(index)">删除</el-button>
              </div>
            </div>
            <el-upload
              v-if="form.images.length < MAX_GALLERY"
              class="gallery-uploader"
              :show-file-list="false"
              accept="image/jpeg,image/png,image/gif,image/webp"
              :http-request="handleGalleryUpload"
              :before-upload="beforeImageUpload"
              :disabled="galleryUploading"
            >
              <div class="upload-placeholder small">
                <el-icon><Plus /></el-icon>
                <span>添加</span>
              </div>
            </el-upload>
          </div>
          <p class="image-hint">最多 {{ MAX_GALLERY }} 张，支持 JPG/PNG/GIF/WebP，单张不超过 5MB</p>
        </el-form-item>

        <el-divider content-position="left">
          SKU 规格
          <el-button link type="primary" style="margin-left: 12px" @click="addSkuRow">+ 添加 SKU</el-button>
        </el-divider>

        <div v-for="(sku, index) in form.skus" :key="sku._clientKey" class="sku-block">
          <div class="sku-header">
            <span>SKU #{{ index + 1 }}</span>
            <el-button v-if="form.skus.length > 1" link type="danger" @click="removeSkuRow(index)">移除</el-button>
          </div>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="SKU编码" label-width="80px" required>
                <el-input v-model="sku.skuCode" size="small" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="颜色" label-width="80px">
                <el-input v-model="sku.color" size="small" placeholder="Red" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="尺寸" label-width="80px">
                <el-input v-model="sku.size" size="small" placeholder="M" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="12">
            <el-col :span="8">
              <el-form-item label="USD" label-width="80px">
                <el-input-number v-model="sku.prices.USD" :min="0" :precision="2" size="small" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="CNY" label-width="80px">
                <el-input-number v-model="sku.prices.CNY" :min="0" :precision="2" size="small" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="8">
              <el-form-item label="库存" label-width="80px">
                <el-input-number v-model="sku.stock" :min="0" :step="1" :precision="0" size="small" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
        </div>
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

.sub-text {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.sku-block {
  background: rgba(201, 169, 98, 0.04);
  border: 1px solid var(--cb-border);
  border-radius: 8px;
  padding: 12px 12px 0;
  margin-bottom: 12px;
}

.sku-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 13px;
  color: var(--cb-text-dim);
  letter-spacing: 0.04em;
}

.table-thumb {
  width: 48px;
  height: 48px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--cb-border);
}

.image-section {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  width: 100%;
}

.image-url-field {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.main-uploader :deep(.el-upload) {
  border: 1px dashed var(--cb-border);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}

.main-uploader :deep(.el-upload:hover) {
  border-color: var(--cb-accent);
}

.main-preview {
  width: 120px;
  height: 120px;
  object-fit: cover;
  display: block;
}

.upload-placeholder {
  width: 120px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--cb-text-muted);
  font-size: 13px;
}

.upload-placeholder.small {
  width: 88px;
  height: 88px;
  font-size: 12px;
}

.gallery-section {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.gallery-item {
  position: relative;
  border: 1px solid var(--cb-border);
  border-radius: 8px;
  overflow: hidden;
  background: rgba(18, 18, 22, 0.6);
}

.gallery-item img {
  width: 88px;
  height: 88px;
  object-fit: cover;
  display: block;
}

.gallery-actions {
  display: flex;
  justify-content: center;
  gap: 4px;
  padding: 4px;
  border-top: 1px solid var(--cb-border);
}

.gallery-uploader :deep(.el-upload) {
  border: 1px dashed var(--cb-border);
  border-radius: 8px;
  cursor: pointer;
}

.gallery-uploader :deep(.el-upload:hover) {
  border-color: var(--cb-accent);
}

.image-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--cb-text-muted);
}
</style>
