import { IsEmail, IsEnum, IsOptional, IsString, Matches, MinLength, ValidateIf } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ValidateIf((o: CreateUserDto) => !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o: CreateUserDto) => !o.email)
  @IsString()
  @Matches(/^1[3-9]\d{9}$/)
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
