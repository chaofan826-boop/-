import { IsNotEmpty, IsString } from 'class-validator';

export class LocalizedTitleDto {
  @IsString()
  @IsNotEmpty()
  zh: string;

  @IsString()
  @IsNotEmpty()
  en: string;
}
