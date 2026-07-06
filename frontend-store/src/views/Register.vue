<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { REGIONS, getRegion } from '@/constants/regions'

type RegisterMode = 'phone' | 'email'

const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/

const router = useRouter()
const userStore = useUserStore()
const loading = ref(false)
const mode = ref<RegisterMode>('phone')

const form = reactive({
  name: '',
  email: '',
  region: 'CN',
  phone: '',
  password: '',
})

const selectedRegion = computed(() => getRegion(form.region))

async function handleRegister() {
  if (!form.name || !form.password) {
    ElMessage.warning('请填写完整信息')
    return
  }
  if (!PASSWORD_PATTERN.test(form.password)) {
    ElMessage.warning('密码至少 6 位，须同时包含字母和数字')
    return
  }

  if (mode.value === 'email') {
    if (!form.email.trim()) {
      ElMessage.warning('请填写邮箱')
      return
    }
    loading.value = true
    try {
      await userStore.register({
        name: form.name,
        email: form.email.trim(),
        password: form.password,
      })
      ElMessage.success('注册成功')
      router.push('/')
    } finally {
      loading.value = false
    }
    return
  }

  if (!form.region || !form.phone) {
    ElMessage.warning('请选择地区并填写手机号')
    return
  }
  const region = selectedRegion.value
  if (region && !region.pattern.test(form.phone.replace(/\D/g, ''))) {
    ElMessage.warning('手机号格式不正确')
    return
  }

  loading.value = true
  try {
    await userStore.register({
      name: form.name,
      region: form.region,
      phone: form.phone.replace(/\D/g, ''),
      password: form.password,
    })
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

      <div class="mode-switch">
        <button type="button" :class="{ active: mode === 'phone' }" @click="mode = 'phone'">
          手机号注册
        </button>
        <button type="button" :class="{ active: mode === 'email' }" @click="mode = 'email'">
          邮箱注册
        </button>
      </div>

      <el-form @submit.prevent="handleRegister">
        <el-form-item>
          <el-input v-model="form.name" placeholder="昵称" size="large" />
        </el-form-item>

        <template v-if="mode === 'phone'">
          <el-form-item>
            <el-select v-model="form.region" placeholder="选择地区" size="large" style="width: 100%">
              <el-option
                v-for="r in REGIONS"
                :key="r.code"
                :label="`${r.label} (+${r.dial})`"
                :value="r.code"
              />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-input v-model="form.phone" placeholder="手机号" size="large" inputmode="tel">
              <template #prefix>
                <span class="dial-prefix">+{{ selectedRegion?.dial }}</span>
              </template>
            </el-input>
          </el-form-item>
        </template>

        <el-form-item v-else>
          <el-input v-model="form.email" placeholder="邮箱" size="large" inputmode="email" />
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            show-password
          />
          <p class="field-hint">密码至少 6 位，须同时包含字母和数字</p>
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
  margin-bottom: 24px;
}

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 24px;
  padding: 4px;
  border-radius: var(--cb-radius);
  background: rgba(14, 14, 16, 0.6);
  border: 1px solid var(--cb-border);
}

.mode-switch button {
  border: none;
  background: transparent;
  color: var(--cb-text-muted);
  font-size: 14px;
  padding: 10px 12px;
  border-radius: calc(var(--cb-radius) - 2px);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-switch button.active {
  background: rgba(201, 169, 98, 0.12);
  color: var(--cb-accent);
  box-shadow: inset 0 0 0 1px rgba(201, 169, 98, 0.25);
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

.dial-prefix {
  color: var(--cb-text-muted);
  font-size: 14px;
  padding-right: 4px;
}

.field-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--cb-text-muted);
  line-height: 1.5;
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
