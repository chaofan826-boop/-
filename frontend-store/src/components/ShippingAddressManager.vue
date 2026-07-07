<script setup lang="ts">
import { nextTick, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close, EditPen, Location, Plus } from '@element-plus/icons-vue'
import {
  createShippingAddress,
  deleteShippingAddress,
  getShippingAddresses,
  setDefaultShippingAddress,
  updateShippingAddress,
  type ShippingAddress,
} from '@/api/address'
import { useUserStore } from '@/stores/user'
import { addressSummary } from '@/utils/shipping-address'

const LABEL_PRESETS = ['家', '公司', '学校'] as const

const userStore = useUserStore()
const loading = ref(false)
const submitLoading = ref(false)
const addresses = ref<ShippingAddress[]>([])
const formVisible = ref(false)
const formPanelRef = ref<HTMLElement | null>(null)
const editingId = ref<number | null>(null)
const customLabel = ref(false)

const form = reactive({
  receiverName: '',
  receiverPhone: '',
  detailAddress: '',
  label: '',
  isDefault: false,
})

function resetForm() {
  editingId.value = null
  customLabel.value = false
  Object.assign(form, {
    receiverName: '',
    receiverPhone: '',
    detailAddress: '',
    label: '',
    isDefault: false,
  })
}

function prefillFromProfile() {
  if (form.receiverName || form.receiverPhone) return
  form.receiverName = userStore.user?.name?.trim() || ''
  form.receiverPhone = userStore.user?.phone?.trim() || ''
}

function syncLabelPresetState() {
  customLabel.value = !!form.label && !LABEL_PRESETS.includes(form.label as (typeof LABEL_PRESETS)[number])
}

function selectLabelPreset(label: (typeof LABEL_PRESETS)[number]) {
  form.label = form.label === label ? '' : label
  customLabel.value = false
}

function enableCustomLabel() {
  customLabel.value = true
  if (LABEL_PRESETS.includes(form.label as (typeof LABEL_PRESETS)[number])) {
    form.label = ''
  }
}

async function scrollToForm() {
  await nextTick()
  formPanelRef.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

async function loadAddresses() {
  loading.value = true
  try {
    addresses.value = await getShippingAddresses()
  } finally {
    loading.value = false
  }
}

async function openCreate() {
  resetForm()
  prefillFromProfile()
  form.isDefault = addresses.value.length === 0
  formVisible.value = true
  await scrollToForm()
}

async function openEdit(row: ShippingAddress) {
  editingId.value = row.id
  Object.assign(form, {
    receiverName: row.receiverName,
    receiverPhone: row.receiverPhone,
    detailAddress: row.detailAddress,
    label: row.label || '',
    isDefault: row.isDefault,
  })
  syncLabelPresetState()
  formVisible.value = true
  await scrollToForm()
}

function closeForm() {
  formVisible.value = false
}

function validateForm() {
  const name = form.receiverName.trim()
  const phone = form.receiverPhone.trim()
  const detail = form.detailAddress.trim()

  if (!name || !phone || !detail) {
    ElMessage.warning('请填写完整收货信息')
    return false
  }

  if (!/^[\d+\-\s()]{6,20}$/.test(phone)) {
    ElMessage.warning('请输入有效的手机号')
    return false
  }

  return true
}

async function handleSubmit() {
  if (!validateForm()) return

  submitLoading.value = true
  try {
    const payload = {
      receiverName: form.receiverName.trim(),
      receiverPhone: form.receiverPhone.trim(),
      detailAddress: form.detailAddress.trim(),
      label: form.label.trim() || undefined,
      isDefault: form.isDefault,
    }

    if (editingId.value) {
      await updateShippingAddress({ id: editingId.value, ...payload })
      ElMessage.success('地址已更新')
    } else {
      await createShippingAddress(payload)
      ElMessage.success('地址已添加')
    }

    formVisible.value = false
    await loadAddresses()
  } finally {
    submitLoading.value = false
  }
}

async function handleSetDefault(row: ShippingAddress) {
  if (row.isDefault) return
  await setDefaultShippingAddress(row.id)
  ElMessage.success('已设为默认地址')
  await loadAddresses()
}

async function handleDelete(row: ShippingAddress) {
  try {
    await ElMessageBox.confirm(`确定删除地址「${addressSummary(row)}」？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
    })
  } catch {
    return
  }

  await deleteShippingAddress(row.id)
  ElMessage.success('地址已删除')
  if (editingId.value === row.id) {
    formVisible.value = false
  }
  await loadAddresses()
}

onMounted(loadAddresses)
</script>

<template>
  <el-card shadow="never" class="address-card" v-loading="loading">
    <div class="address-header">
      <div>
        <h3 class="address-title">收货地址</h3>
        <p class="address-desc">提前保存地址，下单时可快速选择</p>
      </div>
      <el-button v-if="!formVisible" type="primary" :icon="Plus" @click="openCreate">新增地址</el-button>
    </div>

    <Transition name="form-slide">
      <div
        v-if="formVisible"
        ref="formPanelRef"
        class="address-form-panel"
        :class="{ 'is-editing': !!editingId }"
      >
        <div class="form-panel-head">
          <div>
            <h4 class="form-panel-title">{{ editingId ? '编辑收货地址' : '新增收货地址' }}</h4>
            <p class="form-panel-tip">填写完整信息，下单时一键选用</p>
          </div>
          <button type="button" class="form-close-btn" aria-label="关闭" @click="closeForm">
            <el-icon><Close /></el-icon>
          </button>
        </div>

        <div class="form-section">
          <div class="field-label-row">
            <span class="field-label">地址标签</span>
            <span class="field-optional">选填</span>
          </div>
          <div class="label-chips">
            <button
              v-for="tag in LABEL_PRESETS"
              :key="tag"
              type="button"
              class="label-chip"
              :class="{ 'is-active': form.label === tag && !customLabel }"
              @click="selectLabelPreset(tag)"
            >
              {{ tag }}
            </button>
            <button
              type="button"
              class="label-chip"
              :class="{ 'is-active': customLabel || (form.label && !LABEL_PRESETS.includes(form.label as any)) }"
              @click="enableCustomLabel"
            >
              自定义
            </button>
          </div>
          <el-input
            v-if="customLabel"
            v-model="form.label"
            class="custom-label-input"
            placeholder="输入自定义标签，如：父母家"
            maxlength="32"
            clearable
          />
        </div>

        <div class="form-grid">
          <div class="form-section">
            <label class="field-label">收货人 <span class="field-required">*</span></label>
            <el-input v-model="form.receiverName" placeholder="请输入姓名" maxlength="64" size="large" />
          </div>
          <div class="form-section">
            <label class="field-label">手机号 <span class="field-required">*</span></label>
            <el-input
              v-model="form.receiverPhone"
              placeholder="请输入手机号"
              maxlength="32"
              size="large"
              inputmode="tel"
            />
          </div>
        </div>

        <div class="form-section">
          <label class="field-label">详细地址 <span class="field-required">*</span></label>
          <el-input
            v-model="form.detailAddress"
            type="textarea"
            :rows="3"
            placeholder="国家 / 省州 / 城市 / 街道 / 邮编"
            resize="none"
          />
          <p class="field-hint">建议填写完整地址，便于快递准确送达</p>
        </div>

        <label class="default-toggle">
          <el-switch v-model="form.isDefault" />
          <span>设为默认地址</span>
        </label>

        <div class="form-actions">
          <el-button size="large" @click="closeForm">取消</el-button>
          <el-button type="primary" size="large" :loading="submitLoading" @click="handleSubmit">
            {{ editingId ? '保存修改' : '保存地址' }}
          </el-button>
        </div>
      </div>
    </Transition>

    <div v-if="!addresses.length && !loading && !formVisible" class="address-empty">
      <el-icon class="empty-icon"><Location /></el-icon>
      <p class="empty-title">暂无收货地址</p>
      <p class="empty-desc">添加常用地址，结算时无需重复填写</p>
      <el-button type="primary" size="large" :icon="Plus" @click="openCreate">添加第一个地址</el-button>
    </div>

    <div v-else-if="addresses.length" class="address-list">
      <div
        v-for="item in addresses"
        :key="item.id"
        class="address-item"
        :class="{
          'is-default': item.isDefault,
          'is-editing': editingId === item.id && formVisible,
        }"
      >
        <div class="address-item-main">
          <div class="address-item-head">
            <div class="address-tags">
              <el-tag v-if="item.isDefault" size="small" type="warning">默认</el-tag>
              <el-tag v-if="item.label" size="small" effect="plain">{{ item.label }}</el-tag>
            </div>
            <div class="address-actions">
              <button
                v-if="!item.isDefault"
                type="button"
                class="action-btn"
                @click="handleSetDefault(item)"
              >
                <el-icon><Check /></el-icon>
                设为默认
              </button>
              <button type="button" class="action-btn" @click="openEdit(item)">
                <el-icon><EditPen /></el-icon>
                编辑
              </button>
              <button type="button" class="action-btn action-btn-danger" @click="handleDelete(item)">
                删除
              </button>
            </div>
          </div>
          <p class="address-contact">
            <span class="contact-name">{{ item.receiverName }}</span>
            <span class="contact-phone">{{ item.receiverPhone }}</span>
          </p>
          <p class="address-detail">{{ item.detailAddress }}</p>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.address-card {
  margin-top: 20px;
  border-radius: var(--cb-radius-lg);
}

.address-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.address-title {
  margin: 0;
  font-family: var(--cb-font-display);
  font-size: 18px;
  letter-spacing: 0.04em;
  color: var(--cb-text);
}

.address-desc {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--cb-text-muted);
}

.address-form-panel {
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid rgba(201, 169, 98, 0.35);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(201, 169, 98, 0.1), rgba(201, 169, 98, 0.04));
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.address-form-panel.is-editing {
  border-color: rgba(201, 169, 98, 0.5);
}

.form-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.form-panel-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--cb-text);
}

.form-panel-tip {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.form-close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--cb-text-muted);
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.form-close-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--cb-text);
}

.form-section {
  margin-bottom: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.field-label-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.field-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--cb-text-dim);
}

.field-label-row .field-label {
  margin-bottom: 0;
}

.field-optional {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.field-required {
  color: #e6a23c;
}

.field-hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.label-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.label-chip {
  min-width: 72px;
  padding: 8px 16px;
  border: 1px solid var(--cb-border);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--cb-text-dim);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease, transform 0.15s ease;
}

.label-chip:hover {
  border-color: rgba(201, 169, 98, 0.35);
  color: var(--cb-text);
}

.label-chip.is-active {
  border-color: rgba(201, 169, 98, 0.65);
  background: rgba(201, 169, 98, 0.16);
  color: var(--cb-gold-light);
}

.custom-label-input {
  margin-top: 10px;
}

.default-toggle {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  font-size: 14px;
  color: var(--cb-text-dim);
  cursor: pointer;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 4px;
}

.form-actions .el-button {
  min-width: 108px;
}

.address-empty {
  text-align: center;
  padding: 40px 16px 28px;
  color: var(--cb-text-muted);
}

.empty-icon {
  font-size: 40px;
  color: var(--cb-accent);
  opacity: 0.7;
  margin-bottom: 12px;
}

.empty-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 600;
  color: var(--cb-text);
}

.empty-desc {
  margin: 0 0 18px;
  font-size: 13px;
}

.address-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.address-item {
  padding: 16px;
  border: 1px solid var(--cb-border);
  border-radius: 12px;
  background: rgba(201, 169, 98, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.address-item.is-default {
  border-color: rgba(201, 169, 98, 0.42);
  box-shadow: 0 0 0 1px rgba(201, 169, 98, 0.12);
}

.address-item.is-editing {
  border-color: rgba(201, 169, 98, 0.55);
  background: rgba(201, 169, 98, 0.1);
}

.address-item-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.address-tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.address-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: var(--cb-accent);
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.action-btn:hover {
  background: rgba(201, 169, 98, 0.14);
}

.action-btn-danger {
  color: #f56c6c;
}

.action-btn-danger:hover {
  background: rgba(245, 108, 108, 0.12);
}

.address-contact {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin: 0 0 8px;
}

.contact-name {
  font-weight: 700;
  color: var(--cb-text);
}

.contact-phone {
  font-size: 14px;
  color: var(--cb-text-dim);
}

.address-detail {
  margin: 0;
  font-size: 13px;
  line-height: 1.65;
  color: var(--cb-text-muted);
}

.form-slide-enter-active,
.form-slide-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.form-slide-enter-from,
.form-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (max-width: 640px) {
  .address-header {
    flex-direction: column;
    align-items: stretch;
  }

  .address-header .el-button {
    width: 100%;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions .el-button {
    width: 100%;
    min-width: 0;
    margin: 0;
  }

  .address-item-head {
    flex-direction: column;
  }

  .address-actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
