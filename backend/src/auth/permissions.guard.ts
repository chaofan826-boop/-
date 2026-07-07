import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AdminPermission,
  hasAdminPermission,
} from '../common/constants/admin-permissions';
import { isAdminRole } from '../common/constants/user-roles';
import { UserRole } from '../user/entities/user.entity';
import { PERMISSIONS_KEY } from './permissions.decorator';

type AuthUser = {
  role: UserRole;
  permissions?: AdminPermission[] | null;
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<AdminPermission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!user) {
      throw new ForbiddenException('Forbidden resource');
    }

    if (!isAdminRole(user.role)) {
      throw new ForbiddenException('Forbidden resource');
    }

    const allowed = requiredPermissions.every((permission) =>
      hasAdminPermission(user, permission),
    );
    if (!allowed) {
      throw new ForbiddenException('当前账号没有此模块权限');
    }

    return true;
  }
}
