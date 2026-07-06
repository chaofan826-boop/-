<script setup lang="ts">

import { onMounted, reactive, ref } from 'vue'

import { useRouter } from 'vue-router'

import { ElMessage, ElMessageBox, type UploadRequestOptions } from 'element-plus'

import { Camera, List, SwitchButton } from '@element-plus/icons-vue'

import { changePassword } from '@/api/auth'

import { uploadAvatar } from '@/api/upload'

import { useAppStore } from '@/stores/app'

import { useUserStore } from '@/stores/user'

import { formatPhoneDisplay, getRegionLabel } from '@/constants/regions'



const router = useRouter()

const userStore = useUserStore()

const appStore = useAppStore()

const avatarUploading = ref(false)

const logoutLoading = ref(false)

const passwordLoading = ref(false)

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/

const passwordForm = reactive({

  currentPassword: '',

  newPassword: '',

  confirmPassword: '',

})



function beforeAvatarUpload(file: File) {

  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

  if (!allowed.includes(file.type)) {

    ElMessage.warning('仅支持 JPG、PNG、GIF、WebP 格式')

    return false

  }

  if (file.size > 2 * 1024 * 1024) {

    ElMessage.warning('图片大小不能超过 2MB')

    return false

  }

  return true

}



async function handleAvatarUpload(options: UploadRequestOptions) {

  avatarUploading.value = true

  try {

    const res = await uploadAvatar(options.file as File)

    await userStore.updateProfile({ avatar: res.url })

    ElMessage.success('头像已更新')

    options.onSuccess?.(res)

  } catch (err) {

    options.onError?.(err as Error)

  } finally {

    avatarUploading.value = false

  }

}



async function handleRemoveAvatar() {

  try {

    await ElMessageBox.confirm('确定移除当前头像？', '移除头像', {

      type: 'warning',

      confirmButtonText: '移除',

      cancelButtonText: '取消',

    })

  } catch {

    return

  }

  await userStore.updateProfile({ avatar: null })

  ElMessage.success('头像已移除')

}



async function handlePasswordSubmit() {
  if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    ElMessage.warning('请填写完整密码信息')
    return
  }
  if (!PASSWORD_PATTERN.test(passwordForm.newPassword)) {
    ElMessage.warning('新密码至少 6 位，须同时包含字母和数字')
    return
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }

  passwordLoading.value = true
  try {
    await changePassword({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
    ElMessage.success('密码已修改，请重新登录')
    passwordForm.currentPassword = ''
    passwordForm.newPassword = ''
    passwordForm.confirmPassword = ''
    await userStore.logout()
    router.push('/login')
  } finally {
    passwordLoading.value = false
  }
}

async function handleLogout() {

  try {

    await ElMessageBox.confirm('确定退出当前账号？', '退出登录', {

      type: 'warning',

      confirmButtonText: '退出',

      cancelButtonText: '取消',

      confirmButtonClass: 'el-button--danger',

    })

  } catch {

    return

  }



  logoutLoading.value = true

  try {

    await userStore.logout()

    ElMessage.success('已退出登录')

    router.push('/login')

  } finally {

    logoutLoading.value = false

  }

}



onMounted(async () => {

  if (!userStore.user) await userStore.fetchProfile()

})

</script>



<template>

  <div>

    <h2 class="page-title">用户中心</h2>



    <el-row :gutter="20">

      <el-col :xs="24" :md="8">

        <el-card shadow="never" class="profile-card">

          <el-avatar :size="72" :src="userStore.user?.avatar || undefined" class="user-avatar">

            {{ userStore.user?.name?.[0] || 'U' }}

          </el-avatar>

          <h3>{{ userStore.user?.name }}</h3>

          <p v-if="userStore.user?.email">{{ userStore.user.email }}</p>

          <p v-if="userStore.user?.phone">{{ formatPhoneDisplay(userStore.user.region, userStore.user.phone) }}</p>

          <el-tag size="small">{{ userStore.user?.role }}</el-tag>



          <button type="button" class="orders-link" @click="router.push('/orders')">

            <el-icon><List /></el-icon>

            <span>我的订单</span>

          </button>



          <div class="profile-footer">

            <button type="button" class="logout-btn" :disabled="logoutLoading" @click="handleLogout">

              <el-icon class="logout-icon"><SwitchButton /></el-icon>

              <span>{{ logoutLoading ? '退出中...' : '退出登录' }}</span>

            </button>

          </div>

        </el-card>

      </el-col>



      <el-col :xs="24" :md="16">

        <el-card shadow="never" class="settings-card">

          <h3 class="settings-title">账户设置</h3>



          <div class="settings-section">

            <p class="settings-label">头像</p>

            <div class="avatar-edit-row">

              <el-upload

                class="avatar-uploader"

                :show-file-list="false"

                accept="image/jpeg,image/png,image/gif,image/webp"

                :http-request="handleAvatarUpload"

                :before-upload="beforeAvatarUpload"

                :disabled="avatarUploading"

              >

                <div class="avatar-edit-wrap">

                  <el-avatar :size="80" :src="userStore.user?.avatar || undefined" class="edit-avatar">

                    {{ userStore.user?.name?.[0] || 'U' }}

                  </el-avatar>

                  <span class="avatar-edit-mask">

                    <el-icon><Camera /></el-icon>

                    {{ avatarUploading ? '上传中...' : '更换头像' }}

                  </span>

                </div>

              </el-upload>

              <div class="avatar-edit-hint">

                <p>支持 JPG、PNG、GIF、WebP，大小不超过 2MB</p>

                <el-button

                  v-if="userStore.user?.avatar"

                  link

                  type="danger"

                  @click="handleRemoveAvatar"

                >

                  移除头像

                </el-button>

              </div>

            </div>

          </div>



          <el-descriptions :column="1" border class="settings-desc">

            <el-descriptions-item label="用户名">{{ userStore.user?.name }}</el-descriptions-item>

            <el-descriptions-item label="邮箱">{{ userStore.user?.email || '-' }}</el-descriptions-item>

            <el-descriptions-item label="地区">{{ getRegionLabel(userStore.user?.region) }}</el-descriptions-item>

            <el-descriptions-item label="手机">

              {{ formatPhoneDisplay(userStore.user?.region, userStore.user?.phone) || '-' }}

            </el-descriptions-item>

            <el-descriptions-item label="默认币种">{{ appStore.currency }}</el-descriptions-item>

          </el-descriptions>



          <div class="settings-section password-section">

            <p class="settings-label">修改密码</p>

            <el-form label-width="96px" class="password-form" @submit.prevent="handlePasswordSubmit">

              <el-form-item label="当前密码">

                <el-input

                  v-model="passwordForm.currentPassword"

                  type="password"

                  show-password

                  placeholder="请输入当前密码"

                />

              </el-form-item>

              <el-form-item label="新密码">

                <el-input

                  v-model="passwordForm.newPassword"

                  type="password"

                  show-password

                  placeholder="至少 6 位，须含字母和数字"

                />

              </el-form-item>

              <el-form-item label="确认新密码">

                <el-input

                  v-model="passwordForm.confirmPassword"

                  type="password"

                  show-password

                  placeholder="再次输入新密码"

                />

              </el-form-item>

              <el-form-item>

                <el-button type="primary" :loading="passwordLoading" @click="handlePasswordSubmit">

                  修改密码

                </el-button>

              </el-form-item>

            </el-form>

          </div>



        </el-card>

      </el-col>

    </el-row>

  </div>

</template>



<style scoped>

.profile-card {

  text-align: center;

  border-radius: 12px;

  margin-bottom: 20px;

}



.user-avatar {

  margin: 0 auto 12px;

  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark)) !important;

  color: #0a0a0c !important;

  font-weight: 700;

}



.profile-card h3 {

  margin-bottom: 4px;

}



.profile-card p {

  font-size: 13px;

  color: var(--cb-text-muted);

  margin-bottom: 4px;

}



.orders-link {

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 8px;

  width: 100%;

  margin-top: 20px;

  padding: 10px 16px;

  border-radius: 8px;

  border: 1px solid var(--cb-border);

  background: rgba(201, 169, 98, 0.08);

  color: var(--cb-accent);

  font-size: 14px;

  font-weight: 600;

  cursor: pointer;

  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;

}



.orders-link:hover {

  background: rgba(201, 169, 98, 0.14);

  border-color: var(--cb-accent);

  box-shadow: var(--cb-glow-cyan);

}



.profile-footer {

  margin-top: 16px;

  padding-top: 16px;

  border-top: 1px solid var(--cb-border);

}



.logout-btn {

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 8px;

  width: 100%;

  padding: 10px 16px;

  border-radius: 8px;

  border: 1px solid rgba(248, 113, 113, 0.35);

  background: rgba(248, 113, 113, 0.06);

  color: #f87171;

  font-size: 14px;

  font-weight: 600;

  letter-spacing: 0.04em;

  cursor: pointer;

  transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease;

}



.logout-btn:hover:not(:disabled) {

  background: rgba(248, 113, 113, 0.12);

  border-color: #f87171;

  box-shadow: 0 0 12px rgba(248, 113, 113, 0.2);

}



.logout-btn:disabled {

  opacity: 0.65;

  cursor: not-allowed;

}



.logout-icon {

  font-size: 16px;

}



.settings-card {

  border-radius: 12px;

  margin-bottom: 20px;

}



.settings-title {

  margin: 0 0 20px;

  font-family: var(--cb-font-display);

  font-size: 20px;

  letter-spacing: 0.04em;

  color: var(--cb-text);

}



.settings-section {

  margin-bottom: 20px;

}



.settings-label {

  margin: 0 0 12px;

  font-family: var(--cb-font-mono);

  font-size: 11px;

  letter-spacing: 0.12em;

  color: var(--cb-neon-cyan);

  opacity: 0.7;

  text-transform: uppercase;

}



.avatar-edit-row {

  display: flex;

  align-items: center;

  gap: 16px;

  flex-wrap: wrap;

  margin-bottom: 8px;

}



.avatar-uploader :deep(.el-upload) {

  border: none;

  cursor: pointer;

}



.avatar-edit-wrap {

  position: relative;

  width: 80px;

  height: 80px;

  border-radius: 50%;

  overflow: hidden;

}



.edit-avatar {

  width: 80px !important;

  height: 80px !important;

  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark)) !important;

  color: #0a0a0c !important;

  font-weight: 700;

}



.avatar-edit-mask {

  position: absolute;

  inset: 0;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 4px;

  background: rgba(0, 0, 0, 0.55);

  color: #fff;

  font-size: 11px;

  opacity: 0;

  transition: opacity 0.2s ease;

}



.avatar-edit-wrap:hover .avatar-edit-mask {

  opacity: 1;

}



.avatar-edit-hint {

  font-size: 13px;

  color: var(--cb-text-muted);

  line-height: 1.6;

}



.avatar-edit-hint p {

  margin: 0 0 6px;

}



.settings-desc {

  margin-top: 8px;

}



.password-section {

  margin-top: 28px;

  padding-top: 24px;

  border-top: 1px solid var(--cb-border);

}



.password-form {

  max-width: 420px;

}



.password-form :deep(.el-form-item__label) {

  color: var(--cb-text-dim);

}

</style>


