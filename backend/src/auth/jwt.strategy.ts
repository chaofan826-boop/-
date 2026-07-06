import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { RedisService } from '../common/redis/redis.service';
import { UserRole } from '../user/entities/user.entity';
import { AuthService, JwtPayload } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'your-super-secret-jwt-key'),
      passReqToCallback: true,
    });
  }

  async validate(req: { headers: { authorization?: string } }, payload: JwtPayload) {
    const token = req.headers.authorization?.replace('Bearer ', '') ?? '';
    const isValid = await this.redisService.validateToken(payload.sub, token);
    if (!isValid) {
      throw new UnauthorizedException('Token revoked or expired');
    }
    return {
      id: payload.sub,
      email: payload.email,
      phone: payload.phone,
      role: payload.role as UserRole,
    };
  }
}
