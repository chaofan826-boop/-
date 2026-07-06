import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Banner } from '../../banner/entities/banner.entity';
import { Category } from '../../category/entities/category.entity';
import { Merchant } from '../../merchant/entities/merchant.entity';
import { Promotion } from '../../promotion/entities/promotion.entity';
import { ChatQuickReply } from '../../chat/entities/chat-quick-reply.entity';
import { ProductSku } from '../../product/entities/product-sku.entity';
import { Product } from '../../product/entities/product.entity';
import { UserModule } from '../../user/user.module';
import { SeedService } from './seed.service';

@Module({
  imports: [
    UserModule,
    TypeOrmModule.forFeature([Merchant, Product, ProductSku, Category, Banner, Promotion, ChatQuickReply]),
  ],
  providers: [SeedService],
})
export class SeedModule {}