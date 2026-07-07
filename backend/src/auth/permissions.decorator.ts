import { SetMetadata } from '@nestjs/common';
import { AdminPermission } from '../common/constants/admin-permissions';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: AdminPermission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
