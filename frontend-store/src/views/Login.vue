<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const form = reactive({
  account: '',
  password: '',
})

async function handleLogin() {
  if (!form.account || !form.password) {
    ElMessage.warning('请填写账号和密码')
    return
  }
  if (form.password.length < 6) {
    ElMessage.warning('密码至少 6 位，且须同时包含字母和数字')
    return
  }
  loading.value = true
  try {
    await userStore.login(form.account, form.password)
    ElMessage.success('登录成功')
    router.push((route.query.redirect as string) || '/')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-bg" />
    <div class="auth-card glass-panel">
      <div class="auth-header">
        <div class="logo-mark">CB</div>
        <p class="auth-badge">MEMBER ACCESS</p>
        <h2>登录</h2>
      </div>
      <el-form @submit.prevent="handleLogin">
        <el-form-item>
          <el-input v-model="form.account" placeholder="手机号 / 邮箱" size="large" inputmode="tel" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password />
          <p class="field-hint">密码至少 6 位，须同时包含字母和数字</p>
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" size="large" class="submit-btn">
          登 录
        </el-button>
      </el-form>
      <p class="link">
        还没有账号？<router-link to="/register">立即注册</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
  overflow: hidden;
}

.auth-bg {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201, 169, 98, 0.08), transparent 55%),
    var(--cb-bg);
}

.auth-card {
  width: 100%;
  max-width: 420px;
  padding: 40px 36px;
  position: relative;
  z-index: 1;
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo-mark {
  width: 56px;
  height: 56px;
  margin: 0 auto 20px;
  border-radius: var(--cb-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--cb-font-display);
  font-weight: 700;
  font-size: 18px;
  color: var(--cb-accent);
  background: rgba(14, 14, 16, 0.95);
  border: 1px solid var(--cb-border);
}

.auth-badge {
  font-size: 10px;
  letter-spacing: 0.3em;
  color: var(--cb-accent);
  margin-bottom: 10px;
  text-transform: uppercase;
}

.auth-header h2 {
  font-family: var(--cb-font-display);
  font-size: 28px;
  letter-spacing: 0.08em;
  color: var(--cb-text);
}

.submit-btn {
  width: 100%;
  margin-top: 8px;
}

.link {
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: var(--cb-text-muted);
}

.link a {
  color: var(--cb-accent);
  text-decoration: none;
  font-weight: 500;
}

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--cb-text-muted);
  line-height: 1.5;
}
</style>
