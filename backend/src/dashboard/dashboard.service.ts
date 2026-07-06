import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderItem } from '../order/entities/order-item.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { LocalizedTitle } from '../product/entities/product.entity';
import { User, UserRole } from '../user/entities/user.entity';
import { HotProductsPeriod, HotProductsQueryDto } from './dto/hot-products-query.dto';

type DateRange = { start: Date; end: Date; label: string };

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getOverview() {
    const todayRange = this.resolveDateRange(HotProductsPeriod.DAY);

    const [totalUsers, todaySalesRow, totalSalesRow, pendingShipmentCount] = await Promise.all([
      this.userRepository.count({ where: { role: UserRole.CUSTOMER } }),
      this.orderRepository
        .createQueryBuilder('order')
        .innerJoin('order.user', 'user')
        .select('COALESCE(SUM(order.total_amount), 0)', 'total')
        .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
        .andWhere('user.role != :adminRole', { adminRole: UserRole.ADMIN })
        .andWhere('order.created_at >= :start', { start: todayRange.start })
        .andWhere('order.created_at < :end', { end: todayRange.end })
        .getRawOne<{ total: string }>(),
      this.orderRepository
        .createQueryBuilder('order')
        .innerJoin('order.user', 'user')
        .select('COALESCE(SUM(order.total_amount), 0)', 'total')
        .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
        .andWhere('user.role != :adminRole', { adminRole: UserRole.ADMIN })
        .getRawOne<{ total: string }>(),
      this.orderRepository
        .createQueryBuilder('order')
        .innerJoin('order.user', 'user')
        .where('order.status = :paid', { paid: OrderStatus.PAID })
        .andWhere('user.role != :adminRole', { adminRole: UserRole.ADMIN })
        .getCount(),
    ]);

    return {
      totalUsers,
      todaySales: Number(Number(todaySalesRow?.total ?? 0).toFixed(2)),
      totalSales: Number(Number(totalSalesRow?.total ?? 0).toFixed(2)),
      pendingShipmentCount,
      date: todayRange.label,
    };
  }

  async getHotProducts(query: HotProductsQueryDto) {
    const period = query.period ?? HotProductsPeriod.DAY;
    const range = this.resolveDateRange(period, query.date);

    const rows = await this.orderItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin('order.user', 'user')
      .innerJoin('item.product', 'product')
      .select('item.product_id', 'productId')
      .addSelect('product.spu_code', 'spuCode')
      .addSelect('product.title', 'title')
      .addSelect('product.main_image', 'mainImage')
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('SUM(item.quantity * item.price)', 'revenue')
      .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('user.role != :adminRole', { adminRole: UserRole.ADMIN })
      .andWhere('order.created_at >= :start', { start: range.start })
      .andWhere('order.created_at < :end', { end: range.end })
      .groupBy('item.product_id')
      .addGroupBy('product.id')
      .addGroupBy('product.spu_code')
      .addGroupBy('product.title')
      .addGroupBy('product.main_image')
      .orderBy('quantitySold', 'DESC')
      .limit(10)
      .getRawMany<{
        productId: string;
        spuCode: string;
        title: string | LocalizedTitle;
        mainImage: string | null;
        quantitySold: string;
        revenue: string;
      }>();

    return {
      period,
      date: range.label,
      startDate: range.start.toISOString(),
      endDate: range.end.toISOString(),
      list: rows.map((row, index) => ({
        rank: index + 1,
        productId: Number(row.productId),
        spuCode: row.spuCode,
        title: this.parseTitle(row.title),
        mainImage: row.mainImage,
        quantitySold: Number(row.quantitySold),
        revenue: Number(Number(row.revenue).toFixed(2)),
      })),
    };
  }

  private resolveDateRange(period: HotProductsPeriod, date?: string): DateRange {
    const now = new Date();

    if (period === HotProductsPeriod.DAY) {
      const label = date ?? this.formatDay(now);
      this.assertDayFormat(label);
      const start = this.parseDayStart(label);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      return { start, end, label };
    }

    if (period === HotProductsPeriod.MONTH) {
      const label = date ?? this.formatMonth(now);
      this.assertMonthFormat(label);
      const [year, month] = label.split('-').map(Number);
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 1);
      return { start, end, label };
    }

    const label = date ?? String(now.getFullYear());
    this.assertYearFormat(label);
    const year = Number(label);
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return { start, end, label };
  }

  private parseTitle(value: string | LocalizedTitle): LocalizedTitle {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as LocalizedTitle;
      } catch {
        return { zh: value, en: value };
      }
    }
    return value;
  }

  private formatDay(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatMonth(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }

  private parseDayStart(label: string) {
    const [year, month, day] = label.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private assertDayFormat(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw new BadRequestException('date must be YYYY-MM-DD for day period');
    }
    const date = this.parseDayStart(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
  }

  private assertMonthFormat(value: string) {
    if (!/^\d{4}-\d{2}$/.test(value)) {
      throw new BadRequestException('date must be YYYY-MM for month period');
    }
    const [year, month] = value.split('-').map(Number);
    if (month < 1 || month > 12) {
      throw new BadRequestException('Invalid month');
    }
    if (year < 1970 || year > 9999) {
      throw new BadRequestException('Invalid year');
    }
  }

  private assertYearFormat(value: string) {
    if (!/^\d{4}$/.test(value)) {
      throw new BadRequestException('date must be YYYY for year period');
    }
    const year = Number(value);
    if (year < 1970 || year > 9999) {
      throw new BadRequestException('Invalid year');
    }
  }
}
