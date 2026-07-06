<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  account: 'admin@example.com',
  password: 'admin123',
})

const rules: FormRules = {
  account: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await userStore.login(form.account, form.password)
    ElMessage.success('登录成功')
    router.push('/dashboard')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-bg" />

    <div class="login-card">
      <div class="login-header">
        <div class="logo-mark">
          <el-icon :size="26" color="#c9a962"><User /></el-icon>
        </div>
        <p class="sys-tag">ADMIN PORTAL</p>
        <h2>跨境电商后台</h2>
        <p class="sys-name">CrossBorder Management System</p>
      </div>
      <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleLogin">
        <el-form-item prop="account">
          <el-input v-model="form.account" placeholder="邮箱 / 手机号" size="large" prefix-icon="User" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            size="large"
            prefix-icon="Lock"
            show-password
          />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" size="large" class="submit-btn">
          登 录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: var(--cb-bg);
  overflow: hidden;
}

.login-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 60% at 50% 0%, rgba(201, 169, 98, 0.1), transparent 55%),
    radial-gradient(ellipse 40% 40% at 100% 100%, rgba(139, 115, 85, 0.06), transparent 50%);
}

.login-card {
  width: 440px;
  position: relative;
  z-index: 1;
  padding: 44px 40px;
  background: rgba(18, 18, 22, 0.92);
  backdrop-filter: blur(24px);
  border-radius: var(--cb-radius-lg);
  border: 1px solid var(--cb-border);
  box-shadow: var(--cb-shadow-elevated);
}

.login-header {
  text-align: center;
  margin-bottom: 36px;
}

.logo-mark {
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  border-radius: var(--cb-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(14, 14, 16, 0.95);
  border: 1px solid var(--cb-border);
}

.sys-tag {
  font-size: 10px;
  letter-spacing: 0.3em;
  color: var(--cb-accent);
  margin-bottom: 12px;
  text-transform: uppercase;
}

.login-header h2 {
  font-family: var(--cb-font-display);
  font-size: 26px;
  letter-spacing: 0.06em;
  color: var(--cb-text);
  margin-bottom: 8px;
}

.sys-name {
  font-size: 12px;
  color: var(--cb-text-muted);
  letter-spacing: 0.08em;
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
  font-weight: 600;
  letter-spacing: 0.1em;
}
</style>
