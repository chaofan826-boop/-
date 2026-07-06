import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionModule } from '../promotion/promotion.module';
import { ProductModule } from '../product/product.module';
import { OrderItem } from './entities/order-item.entity';
import { Order } from './entities/order.entity';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem]), ProductModule, PromotionModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}
