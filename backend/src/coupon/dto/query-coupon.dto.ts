import { IsEnum, IsOptional } from 'class-validator';
import { CouponStatus } from '../entities/coupon.entity';

export class QueryCouponDto {
  @IsOptional()
  @IsEnum(CouponStatus)
  status?: CouponStatus;
}
