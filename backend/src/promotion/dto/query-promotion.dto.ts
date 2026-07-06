import { IsEnum, IsOptional } from 'class-validator';
import { PromotionStatus, PromotionType } from '../entities/promotion.entity';

export class QueryPromotionDto {
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;

  @IsOptional()
  @IsEnum(PromotionType)
  type?: PromotionType;
}
