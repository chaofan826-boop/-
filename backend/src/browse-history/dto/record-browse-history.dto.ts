import { IsInt, Min } from 'class-validator';

export class RecordBrowseHistoryDto {
  @IsInt()
  @Min(1)
  productId: number;
}
