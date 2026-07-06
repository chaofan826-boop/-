import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { QuickReplyStatus } from '../entities/chat-quick-reply.entity';

export class UpdateQuickReplyDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsEnum(QuickReplyStatus)
  status?: QuickReplyStatus;
}
