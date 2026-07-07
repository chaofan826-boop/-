import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AddressModule } from './address/address.module';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { BannerModule } from './banner/banner.module';
import { BrowseHistoryModule } from './browse-history/browse-history.module';
import { ChatModule } from './chat/chat.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { RedisModule } from './common/redis/redis.module';
import { SeedModule } from './common/seed/seed.module';
import { CategoryModule } from './category/category.module';
import { HomeModule } from './home/home.module';
import { OrderModule } from './order/order.module';
import { PromotionModule } from './promotion/promotion.module';
import { ProductModule } from './product/product.module';
import { ShippingModule } from './shipping/shipping.module';
import { UploadModule } from './upload/upload.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 3306),
        username: config.get<string>('DB_USERNAME', 'root'),
        password: config.get<string>('DB_PASSWORD', 'root'),
        database: config.get<string>('DB_DATABASE', 'cross_border'),
        autoLoadEntities: true,
        synchronize: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    RedisModule,
    AuditModule,
    AuthModule,
    UserModule,
    AddressModule,
    CategoryModule,
    BannerModule,
    BrowseHistoryModule,
    HomeModule,
    PromotionModule,
    ProductModule,
    OrderModule,
    DashboardModule,
    ChatModule,
    ShippingModule,
    UploadModule,
    SeedModule,
  ],
})
export class AppModule {}
