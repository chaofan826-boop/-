import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../audit/audit.service';
import { RequestMeta } from '../audit/utils/request-meta.util';
import { RedisService } from '../common/redis/redis.service';
import { isAdminRole } from '../common/constants/user-roles';
import { validatePhoneForRegion, normalizePhone } from '../common/utils/phone.util';
import type { AdminPermission } from '../common/constants/admin-permissions';
import { UserRole, UserStatus } from '../user/entities/user.entity';
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
    region: string | null;
    name: string;
    avatar: string | null;
    role: UserRole;
    permissions: AdminPermission[] | null;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly auditService: AuditService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokenResult> {
    if (dto.email) {
      const user = await this.userService.create({
        email: dto.email.trim(),
        password: dto.password,
        name: dto.name,
        role: UserRole.CUSTOMER,
      });
      return this.buildAuthResponse(user);
    }

    if (dto.phone && dto.region) {
      validatePhoneForRegion(dto.region, dto.phone);
      const phone = normalizePhone(dto.region, dto.phone);
      const user = await this.userService.create({
        phone,
        region: dto.region,
        password: dto.password,
        name: dto.name,
        role: UserRole.CUSTOMER,
      });
      return this.buildAuthResponse(user);
    }

    throw new BadRequestException('请填写邮箱，或选择地区并填写手机号');
  }

  async login(dto: LoginDto, meta?: RequestMeta): Promise<AuthTokenResult> {
    const account = dto.account.trim();
    const user = await this.userService.findByAccount(account);
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      if (user && isAdminRole(user.role)) {
        this.auditService.recordLoginFailure(
          { user, account, reason: '账号或密码错误' },
          meta,
        );
      }
      throw new UnauthorizedException('账号或密码错误');
    }
    if (user.status === UserStatus.FROZEN) {
      if (isAdminRole(user.role)) {
        this.auditService.recordLoginFailure(
          { user, account, reason: '账号已被冻结' },
          meta,
        );
      }
      throw new UnauthorizedException('账号已被冻结');
    }
    await this.userService.touchLastActive(user.id);
    const safeUser = this.userService.sanitizeUser(user);
    if (isAdminRole(safeUser.role)) {
      this.auditService.recordLoginSuccess(safeUser, account, meta);
    }
    return this.buildAuthResponse(safeUser);
  }

  async logout(userId: number, meta?: RequestMeta) {
    const user = await this.userService.findAuthProfile(userId);
    if (user && isAdminRole(user.role)) {
      this.auditService.recordLogout(user, meta);
    }
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
    region?: string | null;
    name: string;
    avatar?: string | null;
    role: UserRole;
    permissions?: AdminPermission[] | null;
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
        region: user.region ?? null,
        name: user.name,
        avatar: user.avatar ?? null,
        role: user.role,
        permissions: user.permissions ?? null,
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
