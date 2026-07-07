import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { buildPaginatedResult } from '../common/interfaces/paginated-result.interface';
import { isAdminRole } from '../common/constants/user-roles';
import { runBatchDelete } from '../common/utils/batch-delete.util';
import { User, UserRole } from '../user/entities/user.entity';
import { QueryLoginLogsDto } from './dto/query-login-logs.dto';
import { QueryOperationLogsDto } from './dto/query-operation-logs.dto';
import { AdminLoginLog, AdminLoginLogAction } from './entities/admin-login-log.entity';
import { AdminOperationLog } from './entities/admin-operation-log.entity';
import { RequestMeta } from './utils/request-meta.util';
import { buildOperationLogPayload, OperationLogInput } from './utils/operation-summary.util';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AdminLoginLog)
    private readonly loginLogRepository: Repository<AdminLoginLog>,
    @InjectRepository(AdminOperationLog)
    private readonly operationLogRepository: Repository<AdminOperationLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  recordLoginSuccess(user: Pick<User, 'id' | 'role' | 'email' | 'phone' | 'name'>, account: string, meta?: RequestMeta) {
    if (!isAdminRole(user.role)) return;
    void this.saveLoginLog({
      userId: user.id,
      account,
      role: user.role,
      action: AdminLoginLogAction.LOGIN_SUCCESS,
      failureReason: null,
      ...meta,
    });
  }

  recordLoginFailure(
    input: {
      user?: Pick<User, 'id' | 'role' | 'email' | 'phone'> | null;
      account: string;
      reason: string;
    },
    meta?: RequestMeta,
  ) {
    const role = input.user?.role ?? null;
    if (role && !isAdminRole(role)) return;
    void this.saveLoginLog({
      userId: input.user?.id ?? null,
      account: input.account,
      role,
      action: AdminLoginLogAction.LOGIN_FAILURE,
      failureReason: input.reason,
      ...meta,
    });
  }

  recordLogout(user: Pick<User, 'id' | 'role' | 'email' | 'phone'>, meta?: RequestMeta) {
    if (!isAdminRole(user.role)) return;
    const account = user.email || user.phone || String(user.id);
    void this.saveLoginLog({
      userId: user.id,
      account,
      role: user.role,
      action: AdminLoginLogAction.LOGOUT,
      failureReason: null,
      ...meta,
    });
  }

  recordOperation(input: OperationLogInput) {
    if (!isAdminRole(input.actorRole as UserRole)) return;
    void this.saveOperationLog(input);
  }

  async listLoginLogs(query: QueryLoginLogsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const qb = this.loginLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .orderBy('log.createdAt', 'DESC');

    const keyword = query.keyword?.trim();
    if (keyword) {
      if (/^\d+$/.test(keyword)) {
        qb.andWhere(
          '(log.userId = :id OR log.account LIKE :kw OR user.name LIKE :kw)',
          { id: Number(keyword), kw: `%${keyword}%` },
        );
      } else {
        qb.andWhere('(log.account LIKE :kw OR user.name LIKE :kw)', { kw: `%${keyword}%` });
      }
    }

    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }

    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return buildPaginatedResult(
      list.map((item) => this.toLoginLogView(item)),
      total,
      page,
      pageSize,
    );
  }

  async listOperationLogs(query: QueryOperationLogsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const qb = this.operationLogRepository
      .createQueryBuilder('log')
      .orderBy('log.createdAt', 'DESC');

    const keyword = query.keyword?.trim();
    if (keyword) {
      if (/^\d+$/.test(keyword)) {
        qb.andWhere(
          '(log.actorId = :id OR log.actorName LIKE :kw OR log.summary LIKE :kw OR log.path LIKE :kw)',
          { id: Number(keyword), kw: `%${keyword}%` },
        );
      } else {
        qb.andWhere(
          '(log.actorName LIKE :kw OR log.summary LIKE :kw OR log.path LIKE :kw)',
          { kw: `%${keyword}%` },
        );
      }
    }

    if (query.module?.trim()) {
      qb.andWhere('log.module = :module', { module: query.module.trim() });
    }

    if (query.action?.trim()) {
      qb.andWhere('log.action = :action', { action: query.action.trim() });
    }

    qb.skip((page - 1) * pageSize).take(pageSize);
    const [list, total] = await qb.getManyAndCount();
    return buildPaginatedResult(
      list.map((item) => this.toOperationLogView(item)),
      total,
      page,
      pageSize,
    );
  }

  async removeLoginLog(id: number) {
    const result = await this.loginLogRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Login log not found');
    }
    return null;
  }

  async removeOperationLog(id: number) {
    const result = await this.operationLogRepository.delete(id);
    if (!result.affected) {
      throw new NotFoundException('Operation log not found');
    }
    return null;
  }

  removeLoginLogsMany(ids: number[]) {
    return runBatchDelete(ids, (id) => this.removeLoginLog(id));
  }

  removeOperationLogsMany(ids: number[]) {
    return runBatchDelete(ids, (id) => this.removeOperationLog(id));
  }

  private async saveLoginLog(data: {
    userId: number | null;
    account: string;
    role: UserRole | null;
    action: AdminLoginLogAction;
    failureReason: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    try {
      await this.loginLogRepository.save(this.loginLogRepository.create(data));
    } catch (error) {
      this.logger.warn(`Failed to save login log: ${String(error)}`);
    }
  }

  private async saveOperationLog(input: OperationLogInput) {
    try {
      const actor = await this.userRepository.findOne({
        where: { id: input.actorId },
        select: { id: true, name: true },
      });
      const payload = buildOperationLogPayload(input);
      await this.operationLogRepository.save(
        this.operationLogRepository.create({
          actorId: input.actorId,
          actorName: actor?.name ?? `用户 #${input.actorId}`,
          actorRole: input.actorRole as UserRole,
          module: payload.module,
          action: payload.action,
          method: payload.method,
          path: payload.path,
          summary: payload.summary,
          metadata: payload.metadata,
          ipAddress: input.ipAddress ?? null,
          userAgent: input.userAgent ?? null,
        }),
      );
    } catch (error) {
      this.logger.warn(`Failed to save operation log: ${String(error)}`);
    }
  }

  private toLoginLogView(log: AdminLoginLog) {
    return {
      id: log.id,
      userId: log.userId,
      account: log.account,
      userName: log.user?.name ?? null,
      role: log.role,
      action: log.action,
      failureReason: log.failureReason,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    };
  }

  private toOperationLogView(log: AdminOperationLog) {
    return {
      id: log.id,
      actorId: log.actorId,
      actorName: log.actorName,
      actorRole: log.actorRole,
      module: log.module,
      action: log.action,
      method: log.method,
      path: log.path,
      summary: log.summary,
      metadata: log.metadata,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
