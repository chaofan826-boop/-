import { createRouter, createWebHistory } from 'vue-router'
import { firstAccessiblePath, hasPermission } from '@/constants/permissions'
import type { AdminPermission } from '@/constants/permissions'
import { isSuperAdmin } from '@/constants/roles'
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
          meta: { permission: 'dashboard' },
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: 'products',
          name: 'Products',
          meta: { permission: 'products' },
          component: () => import('@/views/Products.vue'),
        },
        {
          path: 'categories',
          name: 'Categories',
          meta: { permission: 'products', title: '商品分类' },
          component: () => import('@/views/Categories.vue'),
        },
        {
          path: 'banners',
          name: 'Banners',
          meta: { title: '轮播图管理', permission: 'banners' },
          component: () => import('@/views/Banners.vue'),
        },
        {
          path: 'promotions',
          name: 'Promotions',
          meta: { title: '首页营销', permission: 'promotions' },
          component: () => import('@/views/Promotions.vue'),
        },
        {
          path: 'orders',
          name: 'Orders',
          meta: { permission: 'orders' },
          component: () => import('@/views/Orders.vue'),
        },
        {
          path: 'users',
          name: 'Users',
          meta: { title: '用户管理', permission: 'users' },
          component: () => import('@/views/Users.vue'),
        },
        {
          path: 'sub-admins',
          name: 'SubAdmins',
          meta: { title: '子管理员', superAdminOnly: true },
          component: () => import('@/views/SubAdmins.vue'),
        },
        {
          path: 'chat',
          name: 'Chat',
          meta: { title: '客服消息', permission: 'chat' },
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
      if (!userStore.user) {
        try {
          await userStore.fetchProfile()
        } catch {
          return true
        }
      }
      return firstAccessiblePath(userStore.user)
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

  if (to.meta.superAdminOnly && !isSuperAdmin(userStore.user?.role)) {
    return firstAccessiblePath(userStore.user)
  }

  const permission = to.meta.permission as AdminPermission | undefined
  if (permission && !hasPermission(userStore.user, permission)) {
    return firstAccessiblePath(userStore.user)
  }

  return true
})

export default router
