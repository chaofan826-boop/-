import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../user/entities/user.entity';
import { ROLES_KEY } from './roles.decorator';

export const AdminRoles = () => SetMetadata(ROLES_KEY, [UserRole.ADMIN, UserRole.SUB_ADMIN]);
