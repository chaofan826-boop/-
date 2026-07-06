import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';

const USER_SELECT = {
  id: true,
  email: true,
  phone: true,
  name: true,
  avatar: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email or phone is required');
    }

    if (dto.email) {
      const emailExists = await this.userRepository.findOne({ where: { email: dto.email } });
      if (emailExists) {
        throw new ConflictException('Email already registered');
      }
    }

    if (dto.phone) {
      const phoneExists = await this.userRepository.findOne({ where: { phone: dto.phone } });
      if (phoneExists) {
        throw new ConflictException('Phone already registered');
      }
    }

    const user = this.userRepository.create({
      email: dto.email ?? null,
      phone: dto.phone ?? null,
      name: dto.name,
      role: dto.role,
      password: await bcrypt.hash(dto.password, 10),
    });
    const saved = await this.userRepository.save(user);
    const { password: _, ...result } = saved;
    return result;
  }

  findAll() {
    return this.userRepository.find({ select: { ...USER_SELECT } });
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
      select: { id: true, email: true, phone: true, password: true, name: true, avatar: true, role: true, createdAt: true, updatedAt: true },
    });
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { phone },
      select: { id: true, email: true, phone: true, password: true, name: true, avatar: true, role: true, createdAt: true, updatedAt: true },
    });
  }

  async findByAccount(account: string): Promise<User | null> {
    if (account.includes('@')) {
      return this.findByEmail(account);
    }
    return this.findByPhone(account);
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
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    await this.userRepository.update(id, {
      password: await bcrypt.hash(newPassword, 10),
    });

    return null;
  }
}
