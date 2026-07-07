import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AdminLoginLogAction } from '../entities/admin-login-log.entity';

export class QueryLoginLogsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(AdminLoginLogAction)
  action?: AdminLoginLogAction;
}
