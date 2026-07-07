import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { isAdminRole } from '../../common/constants/user-roles';
import { UserRole } from '../../user/entities/user.entity';
import { AuditService } from '../audit.service';
import { getRequestMeta } from '../utils/request-meta.util';

const SKIP_PATH_PREFIXES = ['/audit/', '/auth/login', '/auth/register'];

@Injectable()
export class AdminOperationLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      originalUrl?: string;
      user?: { id: number; role: UserRole };
      body?: Record<string, unknown>;
    }>();

    const method = req.method?.toUpperCase() ?? 'GET';
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      return next.handle();
    }

    const path = (req.originalUrl || req.path || '').split('?')[0];
    if (SKIP_PATH_PREFIXES.some((prefix) => path.includes(prefix))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const user = req.user;
        if (!user || !isAdminRole(user.role)) {
          return;
        }

        const meta = getRequestMeta(req as never);
        this.auditService.recordOperation({
          actorId: user.id,
          actorRole: user.role,
          method,
          path,
          body: req.body,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        });
      }),
    );
  }
}
