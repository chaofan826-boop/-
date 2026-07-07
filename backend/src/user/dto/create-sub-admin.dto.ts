import { ArrayNotEmpty, IsArray, IsIn, IsString, MinLength } from 'class-validator';
import {
  ADMIN_PERMISSIONS,
  AdminPermission,
} from '../../common/constants/admin-permissions';

export class CreateSubAdminDto {
  @IsString()
  @MinLength(2)
  account: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ADMIN_PERMISSIONS, { each: true })
  permissions: AdminPermission[];
}
