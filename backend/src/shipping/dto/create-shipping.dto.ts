import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsString, Min, MinLength } from 'class-validator';
import { ShippingCarrier } from '../entities/shipping.entity';

export class CreateShippingDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  orderId: number;

  @IsString()
  @MinLength(1)
  trackingNumber: string;

  @IsEnum(ShippingCarrier)
  carrier: ShippingCarrier;
}
