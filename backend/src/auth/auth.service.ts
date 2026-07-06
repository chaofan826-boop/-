import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RedisService } from '../common/redis/redis.service';
import { UserRole } from '../user/entities/user.entity';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface JwtPayload {
  sub: number;
  email: string | null;
  phone: string | null;
  role: UserRole;
}

export interface AuthTokenResult {
  accessToken: string;
  expiresIn: string;
  tokenType: string;
  user: {
    id: number;
    email: string | null;
    phone: string | null;
    name: string;
    avatar: string | null;
    role: UserRole;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokenResult> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone is required');
    }
    const user = await this.userService.create({
      email: dto.email,
      phone: dto.phone,
      password: dto.password,
      name: dto.name,
      role: UserRole.CUSTOMER,
    });
    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthTokenResult> {
    const user = await this.userService.findByAccount(dto.account.trim());
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid account or password');
    }
    return this.buildAuthResponse(this.userService.sanitizeUser(user));
  }

  async logout(userId: number) {
    await this.redisService.deleteToken(userId);
    return null;
  }

  async getMe(userId: number) {
    return this.userService.findOne(userId);
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    return this.userService.updateProfile(userId, {
      name: dto.name,
      avatar: dto.avatar,
    });
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    return this.userService.changePassword(userId, dto.currentPassword, dto.newPassword);
  }

  private async buildAuthResponse(user: {
    id: number;
    email: string | null;
    phone: string | null;
    name: string;
    avatar?: string | null;
    role: UserRole;
  }): Promise<AuthTokenResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '7d');
    const accessToken = this.jwtService.sign(payload, { expiresIn: expiresIn as `${number}d` });
    const ttlSeconds = this.parseExpiresIn(expiresIn);

    await this.redisService.setToken(user.id, accessToken, ttlSeconds);

    return {
      accessToken,
      expiresIn,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        avatar: user.avatar ?? null,
        role: user.role,
      },
    };
  }

  private parseExpiresIn(expiresIn: string): number {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 3600;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const multipliers: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (multipliers[unit] ?? 86400);
  }
}
