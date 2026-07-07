import { IsEnum } from 'class-validator';
import { PaymentMethod } from '../entities/order.entity';

export class PayOrderDto {
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;
}
