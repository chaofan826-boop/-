import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '../entities/order.entity';

export class PayOrderDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsInt()
  @Min(1)
  userCouponId?: number;
}
