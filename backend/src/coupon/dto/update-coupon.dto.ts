import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { CreateCouponDto } from './create-coupon.dto';

export class UpdateCouponDto extends CreateCouponDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;
}
