import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoryModule } from '../category/category.module';
import { Merchant } from '../merchant/entities/merchant.entity';
import { ProductSku } from './entities/product-sku.entity';
import { Product } from './entities/product.entity';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { ProductSkuRepository } from './repositories/product-sku.repository';
import { ProductRepository } from './repositories/product.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductSku, Merchant]), CategoryModule],
  controllers: [ProductController],
  providers: [ProductService, ProductRepository, ProductSkuRepository],
  exports: [ProductService],
})
export class ProductModule {}
