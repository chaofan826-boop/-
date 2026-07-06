import { IsNotEmpty, IsString } from 'class-validator';

export class LocalizedNameDto {
  @IsString()
  @IsNotEmpty()
  zh: string;

  @IsString()
  @IsNotEmpty()
  en: string;
}
