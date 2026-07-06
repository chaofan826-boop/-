import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory('/'),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/StoreLayout.vue'),
      children: [
        { path: '', name: 'Home', component: () => import('@/views/Home.vue') },
        {
          path: 'categories/:id',
          name: 'CategoryProducts',
          component: () => import('@/views/CategoryProducts.vue'),
        },
        { path: 'products/:id', name: 'ProductDetail', component: () => import('@/views/ProductDetail.vue') },
        { path: 'cart', name: 'Cart', component: () => import('@/views/Cart.vue') },
        { path: 'checkout', name: 'Checkout', component: () => import('@/views/Checkout.vue'), meta: { auth: true } },
        { path: 'user', name: 'UserCenter', component: () => import('@/views/UserCenter.vue'), meta: { auth: true } },
        { path: 'orders/:id', name: 'OrderDetail', component: () => import('@/views/OrderDetail.vue'), meta: { auth: true } },
      ],
    },
    { path: '/login', name: 'Login', component: () => import('@/views/Login.vue'), meta: { public: true } },
    { path: '/register', name: 'Register', component: () => import('@/views/Register.vue'), meta: { public: true } },
  ],
})

router.beforeEach(async (to) => {
  const userStore = useUserStore()

  if (to.meta.public) {
    if (userStore.token && (to.path === '/login' || to.path === '/register')) {
      return '/'
    }
    return true
  }

  if (to.meta.auth && !userStore.token) {
    return { path: '/login', query: { redirect: to.fullPath } }
  }

  if (userStore.token && !userStore.user && to.meta.auth) {
    try {
      await userStore.fetchProfile()
    } catch {
      userStore.logout()
      return '/login'
    }
  }

  return true
})

export default router
