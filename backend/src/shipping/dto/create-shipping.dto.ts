import { IsEnum, IsString, MinLength } from 'class-validator';
import { ShippingCarrier } from '../entities/shipping.entity';

export class CreateShippingDto {
  @IsString()
  @MinLength(1)
  orderNo: string;

  @IsString()
  @MinLength(1)
  trackingNumber: string;

  @IsEnum(ShippingCarrier)
  carrier: ShippingCarrier;
}
