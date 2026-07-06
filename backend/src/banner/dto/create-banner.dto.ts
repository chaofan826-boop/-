import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, ValidateNested } from 'class-validator';
import { BannerStatus } from '../entities/banner.entity';
import { LocalizedTitleDto } from './localized-title.dto';

export class CreateBannerDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTitleDto)
  title?: LocalizedTitleDto | null;

  @IsString()
  @MaxLength(512)
  imageUrl: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  linkUrl?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsEnum(BannerStatus)
  status?: BannerStatus;
}
