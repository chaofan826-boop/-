import { IsEnum, IsOptional, IsString } from 'class-validator';
import { UserStatus } from '../entities/user.entity';

export class QueryAdminUsersDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
