import { IsEnum, IsOptional } from 'class-validator';
import { BannerStatus } from '../entities/banner.entity';

export class QueryBannerDto {
  @IsOptional()
  @IsEnum(BannerStatus)
  status?: BannerStatus;
}
