import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrderItem } from '../order/entities/order-item.entity';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { Product } from '../product/entities/product.entity';
import { STAFF_ROLES } from '../common/constants/user-roles';
import { User, UserRole } from '../user/entities/user.entity';
import { HotProductsPeriod, HotProductsQueryDto, HotProductsSortBy } from './dto/hot-products-query.dto';

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
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
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
        .andWhere('user.role NOT IN (:...staffRoles)', { staffRoles: STAFF_ROLES })
        .andWhere('order.created_at >= :start', { start: todayRange.start })
        .andWhere('order.created_at < :end', { end: todayRange.end })
        .getRawOne<{ total: string }>(),
      this.orderRepository
        .createQueryBuilder('order')
        .innerJoin('order.user', 'user')
        .select('COALESCE(SUM(order.total_amount), 0)', 'total')
        .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
        .andWhere('user.role NOT IN (:...staffRoles)', { staffRoles: STAFF_ROLES })
        .getRawOne<{ total: string }>(),
      this.orderRepository
        .createQueryBuilder('order')
        .innerJoin('order.user', 'user')
        .where('order.status = :paid', { paid: OrderStatus.PAID })
        .andWhere('user.role NOT IN (:...staffRoles)', { staffRoles: STAFF_ROLES })
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

  async getOrderTrends(query: { startDate?: string; endDate?: string } = {}) {
    const range = this.resolveTrendRange(query.startDate, query.endDate);

    const rows = await this.orderRepository
      .createQueryBuilder('order')
      .innerJoin('order.user', 'user')
      .select('DATE(order.created_at)', 'day')
      .addSelect('COUNT(DISTINCT order.user_id)', 'orderUserCount')
      .addSelect('COUNT(order.id)', 'orderCount')
      .addSelect('COALESCE(SUM(order.total_amount), 0)', 'orderAmount')
      .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('user.role NOT IN (:...staffRoles)', { staffRoles: STAFF_ROLES })
      .andWhere('order.created_at >= :start', { start: range.start })
      .andWhere('order.created_at < :end', { end: range.end })
      .groupBy('DATE(order.created_at)')
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string | Date; orderUserCount: string; orderCount: string; orderAmount: string }>();

    const rowMap = new Map<string, { orderUserCount: number; orderCount: number; orderAmount: number }>();
    for (const row of rows) {
      const dayKey = this.normalizeDayKey(row.day);
      rowMap.set(dayKey, {
        orderUserCount: Number(row.orderUserCount),
        orderCount: Number(row.orderCount),
        orderAmount: Number(Number(row.orderAmount).toFixed(2)),
      });
    }

    const dayCount = this.countDaysInclusive(range.start, range.end);
    const useShortLabel = dayCount > 31;

    const days = Array.from({ length: dayCount }, (_, index) => {
      const date = new Date(range.start);
      date.setDate(date.getDate() + index);
      const dateLabel = this.formatDay(date);
      const metrics = rowMap.get(dateLabel) ?? { orderUserCount: 0, orderCount: 0, orderAmount: 0 };
      return {
        date: dateLabel,
        label: useShortLabel ? dateLabel.slice(5) : dateLabel,
        orderUserCount: metrics.orderUserCount,
        orderCount: metrics.orderCount,
        orderAmount: metrics.orderAmount,
      };
    });

    return {
      startDate: range.start.toISOString(),
      endDate: range.end.toISOString(),
      label: range.label,
      days,
    };
  }

  async getHotProducts(query: HotProductsQueryDto) {
    const period = query.period ?? HotProductsPeriod.DAY;
    const sortBy = query.sortBy ?? HotProductsSortBy.QUANTITY;
    const range = this.resolveDateRange(period, query.date);
    const orderField = sortBy === HotProductsSortBy.REVENUE ? 'revenue' : 'quantitySold';

    const rowsQuery = this.orderItemRepository
      .createQueryBuilder('item')
      .innerJoin('item.order', 'order')
      .innerJoin('order.user', 'user')
      .innerJoin('item.product', 'product')
      .select('item.product_id', 'productId')
      .addSelect('SUM(item.quantity)', 'quantitySold')
      .addSelect('SUM(item.quantity * item.price)', 'revenue')
      .where('order.status != :cancelled', { cancelled: OrderStatus.CANCELLED })
      .andWhere('user.role NOT IN (:...staffRoles)', { staffRoles: STAFF_ROLES });

    if (period !== HotProductsPeriod.ALL) {
      rowsQuery
        .andWhere('order.created_at >= :start', { start: range.start })
        .andWhere('order.created_at < :end', { end: range.end });
    }

    const rows = await rowsQuery
      .groupBy('item.product_id')
      .orderBy(orderField, 'DESC')
      .limit(10)
      .getRawMany<{
        productId: string;
        quantitySold: string;
        revenue: string;
      }>();

    const productIds = rows.map((row) => Number(row.productId)).filter((id) => Number.isFinite(id));
    const products =
      productIds.length > 0
        ? await this.productRepository.find({ where: { id: In(productIds) } })
        : [];
    const productMap = new Map(products.map((product) => [product.id, product]));

    return {
      period,
      sortBy,
      date: range.label,
      startDate: range.start.toISOString(),
      endDate: range.end.toISOString(),
      list: rows.map((row, index) => {
        const product = productMap.get(Number(row.productId));
        return {
          rank: index + 1,
          productId: Number(row.productId),
          spuCode: product?.spuCode ?? '',
          title: product?.title ?? { zh: '未知商品', en: 'Unknown product' },
          mainImage: this.resolveProductImage(product),
          quantitySold: Number(row.quantitySold),
          revenue: Number(Number(row.revenue).toFixed(2)),
        };
      }),
    };
  }

  private resolveTrendRange(startDate?: string, endDate?: string): DateRange {
    const now = new Date();

    if (!startDate && !endDate) {
      const end = this.parseDayStart(this.formatDay(now));
      end.setDate(end.getDate() + 1);
      const start = new Date(end);
      start.setDate(start.getDate() - 7);
      const labelStart = this.formatDay(new Date(end.getTime() - 86400000 * 7));
      const labelEnd = this.formatDay(new Date(end.getTime() - 86400000));
      return { start, end, label: `${labelStart} ~ ${labelEnd}` };
    }

    if (!startDate || !endDate) {
      throw new BadRequestException('startDate and endDate must be provided together');
    }

    this.assertDayFormat(startDate);
    this.assertDayFormat(endDate);

    const start = this.parseDayStart(startDate);
    const endDay = this.parseDayStart(endDate);
    if (start.getTime() > endDay.getTime()) {
      throw new BadRequestException('startDate must be before or equal to endDate');
    }

    const end = new Date(endDay);
    end.setDate(end.getDate() + 1);

    const dayCount = this.countDaysInclusive(start, end);
    if (dayCount > 366) {
      throw new BadRequestException('Date range must not exceed 366 days');
    }

    return { start, end, label: `${startDate} ~ ${endDate}` };
  }

  private countDaysInclusive(start: Date, endExclusive: Date) {
    const startDay = this.parseDayStart(this.formatDay(start));
    const endDay = this.parseDayStart(this.formatDay(new Date(endExclusive.getTime() - 86400000)));
    const diffMs = endDay.getTime() - startDay.getTime();
    return Math.floor(diffMs / 86400000) + 1;
  }

  private resolveProductImage(product?: Product | null): string | null {
    if (!product) return null;
    if (product.mainImage) return product.mainImage;
    if (product.images?.length) return product.images[0] ?? null;
    return null;
  }

  private resolveDateRange(period: HotProductsPeriod, date?: string): DateRange {
    const now = new Date();

    if (period === HotProductsPeriod.ALL) {
      const end = this.parseDayStart(this.formatDay(now));
      end.setDate(end.getDate() + 1);
      return { start: new Date(0), end, label: '全部' };
    }

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

  private formatDay(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private normalizeDayKey(value: string | Date) {
    if (value instanceof Date) {
      return this.formatDay(value);
    }
    return value.slice(0, 10);
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
