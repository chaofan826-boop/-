import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ProductSpecOptionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  values?: string[];
}

export class ProductSpecOptionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductSpecOptionDto)
  options: ProductSpecOptionDto[];
}
