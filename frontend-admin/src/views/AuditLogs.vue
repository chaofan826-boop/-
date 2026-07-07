<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { batchDeleteLoginLogs, batchDeleteOperationLogs, getLoginLogs, getOperationLogs } from '@/api/audit'
import {
  confirmBatchDelete,
  showBatchDeleteResult,
  useTableSelection,
} from '@/composables/useTableSelection'
import { roleLabel, roleTagType } from '@/constants/roles'
import type { AdminLoginLog, AdminLoginLogAction, AdminOperationLog } from '@/types/audit'

const activeTab = ref<'login' | 'operation'>('login')

const loginLoading = ref(false)
const operationLoading = ref(false)
const loginBatchDeleting = ref(false)
const operationBatchDeleting = ref(false)
const loginTableRef = ref<{ clearSelection: () => void }>()
const operationTableRef = ref<{ clearSelection: () => void }>()
const loginLogs = ref<AdminLoginLog[]>([])
const operationLogs = ref<AdminOperationLog[]>([])
const {
  selectedIds: selectedLoginIds,
  hasSelection: hasLoginSelection,
  handleSelectionChange: handleLoginSelectionChange,
  clearSelection: clearLoginSelection,
} = useTableSelection<AdminLoginLog>()
const {
  selectedIds: selectedOperationIds,
  hasSelection: hasOperationSelection,
  handleSelectionChange: handleOperationSelectionChange,
  clearSelection: clearOperationSelection,
} = useTableSelection<AdminOperationLog>()

const loginPagination = reactive({ page: 1, pageSize: 10, total: 0 })
const operationPagination = reactive({ page: 1, pageSize: 10, total: 0 })

const loginFilters = reactive({
  keyword: '',
  action: '' as AdminLoginLogAction | '',
})

const operationFilters = reactive({
  keyword: '',
  module: '',
  action: '',
})

const loginActionOptions = [
  { value: 'login_success', label: '登录成功' },
  { value: 'login_failure', label: '登录失败' },
  { value: 'logout', label: '退出登录' },
]

const moduleOptions = [
  { value: 'auth', label: '认证' },
  { value: 'sub_admin', label: '子管理员' },
  { value: 'users', label: '用户管理' },
  { value: 'products', label: '商品管理' },
  { value: 'categories', label: '商品分类' },
  { value: 'banners', label: '轮播图' },
  { value: 'promotions', label: '首页营销' },
  { value: 'orders', label: '订单管理' },
  { value: 'chat', label: '客服消息' },
  { value: 'upload', label: '文件上传' },
]

function loginActionLabel(action: AdminLoginLogAction) {
  return loginActionOptions.find((item) => item.value === action)?.label || action
}

function loginActionTagType(action: AdminLoginLogAction) {
  if (action === 'login_success') return 'success'
  if (action === 'login_failure') return 'danger'
  return 'info'
}

function moduleLabel(module: string) {
  return moduleOptions.find((item) => item.value === module)?.label || module
}

function formatTime(value: string) {
  return new Date(value).toLocaleString()
}

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata || !Object.keys(metadata).length) return '—'
  return JSON.stringify(metadata, null, 2)
}

async function loadLoginLogs() {
  loginLoading.value = true
  try {
    const res = await getLoginLogs({
      page: loginPagination.page,
      pageSize: loginPagination.pageSize,
      keyword: loginFilters.keyword.trim() || undefined,
      action: loginFilters.action || undefined,
    })
    loginLogs.value = res.list
    loginPagination.total = res.total
  } finally {
    loginLoading.value = false
  }
}

async function loadOperationLogs() {
  operationLoading.value = true
  try {
    const res = await getOperationLogs({
      page: operationPagination.page,
      pageSize: operationPagination.pageSize,
      keyword: operationFilters.keyword.trim() || undefined,
      module: operationFilters.module || undefined,
      action: operationFilters.action.trim() || undefined,
    })
    operationLogs.value = res.list
    operationPagination.total = res.total
  } finally {
    operationLoading.value = false
  }
}

function searchLoginLogs() {
  loginPagination.page = 1
  loadLoginLogs()
}

function searchOperationLogs() {
  operationPagination.page = 1
  loadOperationLogs()
}

function resetLoginFilters() {
  loginFilters.keyword = ''
  loginFilters.action = ''
  searchLoginLogs()
}

function resetOperationFilters() {
  operationFilters.keyword = ''
  operationFilters.module = ''
  operationFilters.action = ''
  searchOperationLogs()
}

async function handleBatchDeleteLoginLogs() {
  if (!selectedLoginIds.value.length) return

  try {
    await confirmBatchDelete(selectedLoginIds.value.length, '条登录日志')
  } catch {
    return
  }

  loginBatchDeleting.value = true
  try {
    const result = await batchDeleteLoginLogs(selectedLoginIds.value)
    showBatchDeleteResult(result, '条登录日志')
    loginTableRef.value?.clearSelection()
    clearLoginSelection()
    await loadLoginLogs()
  } finally {
    loginBatchDeleting.value = false
  }
}

async function handleBatchDeleteOperationLogs() {
  if (!selectedOperationIds.value.length) return

  try {
    await confirmBatchDelete(selectedOperationIds.value.length, '条操作日志')
  } catch {
    return
  }

  operationBatchDeleting.value = true
  try {
    const result = await batchDeleteOperationLogs(selectedOperationIds.value)
    showBatchDeleteResult(result, '条操作日志')
    operationTableRef.value?.clearSelection()
    clearOperationSelection()
    await loadOperationLogs()
  } finally {
    operationBatchDeleting.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'login' && !loginLogs.value.length) {
    loadLoginLogs()
  }
  if (tab === 'operation' && !operationLogs.value.length) {
    loadOperationLogs()
  }
})

onMounted(() => {
  loadLoginLogs()
})
</script>

<template>
  <div class="page">
    <div class="page-header">
      <div>
        <h1 class="page-title">审计日志</h1>
        <p class="page-desc">查看超级管理员与子管理员的登录记录及后台操作记录</p>
      </div>
    </div>

    <el-card class="panel" shadow="never">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="登录日志" name="login">
          <div class="filters">
            <el-input
              v-model="loginFilters.keyword"
              placeholder="搜索账号、姓名或用户 ID"
              clearable
              class="filter-input"
              @keyup.enter="searchLoginLogs"
            />
            <el-select v-model="loginFilters.action" placeholder="操作类型" clearable class="filter-select">
              <el-option
                v-for="item in loginActionOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-button type="primary" @click="searchLoginLogs">查询</el-button>
            <el-button @click="resetLoginFilters">重置</el-button>
            <el-button
              type="danger"
              plain
              :disabled="!hasLoginSelection"
              :loading="loginBatchDeleting"
              @click="handleBatchDeleteLoginLogs"
            >
              批量删除{{ hasLoginSelection ? ` (${selectedLoginIds.length})` : '' }}
            </el-button>
          </div>

          <el-table
            ref="loginTableRef"
            v-loading="loginLoading"
            :data="loginLogs"
            row-key="id"
            stripe
            class="log-table"
            @selection-change="handleLoginSelectionChange"
          >
            <el-table-column type="selection" width="48" />
            <el-table-column prop="createdAt" label="时间" min-width="170">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column prop="account" label="账号" min-width="160" />
            <el-table-column prop="userName" label="姓名" min-width="120">
              <template #default="{ row }">{{ row.userName || '—' }}</template>
            </el-table-column>
            <el-table-column prop="role" label="角色" min-width="110">
              <template #default="{ row }">
                <el-tag v-if="row.role" :type="roleTagType(row.role)" size="small">
                  {{ roleLabel(row.role) }}
                </el-tag>
                <span v-else>—</span>
              </template>
            </el-table-column>
            <el-table-column prop="action" label="操作" min-width="110">
              <template #default="{ row }">
                <el-tag :type="loginActionTagType(row.action)" size="small">
                  {{ loginActionLabel(row.action) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="failureReason" label="失败原因" min-width="140">
              <template #default="{ row }">{{ row.failureReason || '—' }}</template>
            </el-table-column>
            <el-table-column prop="ipAddress" label="IP" min-width="130">
              <template #default="{ row }">{{ row.ipAddress || '—' }}</template>
            </el-table-column>
            <el-table-column prop="userAgent" label="设备信息" min-width="220" show-overflow-tooltip>
              <template #default="{ row }">{{ row.userAgent || '—' }}</template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="loginPagination.page"
              v-model:page-size="loginPagination.pageSize"
              :total="loginPagination.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @current-change="loadLoginLogs"
              @size-change="searchLoginLogs"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="操作日志" name="operation">
          <div class="filters">
            <el-input
              v-model="operationFilters.keyword"
              placeholder="搜索操作人、摘要、路径或 ID"
              clearable
              class="filter-input"
              @keyup.enter="searchOperationLogs"
            />
            <el-select v-model="operationFilters.module" placeholder="模块" clearable class="filter-select">
              <el-option
                v-for="item in moduleOptions"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
            <el-input
              v-model="operationFilters.action"
              placeholder="操作标识"
              clearable
              class="filter-select"
              @keyup.enter="searchOperationLogs"
            />
            <el-button type="primary" @click="searchOperationLogs">查询</el-button>
            <el-button @click="resetOperationFilters">重置</el-button>
            <el-button
              type="danger"
              plain
              :disabled="!hasOperationSelection"
              :loading="operationBatchDeleting"
              @click="handleBatchDeleteOperationLogs"
            >
              批量删除{{ hasOperationSelection ? ` (${selectedOperationIds.length})` : '' }}
            </el-button>
          </div>

          <el-table
            ref="operationTableRef"
            v-loading="operationLoading"
            :data="operationLogs"
            row-key="id"
            stripe
            class="log-table"
            @selection-change="handleOperationSelectionChange"
          >
            <el-table-column type="selection" width="48" />
            <el-table-column prop="createdAt" label="时间" min-width="170">
              <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
            </el-table-column>
            <el-table-column prop="actorName" label="操作人" min-width="120" />
            <el-table-column prop="actorRole" label="角色" min-width="110">
              <template #default="{ row }">
                <el-tag :type="roleTagType(row.actorRole)" size="small">
                  {{ roleLabel(row.actorRole) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="module" label="模块" min-width="110">
              <template #default="{ row }">{{ moduleLabel(row.module) }}</template>
            </el-table-column>
            <el-table-column prop="summary" label="操作摘要" min-width="220" show-overflow-tooltip />
            <el-table-column prop="method" label="方法" width="90" />
            <el-table-column prop="path" label="路径" min-width="180" show-overflow-tooltip />
            <el-table-column prop="ipAddress" label="IP" min-width="130">
              <template #default="{ row }">{{ row.ipAddress || '—' }}</template>
            </el-table-column>
            <el-table-column label="详情" width="90" fixed="right">
              <template #default="{ row }">
                <el-popover v-if="row.metadata" placement="left" :width="360" trigger="click">
                  <template #reference>
                    <el-button link type="primary">查看</el-button>
                  </template>
                  <pre class="metadata">{{ formatMetadata(row.metadata) }}</pre>
                </el-popover>
                <span v-else>—</span>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="operationPagination.page"
              v-model:page-size="operationPagination.pageSize"
              :total="operationPagination.total"
              :page-sizes="[10, 20, 50]"
              layout="total, sizes, prev, pager, next"
              @current-change="loadOperationLogs"
              @size-change="searchOperationLogs"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: var(--cb-text);
}

.page-desc {
  margin: 8px 0 0;
  color: var(--cb-text-muted);
  font-size: 14px;
}

.panel {
  border: 1px solid var(--cb-border);
  background: rgba(6, 11, 24, 0.72);
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 16px;
}

.filter-input {
  width: 280px;
}

.filter-select {
  width: 160px;
}

.log-table {
  width: 100%;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.metadata {
  margin: 0;
  max-height: 320px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 12px;
  line-height: 1.5;
  color: var(--cb-text);
}
</style>
