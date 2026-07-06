import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('@/layouts/AdminLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: 'products',
          name: 'Products',
          component: () => import('@/views/Products.vue'),
        },
        {
          path: 'categories',
          name: 'Categories',
          component: () => import('@/views/Categories.vue'),
        },
        {
          path: 'banners',
          name: 'Banners',
          meta: { title: '轮播图管理' },
          component: () => import('@/views/Banners.vue'),
        },
        {
          path: 'promotions',
          name: 'Promotions',
          meta: { title: '首页营销' },
          component: () => import('@/views/Promotions.vue'),
        },
        {
          path: 'orders',
          name: 'Orders',
          component: () => import('@/views/Orders.vue'),
        },
        {
          path: 'users',
          name: 'Users',
          meta: { title: '用户管理' },
          component: () => import('@/views/Users.vue'),
        },
        {
          path: 'chat',
          name: 'Chat',
          meta: { title: '客服消息' },
          component: () => import('@/views/Chat.vue'),
        },
        {
          path: 'profile',
          name: 'Profile',
          meta: { title: '个人设置' },
          component: () => import('@/views/Profile.vue'),
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const userStore = useUserStore()
  userStore.syncTokenFromStorage()

  if (to.meta.public) {
    if (userStore.token && to.path === '/login') {
      return '/dashboard'
    }
    return true
  }

  if (!userStore.token) {
    return '/login'
  }

  if (!userStore.user) {
    try {
      await userStore.fetchProfile()
    } catch {
      await userStore.logout()
      return '/login'
    }
  }

  return true
})

export default router
