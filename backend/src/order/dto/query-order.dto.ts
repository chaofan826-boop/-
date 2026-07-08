import { IsDateString, IsEnum, IsIn, IsOptional, IsString } from 'class-validator';
import { OrderStatus, PaymentMethod } from '../entities/order.entity';

export class QueryOrderDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsIn(['yes', 'no'])
  couponUsed?: 'yes' | 'no';

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
