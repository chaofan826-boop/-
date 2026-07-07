<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import {
  batchDeleteUsers,
  createSubAdmin,
  deleteUser,
  getSubAdmins,
  resetUserPassword,
  updateSubAdminPermissions,
  updateUserStatus,
  type AdminUser,
} from '@/api/user'
import {
  confirmBatchDelete,
  showBatchDeleteResult,
  useTableSelection,
} from '@/composables/useTableSelection'
import {
  ADMIN_PERMISSIONS,
  ADMIN_PERMISSION_LABELS,
  getEffectivePermissions,
  permissionLabels,
  type AdminPermission,
} from '@/constants/permissions'
import { roleLabel, roleTagType } from '@/constants/roles'

const loading = ref(false)
const tableRef = ref<{ clearSelection: () => void }>()
const batchDeleting = ref(false)
const createLoading = ref(false)
const resetLoading = ref(false)
const permissionLoading = ref(false)
const subAdmins = ref<AdminUser[]>([])
const createVisible = ref(false)
const detailVisible = ref(false)
const detailUser = ref<AdminUser | null>(null)
const {
  selectedIds,
  hasSelection,
  handleSelectionChange,
  clearSelection,
} = useTableSelection<AdminUser>()

const permissionOptions = ADMIN_PERMISSIONS.map((value) => ({
  value,
  label: ADMIN_PERMISSION_LABELS[value],
}))

const createForm = reactive({
  account: '',
  name: '',
  password: '',
  permissions: [] as AdminPermission[],
})

const editPermissions = ref<AdminPermission[]>([])

const resetForm = reactive({
  newPassword: '',
})

const displayTotal = computed(() => subAdmins.value.length)

let pollTimer: ReturnType<typeof setInterval> | null = null

function accountStatusLabel(status: string) {
  return status === 'frozen' ? '已冻结' : '正常'
}

function accountStatusTagType(status: string) {
  return status === 'frozen' ? 'danger' : 'success'
}

function formatPresence(user: AdminUser) {
  if (user.isOnline) return '在线'
  if (!user.lastActiveAt) return '从未活跃'
  return new Date(user.lastActiveAt).toLocaleString()
}

function presenceTagType(user: AdminUser) {
  return user.isOnline ? 'success' : 'info'
}

function openCreateDialog() {
  createForm.account = ''
  createForm.name = ''
  createForm.password = ''
  createForm.permissions = ['orders']
  createVisible.value = true
}

function openDetail(row: AdminUser) {
  detailUser.value = row
  resetForm.newPassword = ''
  editPermissions.value = [...getEffectivePermissions(row)]
  detailVisible.value = true
}

async function loadSubAdmins() {
  loading.value = true
  try {
    const res = await getSubAdmins()
    subAdmins.value = res.list
  } finally {
    loading.value = false
  }
}

async function handleCreate() {
  const account = createForm.account.trim()
  const name = createForm.name.trim()
  const password = createForm.password.trim()

  if (!account || !name || password.length < 6) {
    ElMessage.warning('请填写完整信息，密码至少 6 位')
    return
  }
  if (!createForm.permissions.length) {
    ElMessage.warning('请至少分配一个权限')
    return
  }

  createLoading.value = true
  try {
    await createSubAdmin({
      account,
      name,
      password,
      permissions: [...createForm.permissions],
    })
    ElMessage.success('子管理员创建成功')
    createVisible.value = false
    await loadSubAdmins()
  } finally {
    createLoading.value = false
  }
}

async function handleToggleFreeze(row: AdminUser) {
  const isFrozen = row.status === 'frozen'
  const action = isFrozen ? '解冻' : '冻结'

  try {
    await ElMessageBox.confirm(
      `确定${action}子管理员「${row.name}」？${isFrozen ? '' : '冻结后该账号将无法登录后台。'}`,
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
  ElMessage.success(`已${action}子管理员`)
  if (detailUser.value?.id === row.id) {
    detailUser.value = { ...detailUser.value, status: isFrozen ? 'active' : 'frozen', isOnline: false }
  }
  await loadSubAdmins()
}

async function handleDelete(row: AdminUser) {
  try {
    await ElMessageBox.confirm(
      `确定删除子管理员「${row.name}」？删除后该账号将无法登录后台。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除' },
    )
  } catch {
    return
  }

  await deleteUser(row.id)
  ElMessage.success('子管理员已删除')
  if (detailUser.value?.id === row.id) {
    detailVisible.value = false
  }
  await loadSubAdmins()
}

async function handleBatchDelete() {
  if (!selectedIds.value.length) return

  try {
    await confirmBatchDelete(selectedIds.value.length, '位子管理员')
  } catch {
    return
  }

  batchDeleting.value = true
  try {
    const result = await batchDeleteUsers(selectedIds.value)
    showBatchDeleteResult(result, '位子管理员')
    if (detailUser.value && selectedIds.value.includes(detailUser.value.id)) {
      detailVisible.value = false
    }
    tableRef.value?.clearSelection()
    clearSelection()
    await loadSubAdmins()
  } finally {
    batchDeleting.value = false
  }
}

async function handleResetPassword() {
  if (!detailUser.value) return
  const password = resetForm.newPassword.trim()
  if (password.length < 6) {
    ElMessage.warning('新密码至少 6 位')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定重置子管理员「${detailUser.value.name}」的密码？`,
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
    await loadSubAdmins()
  } finally {
    resetLoading.value = false
  }
}

async function handleSavePermissions() {
  if (!detailUser.value) return
  if (!editPermissions.value.length) {
    ElMessage.warning('请至少保留一个权限')
    return
  }

  permissionLoading.value = true
  try {
    const updated = await updateSubAdminPermissions({
      userId: detailUser.value.id,
      permissions: [...editPermissions.value],
    })
    detailUser.value = { ...detailUser.value, permissions: updated.permissions }
    ElMessage.success('权限已更新，该子管理员需重新登录')
    await loadSubAdmins()
  } finally {
    permissionLoading.value = false
  }
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(loadSubAdmins, 30_000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  await loadSubAdmins()
  startPolling()
})

onUnmounted(stopPolling)
</script>

<template>
  <div>
    <div class="toolbar">
      <div>
        <p class="page-tag">SUB ADMINS</p>
        <h2 class="page-title">子管理员</h2>
        <p class="page-desc">共 {{ displayTotal }} 位子管理员，可分配后台管理权限，但不能创建同级管理员。</p>
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
        <el-button :loading="loading" @click="loadSubAdmins">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreateDialog">创建子管理员</el-button>
      </div>
    </div>

    <el-card shadow="never">
      <el-table
        ref="tableRef"
        v-loading="loading"
        :data="subAdmins"
        row-key="id"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column prop="id" label="ID" width="70" />
        <el-table-column label="管理员" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="36" :src="row.avatar || undefined" class="user-avatar">
                {{ row.name?.[0] || 'A' }}
              </el-avatar>
              <div>
                <strong>{{ row.name }}</strong>
                <p class="sub-text">{{ roleLabel(row.role) }}</p>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="权限范围" min-width="260">
          <template #default="{ row }">
            <span class="permission-text">{{ permissionLabels(row.permissions) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="登录账号" min-width="180">
          <template #default="{ row }">{{ row.account || row.phone || '—' }}</template>
        </el-table-column>
        <el-table-column label="账号状态" width="100">
          <template #default="{ row }">
            <el-tag :type="accountStatusTagType(row.status)" size="small">
              {{ accountStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="在线状态" width="170">
          <template #default="{ row }">
            <el-tag :type="presenceTagType(row)" size="small">
              <span v-if="row.isOnline" class="online-dot" />
              {{ formatPresence(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="170">
          <template #default="{ row }">
            {{ new Date(row.createdAt).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openDetail(row)">详情</el-button>
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

    <el-dialog v-model="createVisible" title="创建子管理员" width="560px" destroy-on-close>
      <el-form label-width="88px">
        <el-form-item label="姓名" required>
          <el-input v-model="createForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="登录账号" required>
          <el-input v-model="createForm.account" placeholder="用于登录后台，如手机号或工号" />
        </el-form-item>
        <el-form-item label="密码" required>
          <el-input
            v-model="createForm.password"
            type="password"
            show-password
            placeholder="至少 6 位"
          />
        </el-form-item>
        <el-form-item label="权限" required>
          <el-checkbox-group v-model="createForm.permissions" class="permission-group">
            <el-checkbox v-for="item in permissionOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreate">创建</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="子管理员详情" width="560px" destroy-on-close>
      <template v-if="detailUser">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="昵称">{{ detailUser.name }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="roleTagType(detailUser.role)" size="small">
              {{ roleLabel(detailUser.role) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="登录账号">
            {{ detailUser.account || detailUser.phone || '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="当前权限">
            {{ permissionLabels(detailUser.permissions) }}
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
          <el-descriptions-item label="创建时间">
            {{ new Date(detailUser.createdAt).toLocaleString() }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="permission-block">
          <p class="reset-title">调整权限</p>
          <p class="reset-hint">保存后该子管理员会被强制重新登录，并按新权限访问后台模块。</p>
          <el-checkbox-group v-model="editPermissions" class="permission-group">
            <el-checkbox v-for="item in permissionOptions" :key="item.value" :value="item.value">
              {{ item.label }}
            </el-checkbox>
          </el-checkbox-group>
          <el-button type="primary" :loading="permissionLoading" @click="handleSavePermissions">
            保存权限
          </el-button>
        </div>

        <div class="action-block">
          <el-button
            :type="detailUser.status === 'frozen' ? 'success' : 'warning'"
            plain
            @click="handleToggleFreeze(detailUser)"
          >
            {{ detailUser.status === 'frozen' ? '解冻账号' : '冻结账号' }}
          </el-button>
          <el-button type="danger" plain @click="handleDelete(detailUser)">删除账号</el-button>
        </div>

        <div class="reset-block">
          <p class="reset-title">重置密码</p>
          <p class="reset-hint">重置后可查看一次新密码，并强制该管理员重新登录。</p>
          <div class="reset-row">
            <el-input
              v-model="resetForm.newPassword"
              type="password"
              show-password
              placeholder="输入新密码（至少 6 位）"
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

.page-desc {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--cb-text-muted);
}

.toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.toolbar-actions {
  display: flex;
  gap: 10px;
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

.online-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  margin-right: 4px;
  box-shadow: 0 0 6px #22c55e;
}

.permission-text {
  font-size: 13px;
  color: var(--cb-text-dim);
  line-height: 1.5;
}

.permission-group {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 16px;
}

.permission-block {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--cb-border);
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
