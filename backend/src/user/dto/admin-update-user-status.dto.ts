import { Type } from 'class-transformer';
import { IsEnum, IsInt } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class AdminUpdateUserStatusDto {
  @Type(() => Number)
  @IsInt()
  userId: number;

  @IsEnum(UserStatus, { message: '无效的用户状态' })
  status: UserStatus;
}
