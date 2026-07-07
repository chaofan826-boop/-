<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import {
  batchDeleteUsers,
  getUsers,
  resetUserPassword,
  updateUserStatus,
  deleteUser,
  type AdminUser,
} from '@/api/user'
import {
  confirmBatchDelete,
  showBatchDeleteResult,
  useTableSelection,
} from '@/composables/useTableSelection'
import { hasPermission } from '@/constants/permissions'
import { formatPhoneDisplay, regionLabel } from '@/constants/regions'
import { roleLabel, roleTagType } from '@/constants/roles'
import { useUserStore } from '@/stores/user'

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/

const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const tableRef = ref<{ clearSelection: () => void }>()
const batchDeleting = ref(false)
const users = ref<AdminUser[]>([])
const detailVisible = ref(false)
const detailUser = ref<AdminUser | null>(null)
const resetLoading = ref(false)
const {
  selectedIds,
  hasSelection,
  handleSelectionChange,
  clearSelection,
} = useTableSelection<AdminUser>()

const resetForm = reactive({
  newPassword: '',
})

const query = reactive({
  keyword: '',
  onlineStatus: '' as '' | 'online' | 'offline',
  accountStatus: '' as '' | 'active' | 'frozen',
})

const displayedUsers = computed(() => {
  if (query.onlineStatus === 'online') {
    return users.value.filter((user) => user.isOnline)
  }
  if (query.onlineStatus === 'offline') {
    return users.value.filter((user) => !user.isOnline)
  }
  return users.value
})

const displayTotal = computed(() => displayedUsers.value.length)

let pollTimer: ReturnType<typeof setInterval> | null = null

function formatPresence(user: AdminUser) {
  if (user.isOnline) return '在线'
  if (!user.lastActiveAt) return '从未活跃'
  const diffMs = Date.now() - new Date(user.lastActiveAt).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return '刚刚在线'
  if (mins < 60) return `${mins} 分钟前在线`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前在线`
  const days = Math.floor(hours / 24)
  return `${days} 天前在线`
}

function presenceTagType(user: AdminUser) {
  if (user.isOnline) return 'success'
  if (!user.lastActiveAt) return 'info'
  return 'info'
}

function accountStatusLabel(status: string) {
  return status === 'frozen' ? '已冻结' : '正常'
}

function accountStatusTagType(status: string) {
  return status === 'frozen' ? 'danger' : 'success'
}

async function loadUsers() {
  loading.value = true
  try {
    const res = await getUsers({
      keyword: query.keyword.trim() || undefined,
      status: query.accountStatus || undefined,
    })
    users.value = res.list
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  loadUsers()
}

function resetFilters() {
  query.keyword = ''
  query.onlineStatus = ''
  query.accountStatus = ''
  loadUsers()
}

async function handleToggleFreeze(row: AdminUser) {
  const isFrozen = row.status === 'frozen'
  const action = isFrozen ? '解冻' : '冻结'

  try {
    await ElMessageBox.confirm(
      `确定${action}用户「${row.name}」？${isFrozen ? '' : '冻结后该用户将无法登录。'}`,
      `${action}确认`,
      { type: 'warning' },
    )
  } catch {
    return
  }

  await updateUserStatus({
    userId: row.id,
    status: isFrozen ? 'active' : 'frozen',
  })
  ElMessage.success(`已${action}用户`)
  if (detailUser.value?.id === row.id) {
    detailUser.value = { ...detailUser.value, status: isFrozen ? 'active' : 'frozen', isOnline: false }
  }
  await loadUsers()
}

async function handleDelete(row: AdminUser) {
  try {
    await ElMessageBox.confirm(
      `确定删除用户「${row.name}」？删除后该用户将从列表中移除且无法登录。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除' },
    )
  } catch {
    return
  }

  await deleteUser(row.id)
  ElMessage.success('用户已删除')
  if (detailUser.value?.id === row.id) {
    detailVisible.value = false
  }
  await loadUsers()
}

async function handleBatchDelete() {
  if (!selectedIds.value.length) return

  try {
    await confirmBatchDelete(selectedIds.value.length, '位用户')
  } catch {
    return
  }

  batchDeleting.value = true
  try {
    const result = await batchDeleteUsers(selectedIds.value)
    showBatchDeleteResult(result, '位用户')
    if (detailUser.value && selectedIds.value.includes(detailUser.value.id)) {
      detailVisible.value = false
    }
    tableRef.value?.clearSelection()
    clearSelection()
    await loadUsers()
  } finally {
    batchDeleting.value = false
  }
}

function openDetail(row: AdminUser) {
  detailUser.value = row
  resetForm.newPassword = ''
  detailVisible.value = true
}

function openChatSession(row: AdminUser) {
  if (!hasPermission(userStore.user, 'chat')) {
    ElMessage.warning('当前账号没有客服消息权限')
    return
  }
  detailVisible.value = false
  router.push({ path: '/chat', query: { customerId: String(row.id) } })
}

async function handleResetPassword() {
  if (!detailUser.value) return
  const password = resetForm.newPassword.trim()
  if (!PASSWORD_PATTERN.test(password)) {
    ElMessage.warning('新密码至少 6 位，须同时包含字母和数字')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定重置用户「${detailUser.value.name}」的密码？重置后该用户需重新登录。`,
      '重置密码确认',
      { type: 'warning' },
    )
  } catch {
    return
  }

  resetLoading.value = true
  try {
    const res = await resetUserPassword({
      userId: detailUser.value.id,
      newPassword: password,
    })
    await ElMessageBox.alert(
      `账户：${res.account || '—'}\n新密码：${res.newPassword}\n\n请妥善保存，关闭后将无法再次查看。`,
      '密码已重置',
      { confirmButtonText: '我知道了' },
    )
    resetForm.newPassword = ''
    await loadUsers()
  } finally {
    resetLoading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(loadUsers, 30_000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  await loadUsers()
  startPolling()
})

onUnmounted(stopPolling)
</script>

<template>
  <div>
    <div class="toolbar">
      <div>
        <p class="page-tag">用户管理</p>
        <h2 class="page-title">用户管理</h2>
        <p class="user-count">共 {{ displayTotal }} 位用户</p>
      </div>
      <div class="toolbar-actions">
        <el-button
          type="danger"
          plain
          :disabled="!hasSelection"
          :loading="batchDeleting"
          @click="handleBatchDelete"
        >
          批量删除{{ hasSelection ? ` (${selectedIds.length})` : '' }}
        </el-button>
        <el-button :loading="loading" @click="loadUsers">刷新</el-button>
      </div>
    </div>

    <el-card shadow="never" class="filter-card">
      <el-form :inline="true" @submit.prevent="handleSearch">
        <el-form-item label="搜索">
          <el-input
            v-model="query.keyword"
            placeholder="昵称 / 邮箱 / 手机号 / ID"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
        </el-form-item>
        <el-form-item label="账号状态">
          <el-select
            v-model="query.accountStatus"
            placeholder="全部"
            clearable
            style="width: 120px"
            @change="handleSearch"
          >
            <el-option label="正常" value="active" />
            <el-option label="已冻结" value="frozen" />
          </el-select>
        </el-form-item>
        <el-form-item label="在线状态">
          <el-select v-model="query.onlineStatus" placeholder="全部" clearable style="width: 120px">
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="displayedUsers"
        row-key="id"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="用户" min-width="160">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="36" :src="row.avatar || undefined" class="user-avatar">
                {{ row.name?.[0] || 'U' }}
              </el-avatar>
              <div>
                <strong>{{ row.name }}</strong>
                <p class="sub-text">{{ roleLabel(row.role) }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="地区" width="110">
          <template #default="{ row }">{{ regionLabel(row.region) }}</template>
        </el-table-column>
        <el-table-column label="手机号" min-width="150">
          <template #default="{ row }">{{ formatPhoneDisplay(row.region, row.phone) }}</template>
        </el-table-column>
        <el-table-column label="邮箱" min-width="160">
          <template #default="{ row }">{{ row.email || '—' }}</template>
        </el-table-column>
        <el-table-column label="密码" width="120">
          <template #default>
            <span class="pwd-mask">已加密</span>
          </template>
        </el-table-column>
        <el-table-column label="账号状态" width="100">
          <template #default="{ row }">
            <el-tag :type="accountStatusTagType(row.status)" size="small">
              {{ accountStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="在线状态" width="140">
          <template #default="{ row }">
            <el-tag :type="presenceTagType(row)" size="small">
              <span v-if="row.isOnline" class="online-dot" />
              {{ formatPresence(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="170">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
            <el-button link type="success" @click="openChatSession(row)">会话</el-button>
            <el-button
              link
              :type="row.status === 'frozen' ? 'success' : 'warning'"
              @click="handleToggleFreeze(row)"
            >
              {{ row.status === 'frozen' ? '解冻' : '冻结' }}
            </el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="detailVisible" title="用户详情" width="520px" destroy-on-close>
      <template v-if="detailUser">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="头像">
            <el-avatar :size="48" :src="detailUser.avatar || undefined">
              {{ detailUser.name?.[0] || 'U' }}
            </el-avatar>
          </el-descriptions-item>
          <el-descriptions-item label="昵称">{{ detailUser.name }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="roleTagType(detailUser.role)" size="small">
              {{ roleLabel(detailUser.role) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="地区">{{ regionLabel(detailUser.region) }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ detailUser.email || '—' }}</el-descriptions-item>
          <el-descriptions-item label="手机">{{ formatPhoneDisplay(detailUser.region, detailUser.phone) }}</el-descriptions-item>
          <el-descriptions-item label="登录账户">
            {{ detailUser.account || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="密码">
            已加密存储，无法查看原始密码
          </el-descriptions-item>
          <el-descriptions-item label="账号状态">
            <el-tag :type="accountStatusTagType(detailUser.status)" size="small">
              {{ accountStatusLabel(detailUser.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="在线状态">
            <el-tag :type="presenceTagType(detailUser)" size="small">
              {{ formatPresence(detailUser) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最后活跃">
            {{
              detailUser.lastActiveAt
                ? new Date(detailUser.lastActiveAt).toLocaleString()
                : '—'
            }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            {{ new Date(detailUser.createdAt).toLocaleString() }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="action-block">
          <el-button type="primary" plain @click="openChatSession(detailUser)">发起会话</el-button>
          <el-button
            :type="detailUser.status === 'frozen' ? 'success' : 'warning'"
            plain
            @click="handleToggleFreeze(detailUser)"
          >
            {{ detailUser.status === 'frozen' ? '解冻用户' : '冻结用户' }}
          </el-button>
          <el-button type="danger" plain @click="handleDelete(detailUser)">删除用户</el-button>
        </div>

        <div class="reset-block">
          <p class="reset-title">重置密码</p>
          <p class="reset-hint">重置后可查看一次新密码，并强制用户重新登录。密码至少 6 位，须同时包含字母和数字。</p>
          <div class="reset-row">
            <el-input
              v-model="resetForm.newPassword"
              type="password"
              show-password
              placeholder="至少 6 位，须含字母和数字"
            />
            <el-button type="primary" :loading="resetLoading" @click="handleResetPassword">
              重置
            </el-button>
          </div>
        </div>
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

.user-count {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--cb-text-muted);
}

.filter-card {
  margin-bottom: 16px;
}

.toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 20px;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark)) !important;
  color: #0a0a0c !important;
  font-weight: 700;
  flex-shrink: 0;
}

.sub-text {
  font-size: 12px;
  color: var(--cb-text-muted);
  margin: 0;
}

.pwd-mask {
  font-family: var(--cb-font-mono);
  font-size: 12px;
  color: var(--cb-text-muted);
}

.online-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  margin-right: 4px;
  box-shadow: 0 0 6px #22c55e;
}

.action-block {
  display: flex;
  gap: 10px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--cb-border);
}

.reset-block {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--cb-border);
}

.reset-title {
  margin: 0 0 6px;
  font-weight: 600;
  color: var(--cb-text);
}

.reset-hint {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--cb-text-muted);
}

.reset-row {
  display: flex;
  gap: 10px;
}

.reset-row .el-input {
  flex: 1;
}
</style>
