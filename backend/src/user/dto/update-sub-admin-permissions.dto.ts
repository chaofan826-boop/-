import { ArrayNotEmpty, IsArray, IsIn, IsInt, Min } from 'class-validator';
import {
  ADMIN_PERMISSIONS,
  AdminPermission,
} from '../../common/constants/admin-permissions';

export class UpdateSubAdminPermissionsDto {
  @IsInt()
  @Min(1)
  userId: number;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ADMIN_PERMISSIONS, { each: true })
  permissions: AdminPermission[];
}
