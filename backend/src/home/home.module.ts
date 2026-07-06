import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderItem } from '../order/entities/order-item.entity';
import { Product } from '../product/entities/product.entity';
import { Promotion } from '../promotion/entities/promotion.entity';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, Product, OrderItem])],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
