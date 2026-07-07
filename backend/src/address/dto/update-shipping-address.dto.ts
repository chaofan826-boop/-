import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateShippingAddressDto {
  @IsInt()
  id: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  receiverName?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  receiverPhone?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  detailAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  label?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
