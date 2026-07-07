import { UserRole } from '../../user/entities/user.entity';
import { isAdminRole, isSuperAdmin } from './user-roles';

export const ADMIN_PERMISSIONS = [
  'dashboard',
  'products',
  'banners',
  'promotions',
  'orders',
  'users',
  'chat',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_PERMISSION_LABELS: Record<AdminPermission, string> = {
  dashboard: '仪表盘',
  products: '商品与分类',
  banners: '轮播图',
  promotions: '首页营销',
  orders: '订单管理',
  users: '用户管理',
  chat: '客服消息',
};

export function normalizePermissions(
  permissions?: AdminPermission[] | null,
): AdminPermission[] | null {
  if (permissions == null) return null;
  const unique = [...new Set(permissions)];
  return unique.filter((item): item is AdminPermission =>
    ADMIN_PERMISSIONS.includes(item),
  );
}

export function validateAssignablePermissions(permissions: AdminPermission[]) {
  const normalized = normalizePermissions(permissions) ?? [];
  if (!normalized.length) {
    throw new Error('At least one permission is required');
  }
  return normalized;
}

export function hasAdminPermission(
  user: { role: UserRole; permissions?: readonly string[] | null },
  permission: AdminPermission,
): boolean {
  if (!isAdminRole(user.role)) return false;
  if (isSuperAdmin(user.role)) return true;
  if (user.permissions == null) return true;
  return user.permissions.includes(permission);
}

export function getEffectivePermissions(
  user: { role: UserRole; permissions?: readonly string[] | null },
): AdminPermission[] | null {
  if (isSuperAdmin(user.role)) return null;
  if (!isAdminRole(user.role)) return [];
  if (user.permissions == null) return [...ADMIN_PERMISSIONS];
  return normalizePermissions([...(user.permissions as AdminPermission[])]);
}
