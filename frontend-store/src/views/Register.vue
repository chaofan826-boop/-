<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)

const form = reactive({
  name: '',
  email: '',
  password: '',
})

async function handleRegister() {
  if (!form.name || !form.email || !form.password) {
    ElMessage.warning('请填写完整信息')
    return
  }
  loading.value = true
  try {
    await userStore.register({ name: form.name, email: form.email, password: form.password })
    ElMessage.success('注册成功')
    router.push('/')
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
        <p class="auth-badge">CREATE ACCOUNT</p>
        <h2>注册</h2>
      </div>
      <el-form @submit.prevent="handleRegister">
        <el-form-item>
          <el-input v-model="form.name" placeholder="昵称" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.email" placeholder="邮箱" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码（至少6位）" size="large" show-password />
        </el-form-item>
        <el-button type="primary" native-type="submit" :loading="loading" size="large" class="submit-btn">
          注 册
        </el-button>
      </el-form>
      <p class="link">
        已有账号？<router-link to="/login">去登录</router-link>
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
    radial-gradient(ellipse 60% 50% at 50% 100%, rgba(201, 169, 98, 0.08), transparent 55%),
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
</style>
