import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { AdminUpdateUserStatusDto } from './dto/admin-update-user-status.dto';
import { QueryAdminUsersDto } from './dto/query-admin-users.dto';
import { UserRole } from './entities/user.entity';
import { UserService } from './user.service';

@Controller('users')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  findAll(@Query() query: QueryAdminUsersDto) {
    return this.userService.findAllForAdmin(query.keyword, query.status);
  }

  @Post('admin/reset-password')
  resetPassword(@Body() dto: AdminResetPasswordDto) {
    return this.userService.adminResetPassword(dto.userId, dto.newPassword);
  }

  @Post('admin/update-status')
  updateStatus(@Body() dto: AdminUpdateUserStatusDto) {
    return this.userService.adminUpdateStatus(dto.userId, dto.status);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.userService.adminDelete(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }
}
