<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import type { UploadRequestOptions } from 'element-plus'
import { createBanner, deleteBanner, getBannerSettings, getBanners, updateBanner, updateBannerSettings, updateBannerStatus } from '@/api/banner'
import { uploadBannerImage } from '@/api/upload'
import { useUserStore } from '@/stores/user'
import type { Banner, BannerStatus } from '@/types/banner'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const banners = ref<Banner[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增轮播图')
const editingId = ref<number | null>(null)
const submitLoading = ref(false)
const imageUploading = ref(false)
const statusLoadingId = ref<number | null>(null)
const settingsLoading = ref(false)
const carouselEnabled = ref(true)

const filterStatus = ref<BannerStatus | ''>('')

const form = reactive({
  titleZh: '',
  titleEn: '',
  imageUrl: '',
  linkUrl: '',
  sortOrder: 0,
  status: 'active' as BannerStatus,
})

const formVisible = computed({
  get: () => form.status === 'active',
  set: (visible: boolean) => {
    form.status = visible ? 'active' : 'inactive'
  },
})

function resetForm() {
  editingId.value = null
  Object.assign(form, {
    titleZh: '',
    titleEn: '',
    imageUrl: '',
    linkUrl: '',
    sortOrder: 0,
    status: 'active' as BannerStatus,
  })
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

async function handleImageUpload(options: UploadRequestOptions) {
  imageUploading.value = true
  try {
    const res = await uploadBannerImage(options.file as File)
    form.imageUrl = res.url
    ElMessage.success('图片上传成功')
  } finally {
    imageUploading.value = false
  }
}

async function loadSettings() {
  const settings = await getBannerSettings()
  carouselEnabled.value = settings.carouselEnabled
}

async function loadBanners() {
  loading.value = true
  try {
    banners.value = await getBanners({
      status: filterStatus.value || undefined,
    })
  } finally {
    loading.value = false
  }
}

async function handleCarouselToggle(enabled: boolean) {
  settingsLoading.value = true
  try {
    const settings = await updateBannerSettings(enabled)
    carouselEnabled.value = settings.carouselEnabled
    ElMessage.success(enabled ? '用户端轮播图已开启' : '用户端轮播图已关闭')
  } finally {
    settingsLoading.value = false
  }
}

function openCreate() {
  resetForm()
  dialogTitle.value = '新增轮播图'
  dialogVisible.value = true
}

function openEdit(row: Banner) {
  editingId.value = row.id
  dialogTitle.value = '编辑轮播图'
  Object.assign(form, {
    titleZh: row.title?.zh ?? '',
    titleEn: row.title?.en ?? '',
    imageUrl: row.imageUrl,
    linkUrl: row.linkUrl ?? '',
    sortOrder: row.sortOrder,
    status: row.status,
  })
  dialogVisible.value = true
}

function buildTitle() {
  if (!form.titleZh && !form.titleEn) return null
  if (!form.titleZh || !form.titleEn) {
    ElMessage.warning('标题需同时填写中文和英文，或留空')
    return undefined
  }
  return { zh: form.titleZh, en: form.titleEn }
}

async function handleSubmit() {
  if (!userStore.token) {
    ElMessage.warning('登录已过期，请重新登录')
    router.push('/login')
    return
  }

  if (!form.imageUrl.trim()) {
    ElMessage.warning('请上传轮播图或填写图片 URL')
    return
  }

  const title = buildTitle()
  if (title === undefined) return

  submitLoading.value = true
  try {
    const payload = {
      title,
      imageUrl: form.imageUrl.trim(),
      linkUrl: form.linkUrl.trim() || null,
      sortOrder: form.sortOrder,
      status: form.status,
    }
    if (editingId.value) {
      await updateBanner({ id: editingId.value, ...payload })
      ElMessage.success('更新成功')
    } else {
      await createBanner(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadBanners()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: Banner) {
  const label = row.title?.zh || `轮播图 #${row.id}`
  await ElMessageBox.confirm(`确定删除「${label}」？`, '删除确认', { type: 'warning' })
  await deleteBanner(row.id)
  ElMessage.success('删除成功')
  await loadBanners()
}

async function handleStatusToggle(row: Banner, visible: boolean) {
  const nextStatus: BannerStatus = visible ? 'active' : 'inactive'
  if (row.status === nextStatus) return

  statusLoadingId.value = row.id
  try {
    await updateBannerStatus(row.id, nextStatus)
    row.status = nextStatus
    ElMessage.success(visible ? '已设为显示' : '已设为隐藏')
  } finally {
    statusLoadingId.value = null
  }
}

function rowClassName({ row }: { row: Banner }) {
  return row.status === 'inactive' ? 'row-inactive' : ''
}

onMounted(async () => {
  await Promise.all([loadSettings(), loadBanners()])
})
</script>

<template>
  <div>
    <div class="toolbar">
      <div>
        <p class="page-tag">轮播图</p>
        <h2 class="page-title">轮播图管理</h2>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增轮播图</el-button>
    </div>

    <el-card shadow="never" class="master-switch-card">
      <div class="master-switch-row">
        <div>
          <h3 class="master-switch-title">用户端轮播总开关</h3>
          <p class="master-switch-desc">
            关闭后，用户端首页将隐藏整个轮播区域（单张轮播图的显示开关不受影响）。
          </p>
        </div>
        <el-switch
          :model-value="carouselEnabled"
          :loading="settingsLoading"
          inline-prompt
          active-text="开启"
          inactive-text="关闭"
          @change="handleCarouselToggle"
        />
      </div>
    </el-card>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true">
        <el-form-item label="显示状态">
          <el-select
            v-model="filterStatus"
            placeholder="全部"
            clearable
            style="width: 120px"
            @change="loadBanners"
          >
            <el-option label="显示中" value="active" />
            <el-option label="已隐藏" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="banners" :row-class-name="rowClassName" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="图片" width="160">
          <template #default="{ row }">
            <img :src="row.imageUrl" class="thumb" alt="" />
          </template>
        </el-table-column>
        <el-table-column label="标题" min-width="180">
          <template #default="{ row }">
            <template v-if="row.title">
              <div>{{ row.title.zh }}</div>
              <div class="sub-text">{{ row.title.en }}</div>
            </template>
            <span v-else class="sub-text">—</span>
          </template>
        </el-table-column>
        <el-table-column label="跳转链接" min-width="160">
          <template #default="{ row }">
            <span class="sub-text">{{ row.linkUrl || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="显示" width="110" align="center">
          <template #default="{ row }">
            <el-switch
              :model-value="row.status === 'active'"
              :loading="statusLoadingId === row.id"
              inline-prompt
              active-text="显"
              inactive-text="隐"
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="轮播图片" required>
          <div class="image-section">
            <el-upload
              class="banner-uploader"
              :show-file-list="false"
              accept="image/jpeg,image/png,image/gif,image/webp"
              :http-request="handleImageUpload"
              :before-upload="beforeImageUpload"
              :disabled="imageUploading"
            >
              <img v-if="form.imageUrl" :src="form.imageUrl" class="banner-preview" alt="轮播图" />
              <div v-else class="upload-placeholder">
                <el-icon><Plus /></el-icon>
                <span>上传图片</span>
              </div>
            </el-upload>
            <div class="image-url-field">
              <el-input v-model="form.imageUrl" placeholder="或粘贴图片 URL" clearable />
              <el-button v-if="form.imageUrl" link type="danger" @click="form.imageUrl = ''">清除</el-button>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="中文标题">
          <el-input v-model="form.titleZh" placeholder="可选" />
        </el-form-item>
        <el-form-item label="英文标题">
          <el-input v-model="form.titleEn" placeholder="Optional" />
        </el-form-item>
        <el-form-item label="跳转链接">
          <el-input v-model="form.linkUrl" placeholder="如 / 或 https://..." clearable />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" style="width: 160px" />
        </el-form-item>
        <el-form-item label="是否显示">
          <el-switch
            v-model="formVisible"
            inline-prompt
            active-text="显示"
            inactive-text="隐藏"
          />
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

.master-switch-card {
  margin-bottom: 16px;
}

.master-switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.master-switch-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--cb-text);
}

.master-switch-desc {
  margin: 0;
  font-size: 13px;
  color: var(--cb-text-muted);
  max-width: 560px;
  line-height: 1.5;
}

:deep(.row-inactive) {
  opacity: 0.55;
}

.sub-text {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.thumb {
  width: 120px;
  height: 48px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--cb-border);
}

.image-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.banner-uploader :deep(.el-upload) {
  border: 1px dashed var(--cb-border);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}

.banner-uploader :deep(.el-upload:hover) {
  border-color: var(--cb-accent);
}

.banner-preview {
  display: block;
  width: 100%;
  max-width: 420px;
  height: 140px;
  object-fit: cover;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 420px;
  max-width: 100%;
  height: 140px;
  color: var(--cb-text-muted);
}

.image-url-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
