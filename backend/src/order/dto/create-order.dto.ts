import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class OrderItemDto {
  @IsInt()
  productSkuId: number;

  @IsOptional()
  @IsInt()
  productId?: number;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreateOrderDto {
  @IsString()
  shippingAddress: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
