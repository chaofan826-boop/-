import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  Delete,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AdminRoles } from '../auth/admin-roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { QueryCouponDto } from './dto/query-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { UserCouponStatus } from './entities/user-coupon.entity';

@Controller('coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('promotions')
  @Get('admin/list')
  adminFindAll(@Query() query: QueryCouponDto) {
    return this.couponService.findAll(query);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('promotions')
  @Post('create')
  create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('promotions')
  @Post('update')
  update(@Body() dto: UpdateCouponDto) {
    return this.couponService.update(dto);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('promotions')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.couponService.remove(id);
  }

  @Public()
  @Get('claimable/home')
  findHomeClaimable(@Request() req: { user?: { id: number } }) {
    return this.couponService.findClaimable(req.user?.id, true);
  }

  @Public()
  @Get('claimable')
  findClaimable(@Request() req: { user?: { id: number } }) {
    return this.couponService.findClaimable(req.user?.id, false);
  }

  @Post(':id/claim')
  claim(@Request() req: { user: { id: number } }, @Param('id', ParseIntPipe) id: number) {
    return this.couponService.claim(req.user.id, id);
  }

  @Get('mine')
  findMine(
    @Request() req: { user: { id: number } },
    @Query('status') status?: UserCouponStatus,
  ) {
    return this.couponService.findUserCoupons(req.user.id, status);
  }
}
