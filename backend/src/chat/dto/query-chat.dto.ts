import { IsOptional, IsString } from 'class-validator';

export class QueryChatConversationsDto {
  @IsOptional()
  @IsString()
  keyword?: string;
}

export class QueryChatCustomersDto {
  @IsString()
  keyword: string;
}
