import { IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  account: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位，且须同时包含字母和数字' })
  password: string;
}
