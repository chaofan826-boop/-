import { Controller, Get, Param, ParseIntPipe, Post, Body, Delete, Query, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AdminRoles } from '../auth/admin-roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { ProductPricingDto } from './dto/product-pricing.dto';
import { QueryPromotionDto } from './dto/query-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';
import { ProductPricingService } from './product-pricing.service';
import { PromotionService } from './promotion.service';

@Controller('promotions')
export class PromotionController {
  constructor(
    private readonly promotionService: PromotionService,
    private readonly productPricingService: ProductPricingService,
  ) {}

  @Public()
  @Post('pricing')
  quotePricing(@Body() dto: ProductPricingDto) {
    return this.productPricingService.quoteItems(dto.items, dto.currency ?? 'USD');
  }

  @Public()
  @Get()
  findAll(@Query() query: QueryPromotionDto) {
    return this.promotionService.findAll(query);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('promotions')
  @Post('create')
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionService.create(dto);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('promotions')
  @Post('update')
  update(@Body() dto: UpdatePromotionDto) {
    return this.promotionService.update(dto);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('promotions')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.promotionService.remove(id);
  }
}
