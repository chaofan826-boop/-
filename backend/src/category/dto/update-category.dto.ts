import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { CategoryStatus } from '../entities/category.entity';
import { LocalizedNameDto } from './localized-name.dto';

export class UpdateCategoryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocalizedNameDto)
  name?: LocalizedNameDto;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}
