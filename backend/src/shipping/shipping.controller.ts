import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../user/entities/user.entity';
import { CreateShippingDto } from './dto/create-shipping.dto';
import { ShippingService } from './shipping.service';

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('create')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateShippingDto) {
    return this.shippingService.create(dto);
  }

  @Get('track/:orderNo')
  track(
    @Param('orderNo') orderNo: string,
    @Request() req: { user: { id: number; role: UserRole } },
  ) {
    const isAdmin = req.user.role === UserRole.ADMIN;
    return this.shippingService.track(orderNo, req.user.id, isAdmin);
  }
}
