import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PromotionStatus, PromotionType } from '../entities/promotion.entity';
import { LocalizedTitleDto } from './localized-title.dto';

export class CreatePromotionDto {
  @IsEnum(PromotionType)
  type: PromotionType;

  @ValidateNested()
  @Type(() => LocalizedTitleDto)
  title: LocalizedTitleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedTitleDto)
  subtitle?: LocalizedTitleDto | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(99)
  discountPercent?: number;

  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  productIds: number[];

  @IsOptional()
  @IsObject()
  salePrices?: Record<string, { USD?: number; CNY?: number }> | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  flashStock?: number | null;

  @IsDateString()
  startAt: string;

  @IsDateString()
  endAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;
}
