import { IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @MinLength(6, { message: '当前密码至少 6 位' })
  currentPassword: string;

  @IsString()
  @MinLength(6, { message: '新密码至少 6 位，且须同时包含字母和数字' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]+$/, {
    message: '新密码须同时包含字母和数字，仅可使用字母和数字',
  })
  newPassword: string;
}
