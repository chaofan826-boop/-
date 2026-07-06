import { Type } from 'class-transformer';
import { IsInt, IsString, MinLength } from 'class-validator';

export class AdminResetPasswordDto {
  @Type(() => Number)
  @IsInt()
  userId: number;

  @IsString()
  @MinLength(6)
  newPassword: string;
}
