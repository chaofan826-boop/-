import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { BatchDeleteDto } from '../common/dto/batch-delete.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../user/entities/user.entity';
import { AuditService } from './audit.service';
import { QueryLoginLogsDto } from './dto/query-login-logs.dto';
import { QueryOperationLogsDto } from './dto/query-operation-logs.dto';
import { AdminOperationLogInterceptor } from './interceptors/admin-operation-log.interceptor';

@Controller('audit')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('login-logs')
  listLoginLogs(@Query() query: QueryLoginLogsDto) {
    return this.auditService.listLoginLogs(query);
  }

  @Get('operation-logs')
  listOperationLogs(@Query() query: QueryOperationLogsDto) {
    return this.auditService.listOperationLogs(query);
  }

  @Post('login-logs/batch-delete')
  batchDeleteLoginLogs(@Body() dto: BatchDeleteDto) {
    return this.auditService.removeLoginLogsMany(dto.ids);
  }

  @Post('operation-logs/batch-delete')
  batchDeleteOperationLogs(@Body() dto: BatchDeleteDto) {
    return this.auditService.removeOperationLogsMany(dto.ids);
  }
}

export const auditProviders = [
  AuditService,
  AdminOperationLogInterceptor,
  {
    provide: APP_INTERCEPTOR,
    useClass: AdminOperationLogInterceptor,
  },
];
