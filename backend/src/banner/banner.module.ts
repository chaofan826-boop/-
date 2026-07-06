import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BannerController } from './banner.controller';
import { BannerService } from './banner.service';
import { CreateBannerDto } from './dto/create-banner.dto';
import { QueryBannerDto } from './dto/query-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';
import { UpdateBannerSettingsDto } from './dto/update-banner-settings.dto';
import { Banner } from './entities/banner.entity';
import { BannerSettings } from './entities/banner-settings.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Banner, BannerSettings])],
  controllers: [BannerController],
  providers: [BannerService],
})
export class BannerModule {}
