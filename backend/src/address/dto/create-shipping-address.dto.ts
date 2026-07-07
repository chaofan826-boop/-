import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateShippingAddressDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  receiverName: string;

  @IsString()
  @MinLength(6)
  @MaxLength(32)
  receiverPhone: string;

  @IsString()
  @MinLength(4)
  detailAddress: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
