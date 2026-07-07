import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AdminRoles } from '../auth/admin-roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { hasAdminPermission } from '../common/constants/admin-permissions';
import { UserRole } from '../user/entities/user.entity';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { ShippingService } from './shipping.service';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('create')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('orders')
  create(@Body() dto: CreateShippingDto) {
    return this.shippingService.create(dto);
  }

  @Get('track/:orderNo')
  track(
    @Param('orderNo') orderNo: string,
    @Request()
    req: {
      user: { id: number; role: UserRole; permissions?: string[] | null };
    },
  ) {
    const isAdmin = hasAdminPermission(req.user, 'orders');
    return this.shippingService.track(orderNo, req.user.id, isAdmin);
  }
}
