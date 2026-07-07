import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../user/entities/user.entity';
import { AuditController, auditProviders } from './audit.controller';
import { AuditService } from './audit.service';
import { AdminLoginLog } from './entities/admin-login-log.entity';
import { AdminOperationLog } from './entities/admin-operation-log.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdminLoginLog, AdminOperationLog, User])],
  controllers: [AuditController],
  providers: auditProviders,
  exports: [AuditService],
})
export class AuditModule {}
