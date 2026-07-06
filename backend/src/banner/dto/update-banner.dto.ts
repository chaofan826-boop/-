import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { BannerStatus } from '../entities/banner.entity';
import { LocalizedTitleDto } from './localized-title.dto';

export class UpdateBannerDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTitleDto)
  title?: LocalizedTitleDto | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  imageUrl?: string;

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
