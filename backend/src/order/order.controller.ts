import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { AdminRoles } from '../auth/admin-roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { hasAdminPermission } from '../common/constants/admin-permissions';
import { UserRole } from '../user/entities/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from './entities/order.entity';
import { OrderService } from './order.service';

class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}

@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  create(@Request() req: { user: { id: number } }, @Body() dto: CreateOrderDto) {
    return this.orderService.create(req.user.id, dto);
  }

  @Get()
  findAll(
    @Request()
    req: {
      user: { id: number; role: UserRole; permissions?: string[] | null };
    },
  ) {
    const isAdmin = hasAdminPermission(req.user, 'orders');
    return this.orderService.findAll(isAdmin ? undefined : req.user.id, isAdmin);
  }

  @Get(':orderNo')
  findOne(@Param('orderNo') orderNo: string) {
    return this.orderService.findOne(orderNo);
  }

  @Patch(':orderNo/status')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('orders')
  updateStatus(@Param('orderNo') orderNo: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(orderNo, dto.status);
  }

  @Patch(':orderNo')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('orders')
  update(@Param('orderNo') orderNo: string, @Body() dto: UpdateOrderDto) {
    return this.orderService.adminUpdate(orderNo, dto);
  }

  @Delete(':orderNo')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('orders')
  remove(@Param('orderNo') orderNo: string) {
    return this.orderService.adminRemove(orderNo);
  }
}
