import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsOptional()
  @IsEmail({}, { message: '邮箱格式不正确' })
  email?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6, { message: '密码至少 6 位，且须同时包含字母和数字' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/, {
    message: '密码须同时包含字母和数字，仅可使用字母和数字',
  })
  password: string;

  @IsString()
  @MinLength(2, { message: '昵称至少 2 个字符' })
  name: string;
}
