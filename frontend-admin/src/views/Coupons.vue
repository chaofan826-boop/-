<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { createCoupon, deleteCoupon, getCoupons, updateCoupon } from '@/api/coupon'
import { getCategories } from '@/api/category'
import { useUserStore } from '@/stores/user'
import type { Category } from '@/types/category'
import type { Coupon, CouponStatus } from '@/types/coupon'

function formatCouponAmounts(
  discountAmounts: Coupon['discountAmounts'],
  minOrderAmounts: Coupon['minOrderAmounts'],
) {
  const parts: string[] = []
  for (const currency of ['CNY', 'USD'] as const) {
    const discount = Number(discountAmounts?.[currency] ?? 0)
    if (discount <= 0) continue
    const min = Number(minOrderAmounts?.[currency] ?? 0)
    const symbol = currency === 'CNY' ? '¥' : '$'
    parts.push(`${symbol}${min} 减 ${symbol}${discount}`)
  }
  return parts.length ? parts.join(' / ') : '-'
}

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const coupons = ref<Coupon[]>([])
const categories = ref<Category[]>([])
const dialogVisible = ref(false)
const dialogTitle = ref('新增优惠券')
const editingId = ref<number | null>(null)
const submitLoading = ref(false)
const statusLoadingId = ref<number | null>(null)
const filterStatus = ref<CouponStatus | ''>('')

const form = reactive({
  titleZh: '',
  titleEn: '',
  discountCny: null as number | null,
  discountUsd: null as number | null,
  minCny: 0,
  minUsd: 0,
  categoryIds: [] as number[],
  totalQuantity: null as number | null,
  perUserLimit: 1,
  claimRange: [] as string[],
  validityDays: 7,
  status: 'active' as CouponStatus,
  sortOrder: 0,
})

const formEnabled = computed({
  get: () => form.status === 'active',
  set: (enabled: boolean) => {
    form.status = enabled ? 'active' : 'inactive'
  },
})

const categoryMap = computed(() => new Map(categories.value.map((item) => [item.id, item.name.zh])))

function resetForm() {
  editingId.value = null
  Object.assign(form, {
    titleZh: '',
    titleEn: '',
    discountCny: null,
    discountUsd: null,
    minCny: 0,
    minUsd: 0,
    categoryIds: [],
    totalQuantity: null,
    perUserLimit: 1,
    claimRange: [],
    validityDays: 7,
    status: 'active' as CouponStatus,
    sortOrder: 0,
  })
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function categoryLabel(ids: number[] | null) {
  if (!ids?.length) return '全部分类'
  return ids.map((id) => categoryMap.value.get(id) || `#${id}`).join('、')
}

async function loadData() {
  loading.value = true
  try {
    const [couponList, categoryList] = await Promise.all([
      getCoupons({ status: filterStatus.value || undefined }),
      getCategories({ status: 'active' }),
    ])
    coupons.value = couponList
    categories.value = categoryList
  } finally {
    loading.value = false
  }
}

function openCreate() {
  resetForm()
  dialogTitle.value = '新增优惠券'
  dialogVisible.value = true
}

function openEdit(row: Coupon) {
  editingId.value = row.id
  dialogTitle.value = '编辑优惠券'
  Object.assign(form, {
    titleZh: row.title.zh,
    titleEn: row.title.en,
    discountCny: row.discountAmounts?.CNY ?? null,
    discountUsd: row.discountAmounts?.USD ?? null,
    minCny: row.minOrderAmounts?.CNY ?? 0,
    minUsd: row.minOrderAmounts?.USD ?? 0,
    categoryIds: row.categoryIds ? [...row.categoryIds] : [],
    totalQuantity: row.totalQuantity,
    perUserLimit: row.perUserLimit,
    claimRange: [row.claimStartAt, row.claimEndAt],
    validityDays: row.validityDays,
    status: row.status,
    sortOrder: row.sortOrder,
  })
  dialogVisible.value = true
}

function buildPayload() {
  if (!form.claimRange?.length || form.claimRange.length !== 2) {
    throw new Error('请选择领取时间范围')
  }
  return {
    title: { zh: form.titleZh, en: form.titleEn },
    discountAmounts: {
      ...(form.discountCny != null && form.discountCny > 0 ? { CNY: form.discountCny } : {}),
      ...(form.discountUsd != null && form.discountUsd > 0 ? { USD: form.discountUsd } : {}),
    },
    minOrderAmounts: {
      ...(form.discountCny != null && form.discountCny > 0 ? { CNY: form.minCny } : {}),
      ...(form.discountUsd != null && form.discountUsd > 0 ? { USD: form.minUsd } : {}),
    },
    categoryIds: form.categoryIds.length ? form.categoryIds : undefined,
    totalQuantity: form.totalQuantity,
    perUserLimit: form.perUserLimit,
    claimStartAt: form.claimRange[0],
    claimEndAt: form.claimRange[1],
    validityDays: form.validityDays,
    status: form.status,
    sortOrder: form.sortOrder,
  }
}

async function handleSubmit() {
  if (!userStore.token) {
    ElMessage.warning('登录已过期，请重新登录')
    router.push('/login')
    return
  }
  if (!form.titleZh || !form.titleEn) {
    ElMessage.warning('请填写优惠券名称')
    return
  }
  if ((form.discountCny ?? 0) <= 0 && (form.discountUsd ?? 0) <= 0) {
    ElMessage.warning('请至少填写一种币种的优惠金额')
    return
  }

  submitLoading.value = true
  try {
    const payload = buildPayload()
    if (editingId.value) {
      await updateCoupon({ id: editingId.value, ...payload })
      ElMessage.success('更新成功')
    } else {
      await createCoupon(payload as Omit<Coupon, 'id' | 'claimedCount' | 'createdAt'>)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await loadData()
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败')
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row: Coupon) {
  try {
    await ElMessageBox.confirm(`确定删除优惠券「${row.title.zh}」？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  await deleteCoupon(row.id)
  ElMessage.success('已删除')
  await loadData()
}

function buildStatusPayload(row: Coupon, status: CouponStatus) {
  return {
    id: row.id,
    title: row.title,
    discountAmounts: row.discountAmounts,
    minOrderAmounts: row.minOrderAmounts ?? undefined,
    categoryIds: row.categoryIds ?? undefined,
    totalQuantity: row.totalQuantity,
    perUserLimit: row.perUserLimit,
    claimStartAt: row.claimStartAt,
    claimEndAt: row.claimEndAt,
    validityDays: row.validityDays,
    status,
    sortOrder: row.sortOrder,
  }
}

async function handleStatusToggle(row: Coupon, enabled: boolean) {
  const nextStatus: CouponStatus = enabled ? 'active' : 'inactive'
  if (row.status === nextStatus) return

  statusLoadingId.value = row.id
  try {
    await updateCoupon(buildStatusPayload(row, nextStatus))
    row.status = nextStatus
    row.showOnHome = enabled
    ElMessage.success(enabled ? '已启用，首页可领取' : '已停用')
  } finally {
    statusLoadingId.value = null
  }
}

onMounted(loadData)
</script>

<template>
  <div class="coupons-page">
    <div class="page-header">
      <div>
        <p class="page-tag">MARKETING</p>
        <h2 class="page-title">优惠券管理</h2>
      </div>
      <el-button type="primary" @click="openCreate">
        <el-icon><Plus /></el-icon>
        新增优惠券
      </el-button>
    </div>

    <div class="filter-bar">
      <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 160px" @change="loadData">
        <el-option label="启用" value="active" />
        <el-option label="停用" value="inactive" />
      </el-select>
    </div>

    <el-table v-loading="loading" :data="coupons" border stripe>
      <el-table-column prop="title.zh" label="名称" min-width="140" />
      <el-table-column label="优惠" min-width="180">
        <template #default="{ row }">
          {{ formatCouponAmounts(row.discountAmounts, row.minOrderAmounts) }}
        </template>
      </el-table-column>
      <el-table-column label="适用分类" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ categoryLabel(row.categoryIds) }}</template>
      </el-table-column>
      <el-table-column label="领取量" width="110">
        <template #default="{ row }">
          {{ row.claimedCount }}{{ row.totalQuantity != null ? ` / ${row.totalQuantity}` : '' }}
        </template>
      </el-table-column>
      <el-table-column label="领取时间" min-width="220">
        <template #default="{ row }">
          {{ formatDateTime(row.claimStartAt) }} ~ {{ formatDateTime(row.claimEndAt) }}
        </template>
      </el-table-column>
      <el-table-column prop="validityDays" label="有效天数" width="90" />
      <el-table-column label="启用" width="110" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.status === 'active'"
            :loading="statusLoadingId === row.id"
            inline-prompt
            active-text="启"
            inactive-text="停"
            @change="(val: boolean) => handleStatusToggle(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="640px" destroy-on-close>
      <el-form label-width="110px">
        <el-form-item label="中文名称" required>
          <el-input v-model="form.titleZh" placeholder="如：新人满100减20" />
        </el-form-item>
        <el-form-item label="英文名称" required>
          <el-input v-model="form.titleEn" placeholder="New user $20 off" />
        </el-form-item>
        <el-form-item label="人民币优惠" required>
          <div class="amount-row">
            <span>满</span>
            <el-input-number v-model="form.minCny" :min="0" :precision="2" />
            <span>减</span>
            <el-input-number v-model="form.discountCny" :min="0.01" :precision="2" />
          </div>
        </el-form-item>
        <el-form-item label="美元优惠">
          <div class="amount-row">
            <span>满</span>
            <el-input-number v-model="form.minUsd" :min="0" :precision="2" />
            <span>减</span>
            <el-input-number v-model="form.discountUsd" :min="0.01" :precision="2" />
          </div>
          <span class="field-tip">至少填写人民币或美元其中一种</span>
        </el-form-item>
        <el-form-item label="适用分类">
          <el-select v-model="form.categoryIds" multiple clearable placeholder="不选则全部分类可用" style="width: 100%">
            <el-option v-for="item in categories" :key="item.id" :label="item.name.zh" :value="item.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="发放总量">
          <el-input-number v-model="form.totalQuantity" :min="1" />
          <span class="field-tip">留空表示不限量</span>
        </el-form-item>
        <el-form-item label="每人限领">
          <el-input-number v-model="form.perUserLimit" :min="1" />
        </el-form-item>
        <el-form-item label="领取时间" required>
          <el-date-picker
            v-model="form.claimRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            value-format="YYYY-MM-DDTHH:mm:ss.SSS[Z]"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="有效天数">
          <el-input-number v-model="form.validityDays" :min="1" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" />
        </el-form-item>
        <el-form-item label="启用">
          <el-switch
            v-model="formEnabled"
            inline-prompt
            active-text="启用"
            inactive-text="停用"
          />
          <span class="field-tip">启用后可在首页悬浮展示并允许领取</span>
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
.coupons-page {
  padding: 4px 0;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-tag {
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--el-color-primary);
  margin: 0 0 6px;
}

.page-title {
  margin: 0;
  font-size: 24px;
}

.filter-bar {
  margin-bottom: 16px;
}

.field-tip {
  margin-left: 10px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.amount-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
