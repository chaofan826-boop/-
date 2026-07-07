import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum HotProductsPeriod {
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
  ALL = 'all',
}

export enum HotProductsSortBy {
  QUANTITY = 'quantity',
  REVENUE = 'revenue',
}

export class HotProductsQueryDto {
  @IsOptional()
  @IsEnum(HotProductsPeriod)
  period?: HotProductsPeriod;

  @IsOptional()
  @IsEnum(HotProductsSortBy)
  sortBy?: HotProductsSortBy;

  @IsOptional()
  @IsString()
  date?: string;
}
