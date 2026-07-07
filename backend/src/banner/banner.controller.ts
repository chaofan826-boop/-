import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { AdminRoles } from '../auth/admin-roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { BannerService } from './banner.service';
import { BatchDeleteDto } from '../common/dto/batch-delete.dto';
import { CreateBannerDto } from './dto/create-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { UpdateBannerSettingsDto } from './dto/update-banner-settings.dto';

@Controller('banners')
export class BannerController {
  constructor(private readonly bannerService: BannerService) {}

  @Public()
  @Get()
  findAll(@Query() query: QueryBannerDto) {
    return this.bannerService.findAll(query);
  }

  @Public()
  @Get('settings')
  getSettings() {
    return this.bannerService.getSettings();
  }

  @Public()
  @Get('home')
  findHomeBanners() {
    return this.bannerService.findActiveForStore();
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('banners')
  @Post('settings/update')
  updateSettings(@Body() dto: UpdateBannerSettingsDto) {
    return this.bannerService.updateSettings(dto);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('banners')
  @Post('create')
  create(@Body() dto: CreateBannerDto) {
    return this.bannerService.create(dto);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('banners')
  @Post('update')
  update(@Body() dto: UpdateBannerDto) {
    return this.bannerService.update(dto);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('banners')
  @Post('batch-delete')
  batchRemove(@Body() dto: BatchDeleteDto) {
    return this.bannerService.removeMany(dto.ids);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bannerService.findOne(id);
  }

  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('banners')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.bannerService.remove(id);
  }
}
