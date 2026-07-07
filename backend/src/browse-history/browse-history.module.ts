import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductModule } from '../product/product.module';
import { BrowseHistoryController } from './browse-history.controller';
import { BrowseHistoryService } from './browse-history.service';
import { ProductBrowseHistory } from './entities/product-browse-history.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductBrowseHistory]), ProductModule],
  controllers: [BrowseHistoryController],
  providers: [BrowseHistoryService],
})
export class BrowseHistoryModule {}
