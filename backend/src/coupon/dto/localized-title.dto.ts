import { IsString, MinLength } from 'class-validator';

export class LocalizedTitleDto {
  @IsString()
  @MinLength(1)
  zh: string;

  @IsString()
  @MinLength(1)
  en: string;
}
