import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum HotProductsPeriod {
  DAY = 'day',
  MONTH = 'month',
  YEAR = 'year',
}

export class HotProductsQueryDto {
  @IsOptional()
  @IsEnum(HotProductsPeriod)
  period?: HotProductsPeriod;

  @IsOptional()
  @IsString()
  date?: string;
}
