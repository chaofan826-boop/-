import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminRoles } from '../auth/admin-roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { DashboardService } from './dashboard.service';
import { HotProductsQueryDto } from './dto/hot-products-query.dto';
import { OrderTrendsQueryDto } from './dto/order-trends-query.dto';

@Controller('dashboard')
@UseGuards(RolesGuard)
@AdminRoles()
@RequirePermissions('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('hot-products')
  getHotProducts(@Query() query: HotProductsQueryDto) {
    return this.dashboardService.getHotProducts(query);
  }

  @Get('order-trends')
  getOrderTrends(@Query() query: OrderTrendsQueryDto) {
    return this.dashboardService.getOrderTrends(query);
  }
}
