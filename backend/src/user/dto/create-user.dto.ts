import { IsEmail, IsEnum, IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class CreateUserDto {
  @ValidateIf((o: CreateUserDto) => !o.phone)
  @IsEmail()
  email?: string;

  @ValidateIf((o: CreateUserDto) => !o.email)
  @IsString()
  phone?: string;

  @ValidateIf((o: CreateUserDto) => !!o.phone)
  @IsString()
  region?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
