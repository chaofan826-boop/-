import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UserRole } from '../user/entities/user.entity';
import { DashboardService } from './dashboard.service';
import { HotProductsQueryDto } from './dto/hot-products-query.dto';

@Controller('dashboard')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
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
}
