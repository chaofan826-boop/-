import { IsDateString, IsOptional } from 'class-validator';

export class OrderTrendsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
