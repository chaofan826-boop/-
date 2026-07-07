export const ADMIN_PERMISSIONS = [
  'dashboard',
  'products',
  'banners',
  'promotions',
  'orders',
  'users',
  'chat',
] as const

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number]

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  dashboard: '仪表盘',
  products: '商品与分类',
  banners: '轮播图',
  promotions: '首页营销',
  orders: '订单管理',
  users: '用户管理',
  chat: '客服消息',
}

export function normalizePermissions(
  permissions?: AdminPermission[] | null,
): AdminPermission[] | null {
  if (permissions == null) return null
  const unique = [...new Set(permissions)]
  return unique.filter((item): item is AdminPermission =>
    ADMIN_PERMISSIONS.includes(item),
  )
}

export function getEffectivePermissions(user?: {
  role?: string | null
  permissions?: AdminPermission[] | null
} | null): AdminPermission[] {
  if (!user?.role) return []
  if (user.role === 'admin') return [...ADMIN_PERMISSIONS]
  if (user.role !== 'sub_admin') return []
  if (user.permissions == null) return [...ADMIN_PERMISSIONS]
  return normalizePermissions(user.permissions) ?? []
}

export function hasPermission(
  user: { role?: string | null; permissions?: AdminPermission[] | null } | null | undefined,
  permission: AdminPermission,
) {
  return getEffectivePermissions(user).includes(permission)
}

export function permissionLabels(permissions?: AdminPermission[] | null) {
  const list = permissions?.length ? permissions : [...ADMIN_PERMISSIONS]
  return list.map((item) => ADMIN_PERMISSION_LABELS[item]).join('、')
}

export const ROUTE_PERMISSIONS: Record<string, AdminPermission> = {
  '/dashboard': 'dashboard',
  '/products': 'products',
  '/categories': 'products',
  '/banners': 'banners',
  '/promotions': 'promotions',
  '/orders': 'orders',
  '/users': 'users',
  '/chat': 'chat',
}

export function firstAccessiblePath(user?: {
  role?: string | null
  permissions?: AdminPermission[] | null
} | null) {
  const permissions = getEffectivePermissions(user)
  const order: AdminPermission[] = [
    'dashboard',
    'products',
    'orders',
    'users',
    'chat',
    'banners',
    'promotions',
  ]
  for (const permission of order) {
    if (permissions.includes(permission)) {
      if (permission === 'products') return '/products'
      if (permission === 'dashboard') return '/dashboard'
      if (permission === 'orders') return '/orders'
      if (permission === 'users') return '/users'
      if (permission === 'chat') return '/chat'
      if (permission === 'banners') return '/banners'
      if (permission === 'promotions') return '/promotions'
    }
  }
  return '/profile'
}
