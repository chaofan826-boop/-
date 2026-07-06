import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductSku } from '../product/entities/product-sku.entity';
import { Product } from '../product/entities/product.entity';
import { Promotion } from './entities/promotion.entity';
import { ProductPricingService } from './product-pricing.service';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, Product, ProductSku])],
  controllers: [PromotionController],
  providers: [PromotionService, ProductPricingService],
  exports: [PromotionService, ProductPricingService],
})
export class PromotionModule {}
