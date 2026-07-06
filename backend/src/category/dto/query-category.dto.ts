import { IsEnum, IsOptional } from 'class-validator';
import { CategoryStatus } from '../entities/category.entity';

export class QueryCategoryDto {
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}
