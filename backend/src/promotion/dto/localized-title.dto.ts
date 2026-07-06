import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class ProductSalePriceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  USD?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  CNY?: number;
}

export class LocalizedTitleDto {
  @IsString()
  @IsNotEmpty()
  zh: string;

  @IsString()
  @IsNotEmpty()
  en: string;
}
