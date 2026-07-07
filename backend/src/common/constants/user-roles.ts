import { UserRole } from '../../user/entities/user.entity';

export const ADMIN_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SUB_ADMIN];

export const STAFF_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.SUB_ADMIN];

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isSuperAdmin(role: UserRole): boolean {
  return role === UserRole.ADMIN;
}
