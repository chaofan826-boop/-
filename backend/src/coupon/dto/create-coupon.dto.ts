import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { CouponStatus } from '../entities/coupon.entity';
import { CouponAmountsDto, CouponMinAmountsDto } from './coupon-amounts.dto';
import { LocalizedTitleDto } from './localized-title.dto';

export class CreateCouponDto {
  @ValidateNested()
  @Type(() => LocalizedTitleDto)
  title: LocalizedTitleDto;

  @ValidateNested()
  @Type(() => CouponAmountsDto)
  discountAmounts: CouponAmountsDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CouponMinAmountsDto)
  minOrderAmounts?: CouponMinAmountsDto;

  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  categoryIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalQuantity?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  perUserLimit?: number;

  @IsDateString()
  claimStartAt: string;

  @IsDateString()
  claimEndAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  validityDays?: number;

  @IsOptional()
  @IsBoolean()
  showOnHome?: boolean;

  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}
