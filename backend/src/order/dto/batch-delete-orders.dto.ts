import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class BatchDeleteOrdersDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  orderNos: string[];
}
