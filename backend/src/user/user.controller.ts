import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AdminRoles } from '../auth/admin-roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { BatchDeleteDto } from '../common/dto/batch-delete.dto';
import { AdminUpdateUserStatusDto } from './dto/admin-update-user-status.dto';
import { CreateSubAdminDto } from './dto/create-sub-admin.dto';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { UpdateSubAdminPermissionsDto } from './dto/update-sub-admin-permissions.dto';
import { UserRole } from './entities/user.entity';
import { UserService } from './user.service';

@Controller('users')
@UseGuards(RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @AdminRoles()
  @RequirePermissions('users')
  findAll(@Query() query: QueryAdminUsersDto) {
    return this.userService.findAllForAdmin(query.keyword, query.status);
  }

  @Get('admin/sub-admins')
  @Roles(UserRole.ADMIN)
  findSubAdmins(@Request() req: { user: { role: UserRole } }) {
    return this.userService.findAllSubAdmins(req.user.role);
  }

  @Post('admin/create-sub-admin')
  @Roles(UserRole.ADMIN)
  createSubAdmin(@Request() req: { user: { role: UserRole } }, @Body() dto: CreateSubAdminDto) {
    return this.userService.createSubAdmin(dto, req.user.role);
  }

  @Post('admin/sub-admins/permissions')
  @Roles(UserRole.ADMIN)
  updateSubAdminPermissions(
    @Request() req: { user: { role: UserRole } },
    @Body() dto: UpdateSubAdminPermissionsDto,
  ) {
    return this.userService.updateSubAdminPermissions(dto.userId, dto.permissions, req.user.role);
  }

  @Post('admin/reset-password')
  @AdminRoles()
  @RequirePermissions('users')
  resetPassword(
    @Request() req: { user: { role: UserRole } },
    @Body() dto: AdminResetPasswordDto,
  ) {
    return this.userService.adminResetPassword(dto.userId, dto.newPassword, req.user.role);
  }

  @Post('admin/update-status')
  @AdminRoles()
  @RequirePermissions('users')
  updateStatus(
    @Request() req: { user: { role: UserRole } },
    @Body() dto: AdminUpdateUserStatusDto,
  ) {
    return this.userService.adminUpdateStatus(dto.userId, dto.status, req.user.role);
  }

  @Post('batch-delete')
  @AdminRoles()
  @RequirePermissions('users')
  batchRemove(@Request() req: { user: { role: UserRole } }, @Body() dto: BatchDeleteDto) {
    return this.userService.adminBatchDelete(dto.ids, req.user.role);
  }

  @Delete(':id')
  @AdminRoles()
  @RequirePermissions('users')
  remove(@Request() req: { user: { role: UserRole } }, @Param('id', ParseIntPipe) id: number) {
    return this.userService.adminDelete(id, req.user.role);
  }

  @Get(':id')
  @AdminRoles()
  @RequirePermissions('users')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }
}
