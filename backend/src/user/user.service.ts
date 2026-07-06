import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { RedisService } from '../common/redis/redis.service';
import { validatePhoneForRegion, normalizePhone, getPhoneLookupCandidates } from '../common/utils/phone.util';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserRole, UserStatus } from './entities/user.entity';

const USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  name: true,
  avatar: true,
  role: true,
  status: true,
  region: true,
  lastActiveAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UserService {
  private readonly lastTouchAt = new Map<number, number>();

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
  ) {}

  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    if (dto.phone) {
      if (!dto.region) {
        throw new BadRequestException('Region is required when registering with phone');
      }
      validatePhoneForRegion(dto.region, dto.phone);
      dto.phone = normalizePhone(dto.region, dto.phone);
    }

    if (dto.email) {
      const emailExists = await this.userRepository.findOne({ where: { email: dto.email } });
      if (emailExists) {
        throw new ConflictException('该邮箱已被注册');
      }
    }

    if (dto.phone) {
      const phoneExists = await this.userRepository.findOne({ where: { phone: dto.phone } });
      if (phoneExists) {
        throw new ConflictException('该手机号已被注册');
      }
    }

    const user = this.userRepository.create({
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      region: dto.region ?? null,
      name: dto.name,
      role: dto.role,
      password: await bcrypt.hash(dto.password, 10),
    });
    const saved = await this.userRepository.save(user);
    const { password: _, ...result } = saved;
    return result;
  }

  findAll() {
    return this.userRepository.find({ select: { ...USER_SELECT }, order: { id: 'DESC' } });
  }

  async findAllForAdmin(keyword?: string, status?: UserStatus) {
    const qb = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.phone',
        'user.name',
        'user.avatar',
        'user.role',
        'user.status',
        'user.region',
        'user.lastActiveAt',
        'user.createdAt',
        'user.updatedAt',
      ])
      .where('user.role != :adminRole', { adminRole: UserRole.ADMIN })
      .orderBy('user.id', 'DESC');

    if (status) {
      qb.andWhere('user.status = :status', { status });
    }

    const trimmed = keyword?.trim();
    if (trimmed) {
      if (/^\d+$/.test(trimmed)) {
        qb.andWhere(
          '(user.id = :id OR user.name LIKE :kw OR user.email LIKE :kw OR user.phone LIKE :kw)',
          { id: Number(trimmed), kw: `%${trimmed}%` },
        );
      } else {
        qb.andWhere('(user.name LIKE :kw OR user.email LIKE :kw OR user.phone LIKE :kw)', {
          kw: `%${trimmed}%`,
        });
      }
    }

    const users = await qb.getMany();

    const list = await Promise.all(
      users.map(async (user) => {
        const token = await this.redisService.getToken(user.id);
        return {
          id: user.id,
          email: user.email,
          phone: user.phone,
          name: user.name,
          avatar: user.avatar,
          role: user.role,
          status: user.status,
          region: user.region,
          account: user.email || user.phone || '',
          isOnline: !!token,
          lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      }),
    );

    return { list, total: list.length };
  }

  async touchLastActive(userId: number) {
    const now = Date.now();
    const last = this.lastTouchAt.get(userId) ?? 0;
    if (now - last < 60_000) {
      return;
    }
    this.lastTouchAt.set(userId, now);
    await this.userRepository.update(userId, { lastActiveAt: new Date() });
  }

  async adminResetPassword(userId: number, newPassword: string) {
    const user = await this.findCustomerForAdmin(userId);

    await this.userRepository.update(userId, {
      password: await bcrypt.hash(newPassword, 10),
    });
    await this.redisService.deleteToken(userId);

    return {
      userId,
      account: user.email || user.phone || '',
      newPassword,
    };
  }

  async adminUpdateStatus(userId: number, status: UserStatus) {
    const user = await this.findCustomerForAdmin(userId);
    await this.userRepository.update(userId, { status });
    if (status === UserStatus.FROZEN) {
      await this.redisService.deleteToken(userId);
    }
    return { userId, status };
  }

  async adminDelete(userId: number) {
    const user = await this.findCustomerForAdmin(userId);
    await this.redisService.deleteToken(userId);
    await this.userRepository.softDelete(userId);
    return { userId, account: user.email || user.phone || '' };
  }

  private async findCustomerForAdmin(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('不能操作管理员账户');
    }
    return user;
  }

  async assertUserCanAccess(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: { id: true, status: true },
    });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }
    if (user.status === UserStatus.FROZEN) {
      throw new UnauthorizedException('账号已被冻结');
    }
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      select: { ...USER_SELECT },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: { id: true, email: true, phone: true, password: true, name: true, avatar: true, role: true, status: true, region: true, createdAt: true, updatedAt: true },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { phone },
      select: { id: true, email: true, phone: true, password: true, name: true, avatar: true, role: true, status: true, region: true, createdAt: true, updatedAt: true },
    });
  }

  async findByAccount(account: string): Promise<User | null> {
    if (account.includes('@')) {
      return this.findByEmail(account);
    }

    const candidates = getPhoneLookupCandidates(account);
    for (const phone of candidates) {
      const user = await this.findByPhone(phone);
      if (user) {
        return user;
      }
    }
    return null;
  }

  sanitizeUser(user: User): Omit<User, 'password'> {
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(
    id: number,
    data: { name?: string; avatar?: string | null },
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (data.name !== undefined) user.name = data.name;
    if (data.avatar !== undefined) user.avatar = data.avatar;

    const saved = await this.userRepository.save(user);
    const { password: _, ...result } = saved;
    return result;
  }

  async changePassword(id: number, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: { id: true, password: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('当前密码不正确');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException('新密码不能与当前密码相同');
    }

    await this.userRepository.update(id, {
      password: await bcrypt.hash(newPassword, 10),
    });

    return null;
  }
}
