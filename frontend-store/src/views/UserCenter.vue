<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { getOrders, type Order } from '@/api/order'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const appStore = useAppStore()
const activeTab = ref('orders')
const orders = ref<Order[]>([])
const loading = ref(false)

const statusMap: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
}

async function loadOrders() {
  loading.value = true
  try {
    orders.value = await getOrders()
  } finally {
    loading.value = false
  }
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定退出登录？', '退出确认', {
      type: 'warning',
      confirmButtonText: '退出登录',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  await userStore.logout()
  router.push('/login')
}

onMounted(async () => {
  if (!userStore.user) await userStore.fetchProfile()
  await loadOrders()
})
</script>

<template>
  <div>
    <h2 class="page-title">用户中心</h2>

    <el-row :gutter="20">
      <el-col :xs="24" :md="8">
        <el-card shadow="never" class="profile-card">
          <div class="avatar">{{ userStore.user?.name?.[0] || 'U' }}</div>
          <h3>{{ userStore.user?.name }}</h3>
          <p v-if="userStore.user?.email">{{ userStore.user.email }}</p>
          <p v-if="userStore.user?.phone">{{ userStore.user.phone }}</p>
          <el-tag size="small">{{ userStore.user?.role }}</el-tag>
          <el-button type="danger" plain style="width: 100%; margin-top: 20px" @click="handleLogout">
            退出登录
          </el-button>
        </el-card>
      </el-col>

      <el-col :xs="24" :md="16">
        <el-card shadow="never">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="我的订单" name="orders">
              <div v-loading="loading">
                <div v-if="!orders.length" class="empty-state">
                  <p>暂无订单</p>
                  <el-button type="primary" @click="router.push('/')">去购物</el-button>
                </div>
                <div v-for="order in orders" :key="order.id" class="order-card" @click="router.push(`/orders/${order.id}`)">
                  <div class="order-header">
                    <span>订单 #{{ order.id }}</span>
                    <el-tag size="small">{{ statusMap[order.status] || order.status }}</el-tag>
                  </div>
                  <div v-for="item in order.items" :key="item.id" class="order-item">
                    <span>{{ item.product?.title?.zh || '商品' }} × {{ item.quantity }}</span>
                    <span>{{ appStore.formatPrice(Number(item.price) * item.quantity) }}</span>
                  </div>
                  <div class="order-footer">
                    <span class="time">{{ new Date(order.createdAt).toLocaleString() }}</span>
                    <span class="view-detail">查看详情 →</span>
                    <span class="total">合计 {{ appStore.formatPrice(Number(order.totalAmount)) }}</span>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane label="账户设置" name="settings">
              <el-descriptions :column="1" border>
                <el-descriptions-item label="用户名">{{ userStore.user?.name }}</el-descriptions-item>
                <el-descriptions-item label="邮箱">{{ userStore.user?.email || '-' }}</el-descriptions-item>
                <el-descriptions-item label="手机">{{ userStore.user?.phone || '-' }}</el-descriptions-item>
                <el-descriptions-item label="默认币种">{{ appStore.currency }}</el-descriptions-item>
              </el-descriptions>
            </el-tab-pane>
          </el-tabs>
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

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--cb-accent), var(--cb-gold-dark));
  color: #0a0a0c;
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px;
}

.profile-card h3 {
  margin-bottom: 4px;
}

.profile-card p {
  font-size: 13px;
  color: var(--cb-text-muted);
  margin-bottom: 4px;
}

.order-card {
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius-lg);
  padding: 16px;
  margin-bottom: 12px;
  background: var(--cb-surface);
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.order-card:hover {
  border-color: var(--cb-border-hover);
  box-shadow: var(--cb-glow-cyan);
}

.order-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-weight: 600;
}

.order-item {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  color: var(--cb-text-dim);
  padding: 4px 0;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--cb-border);
  font-size: 13px;
}

.order-footer .total {
  color: var(--cb-accent);
  font-weight: 700;
}

.view-detail {
  font-size: 12px;
  color: var(--cb-accent);
  opacity: 0.8;
}

.time {
  color: var(--cb-text-muted);
}
</style>
