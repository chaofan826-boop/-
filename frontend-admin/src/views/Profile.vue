<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type UploadRequestOptions } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { changePassword } from '@/api/auth'
import { uploadAvatar } from '@/api/upload'
import { useUserStore } from '@/stores/user'

type AvatarMode = 'url' | 'upload'

const router = useRouter()
const userStore = useUserStore()

const profileLoading = ref(false)
const passwordLoading = ref(false)
const avatarUploading = ref(false)
const avatarMode = ref<AvatarMode>('url')

const profileForm = reactive({
  name: '',
  avatar: '',
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})

function isUploadedAvatar(url: string) {
  return url.includes('/api/uploads/avatars/')
}

function syncFormFromUser() {
  profileForm.name = userStore.user?.name || ''
  profileForm.avatar = userStore.user?.avatar || ''
  avatarMode.value = profileForm.avatar && isUploadedAvatar(profileForm.avatar) ? 'upload' : 'url'
}

async function handleAvatarUpload(options: UploadRequestOptions) {
  avatarUploading.value = true
  try {
    const res = await uploadAvatar(options.file as File)
    profileForm.avatar = res.url
    ElMessage.success('头像上传成功')
    options.onSuccess?.(res)
  } catch (err) {
    options.onError?.(err as Error)
  } finally {
    avatarUploading.value = false
  }
}

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

async function handleProfileSubmit() {
  if (!profileForm.name.trim()) {
    ElMessage.warning('昵称不能为空')
    return
  }

  profileLoading.value = true
  try {
    await userStore.updateProfile({
      name: profileForm.name.trim(),
      avatar: profileForm.avatar.trim() || null,
    })
    ElMessage.success('资料已更新')
  } finally {
    profileLoading.value = false
  }
}

async function handlePasswordSubmit() {
  if (!passwordForm.currentPassword || !passwordForm.newPassword) {
    ElMessage.warning('请填写完整密码信息')
    return
  }
  if (passwordForm.newPassword.length < 6) {
    ElMessage.warning('新密码至少 6 位')
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

onMounted(async () => {
  if (!userStore.user) {
    await userStore.fetchProfile()
  }
  syncFormFromUser()
})
</script>

<template>
  <div class="profile-page">
    <div class="page-header">
      <p class="page-tag">个人设置</p>
      <h2 class="page-title">个人设置</h2>
    </div>

    <el-row :gutter="20">
      <el-col :xs="24" :md="14">
        <el-card shadow="never" class="section-card">
          <template #header>
            <span class="card-title">基本资料</span>
          </template>

          <div class="avatar-row">
            <el-avatar :size="72" :src="profileForm.avatar || undefined" class="preview-avatar">
              {{ profileForm.name?.[0] || 'A' }}
            </el-avatar>
            <div class="avatar-hint">
              <p>头像预览</p>
              <span v-if="avatarMode === 'url'">填写图片 URL，留空则显示昵称首字母</span>
              <span v-else>上传本地图片（JPG/PNG/GIF/WebP，最大 2MB）</span>
            </div>
          </div>

          <el-form label-width="88px" @submit.prevent="handleProfileSubmit">
            <el-form-item label="昵称" required>
              <el-input v-model="profileForm.name" maxlength="100" show-word-limit />
            </el-form-item>

            <el-form-item label="头像">
              <div class="avatar-mode">
                <el-radio-group v-model="avatarMode">
                  <el-radio-button value="url">链接地址</el-radio-button>
                  <el-radio-button value="upload">本地上传</el-radio-button>
                </el-radio-group>

                <el-input
                  v-if="avatarMode === 'url'"
                  v-model="profileForm.avatar"
                  placeholder="https://example.com/avatar.png"
                  clearable
                  class="avatar-input"
                />

                <div v-else class="upload-area">
                  <el-upload
                    class="avatar-uploader"
                    :show-file-list="false"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    :http-request="handleAvatarUpload"
                    :before-upload="beforeAvatarUpload"
                    :disabled="avatarUploading"
                  >
                    <img
                      v-if="profileForm.avatar"
                      :src="profileForm.avatar"
                      class="upload-preview"
                      alt="avatar"
                    />
                    <div v-else class="upload-placeholder">
                      <el-icon><Plus /></el-icon>
                      <span>点击上传</span>
                    </div>
                  </el-upload>
                  <el-button
                    v-if="profileForm.avatar"
                    link
                    type="danger"
                    @click="profileForm.avatar = ''"
                  >
                    清除头像
                  </el-button>
                </div>
              </div>
            </el-form-item>

            <el-form-item label="邮箱">
              <el-input :model-value="userStore.user?.email || '—'" disabled />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="profileLoading" @click="handleProfileSubmit">
                保存资料
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="10">
        <el-card shadow="never" class="section-card">
          <template #header>
            <span class="card-title">修改密码</span>
          </template>

          <el-form label-width="88px" @submit.prevent="handlePasswordSubmit">
            <el-form-item label="当前密码" required>
              <el-input v-model="passwordForm.currentPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="新密码" required>
              <el-input v-model="passwordForm.newPassword" type="password" show-password />
            </el-form-item>
            <el-form-item label="确认密码" required>
              <el-input v-model="passwordForm.confirmPassword" type="password" show-password />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="passwordLoading" @click="handlePasswordSubmit">
                修改密码
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.page-header {
  margin-bottom: 20px;
}

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

.section-card {
  margin-bottom: 20px;
}

.card-title {
  font-weight: 600;
  letter-spacing: 0.04em;
}

.avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding: 16px;
  border: 1px solid var(--cb-border);
  border-radius: 8px;
  background: rgba(201, 169, 98, 0.04);
}

.preview-avatar {
  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark)) !important;
  color: #030712 !important;
  font-weight: 700;
  flex-shrink: 0;
}

.avatar-hint p {
  margin: 0 0 4px;
  font-weight: 600;
  color: var(--cb-text);
}

.avatar-hint span {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.avatar-mode {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.avatar-input {
  width: 100%;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-uploader :deep(.el-upload) {
  border: 1px dashed var(--cb-border);
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.2s;
}

.avatar-uploader :deep(.el-upload:hover) {
  border-color: var(--cb-neon-cyan);
}

.upload-preview {
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

.upload-placeholder .el-icon {
  font-size: 24px;
}
</style>
