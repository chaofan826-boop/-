<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from '@/api/category'
import { useUserStore } from '@/stores/user'
import type { Category, CategoryStatus } from '@/types/category'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const categories = ref<Category[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增分类')
const editingId = ref<number | null>(null)
const submitLoading = ref(false)

const filterStatus = ref<CategoryStatus | ''>('')

const form = reactive({
  code: '',
  nameZh: '',
  nameEn: '',
  sortOrder: 0,
  status: 'active' as CategoryStatus,
})

function resetForm() {
  editingId.value = null
  Object.assign(form, {
    code: '',
    nameZh: '',
    nameEn: '',
    sortOrder: 0,
    status: 'active' as CategoryStatus,
  })
}

async function loadCategories() {
  loading.value = true
  try {
    categories.value = await getCategories({
      status: filterStatus.value || undefined,
    })
  } finally {
    loading.value = false
  }
}

function openCreate() {
  resetForm()
  dialogTitle.value = '新增分类'
  dialogVisible.value = true
}

function openEdit(row: Category) {
  editingId.value = row.id
  dialogTitle.value = '编辑分类'
  Object.assign(form, {
    code: row.code,
    nameZh: row.name.zh,
    nameEn: row.name.en,
    sortOrder: row.sortOrder,
    status: row.status,
  })
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!userStore.token) {
    ElMessage.warning('登录已过期，请重新登录')
    router.push('/login')
    return
  }

  if (!form.code || !form.nameZh || !form.nameEn) {
    ElMessage.warning('请填写分类编码和中英文名称')
    return
  }

  submitLoading.value = true
  try {
    const payload = {
      code: form.code,
      name: { zh: form.nameZh, en: form.nameEn },
      sortOrder: form.sortOrder,
      status: form.status,
    }
    if (editingId.value) {
      await updateCategory({ id: editingId.value, ...payload })
      ElMessage.success('更新成功')
    } else {
      await createCategory(payload)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadCategories()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: Category) {
  await ElMessageBox.confirm(`确定删除分类「${row.name.zh}」？`, '删除确认', { type: 'warning' })
  await deleteCategory(row.id)
  ElMessage.success('删除成功')
  await loadCategories()
}

function statusTagType(status: CategoryStatus) {
  return status === 'active' ? 'success' : 'info'
}

function statusLabel(status: CategoryStatus) {
  return status === 'active' ? '启用' : '停用'
}

onMounted(loadCategories)
</script>

<template>
  <div>
    <div class="toolbar">
      <div>
        <p class="page-tag">商品分类</p>
        <h2 class="page-title">商品分类</h2>
      </div>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增分类</el-button>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true">
        <el-form-item label="状态">
          <el-select
            v-model="filterStatus"
            placeholder="全部"
            clearable
            style="width: 120px"
            @change="loadCategories"
          >
            <el-option label="启用" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table v-loading="loading" :data="categories" stripe>
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column prop="code" label="编码" width="140" />
        <el-table-column label="名称" min-width="180">
          <template #default="{ row }">
            <div>{{ row.name.zh }}</div>
            <div class="sub-text">{{ row.name.en }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" label="排序" width="80" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusTagType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" destroy-on-close>
      <el-form label-width="100px">
        <el-form-item label="编码" required>
          <el-input v-model="form.code" placeholder="如 electronics" :disabled="!!editingId" />
        </el-form-item>
        <el-form-item label="中文名称" required>
          <el-input v-model="form.nameZh" />
        </el-form-item>
        <el-form-item label="英文名称" required>
          <el-input v-model="form.nameEn" />
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

.sub-text {
  font-size: 12px;
  color: var(--cb-text-muted);
}
</style>
