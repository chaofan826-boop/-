export const USER_ROLES = {
  ADMIN: 'admin',
  SUB_ADMIN: 'sub_admin',
  CUSTOMER: 'customer',
} as const

export const ROLE_LABELS: Record<string, string> = {
  admin: '超级管理员',
  sub_admin: '子管理员',
  customer: '用户',
}

export function roleLabel(role: string) {
  return ROLE_LABELS[role] || role
}

export function isSuperAdmin(role?: string | null) {
  return role === USER_ROLES.ADMIN
}

export function isAdminRole(role?: string | null) {
  return role === USER_ROLES.ADMIN || role === USER_ROLES.SUB_ADMIN
}

export function roleTagType(role: string) {
  if (role === USER_ROLES.ADMIN) return 'warning'
  if (role === USER_ROLES.SUB_ADMIN) return 'success'
  return 'info'
}
