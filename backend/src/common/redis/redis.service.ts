import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisService {
  private readonly tokenPrefix = 'auth:token:';

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async setToken(userId: number, token: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`${this.tokenPrefix}${userId}`, token, 'EX', ttlSeconds);
  }

  async getToken(userId: number): Promise<string | null> {
    return this.redis.get(`${this.tokenPrefix}${userId}`);
  }

  async deleteToken(userId: number): Promise<void> {
    await this.redis.del(`${this.tokenPrefix}${userId}`);
  }

  async validateToken(userId: number, token: string): Promise<boolean> {
    const cached = await this.getToken(userId);
    return cached === token;
  }
}
