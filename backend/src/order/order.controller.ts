import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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
import { BatchDeleteOrdersDto } from './dto/batch-delete-orders.dto';
import { PayOrderDto } from './dto/pay-order.dto';
import { PreviewOrderCouponsDto } from './dto/preview-order-coupons.dto';
import { QueryOrderDto } from './dto/query-order.dto';
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
    @Query() query: QueryOrderDto,
  ) {
    const isAdmin = hasAdminPermission(req.user, 'orders');
    return this.orderService.findAll(
      isAdmin ? undefined : req.user.id,
      isAdmin,
      isAdmin ? query : undefined,
    );
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('orders')
  @Post('batch-delete')
  batchRemove(@Body() dto: BatchDeleteOrdersDto) {
    return this.orderService.adminRemoveMany(dto.orderNos);
  }

  @Post('preview-coupons')
  previewCoupons(
    @Request() req: { user: { id: number } },
    @Body() dto: PreviewOrderCouponsDto,
  ) {
    return this.orderService.previewApplicableCoupons(req.user.id, dto);
  }

  @Get(':orderNo/applicable-coupons')
  findApplicableCoupons(
    @Request() req: { user: { id: number } },
    @Param('orderNo') orderNo: string,
  ) {
    return this.orderService.findApplicableCoupons(req.user.id, orderNo);
  }

  @Get(':orderNo')
  findOne(@Param('orderNo') orderNo: string) {
    return this.orderService.findOne(orderNo);
  }

  @Post(':orderNo/cancel')
  cancel(@Request() req: { user: { id: number } }, @Param('orderNo') orderNo: string) {
    return this.orderService.userCancel(req.user.id, orderNo);
  }

  @Post(':orderNo/pay')
  pay(
    @Request() req: { user: { id: number } },
    @Param('orderNo') orderNo: string,
    @Body() dto: PayOrderDto,
  ) {
    return this.orderService.pay(req.user.id, orderNo, dto.paymentMethod, dto.userCouponId);
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
  remove(
    @Request()
    req: {
      user: { id: number; role: UserRole; permissions?: string[] | null };
    },
    @Param('orderNo') orderNo: string,
  ) {
    if (hasAdminPermission(req.user, 'orders')) {
      return this.orderService.adminRemove(orderNo);
    }
    return this.orderService.userRemove(req.user.id, orderNo);
  }
}
