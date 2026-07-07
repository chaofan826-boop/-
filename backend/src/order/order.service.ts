import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { ProductSku } from '../product/entities/product-sku.entity';
import { ProductService } from '../product/product.service';
import { ProductPricingService } from '../promotion/product-pricing.service';
import { STAFF_ROLES } from '../common/constants/user-roles';
import { batchDeleteErrorMessage } from '../common/utils/batch-delete.util';
import { UserRole } from '../user/entities/user.entity';
import { Shipping } from '../shipping/entities/shipping.entity';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { QueryOrderDto } from './dto/query-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus, PaymentMethod } from './entities/order.entity';
import { buildPendingPayExpiresAt, PENDING_ORDER_PAY_TIMEOUT_MS } from './order.constants';
import { generateOrderNo } from './order-no.util';

@Injectable()
export class OrderService implements OnModuleInit {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly productService: ProductService,
    private readonly productPricingService: ProductPricingService,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit() {
    await this.backfillOrderNumbers();
    await this.ensureOrderNoIndex();
    await this.backfillPayExpiresAt();
  }

  async create(userId: number, dto: CreateOrderDto) {
    const mergedItems = this.mergeOrderItems(dto.items);

    return this.dataSource.transaction(async (manager) => {
      let totalAmount = 0;
      const orderItems: Partial<OrderItem>[] = [];

      const pricingInputs: { productId: number; productSkuId: number }[] = [];
      const skuRecords: ProductSku[] = [];

      for (const item of mergedItems) {
        const sku = await manager.findOne(ProductSku, { where: { id: item.productSkuId } });
        if (!sku) {
          throw new NotFoundException(`SKU #${item.productSkuId} not found`);
        }
        skuRecords.push(sku);
        pricingInputs.push({ productId: sku.productId, productSkuId: sku.id });
      }

      const currency = mergedItems[0]?.currency ?? 'USD';
      const pricingList = await this.productPricingService.quoteItems(pricingInputs, currency);
      const pricingMap = new Map(pricingList.map((row) => [row.productSkuId, row]));

      mergedItems.forEach((item, index) => {
        const sku = skuRecords[index];
        const pricing = pricingMap.get(item.productSkuId);
        const price = pricing?.salePrice ?? this.productService.getSkuPrice(sku, currency);

        totalAmount += price * item.quantity;
        orderItems.push({
          productId: sku.productId,
          productSkuId: sku.id,
          quantity: item.quantity,
          price,
        });
      });

      for (let i = 0; i < mergedItems.length; i++) {
        const item = mergedItems[i];
        const sku = skuRecords[i];
        await this.productService.deductStock(item.productSkuId, item.quantity, manager);
        await this.productService.incrementSalesCount(sku.productId, item.quantity, manager);
      }

      const order = manager.create(Order, {
        orderNo: await this.createUniqueOrderNo(manager.getRepository(Order)),
        userId,
        totalAmount,
        shippingAddress: dto.shippingAddress,
        status: OrderStatus.PENDING,
        payExpiresAt: buildPendingPayExpiresAt(),
        items: orderItems as OrderItem[],
      });

      const saved = await manager.save(order);

      const result = await manager.findOne(Order, {
        where: { id: saved.id },
        relations: { items: { product: true, productSku: true }, user: true },
      });
      if (!result) {
        throw new NotFoundException(`Order ${saved.orderNo} not found`);
      }
      return result;
    });
  }

  async findAll(userId?: number, isAdmin = false, query?: QueryOrderDto) {
    await this.expirePendingOrders(isAdmin ? undefined : userId);

    if (!isAdmin) {
      return this.orderRepository.find({
        where: { userId },
        relations: { items: { product: true, productSku: true }, user: true },
        order: { createdAt: 'DESC' },
      });
    }

    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.productSku', 'productSku')
      .where('user.role NOT IN (:...staffRoles)', { staffRoles: STAFF_ROLES });

    if (query?.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    if (query?.paymentMethod) {
      qb.andWhere('order.payment_method = :paymentMethod', { paymentMethod: query.paymentMethod });
    }

    if (query?.keyword?.trim()) {
      const keyword = `%${query.keyword.trim()}%`;
      qb.andWhere(
        `(order.order_no LIKE :keyword
          OR user.name LIKE :keyword
          OR user.email LIKE :keyword
          OR order.shipping_address LIKE :keyword
          OR JSON_UNQUOTE(JSON_EXTRACT(product.title, '$.zh')) LIKE :keyword
          OR JSON_UNQUOTE(JSON_EXTRACT(product.title, '$.en')) LIKE :keyword)`,
        { keyword },
      );
    }

    if (query?.startDate) {
      qb.andWhere('order.created_at >= :startDate', { startDate: query.startDate });
    }

    if (query?.endDate) {
      const endDate = new Date(query.endDate);
      endDate.setDate(endDate.getDate() + 1);
      qb.andWhere('order.created_at < :endDateExclusive', { endDateExclusive: endDate.toISOString() });
    }

    return qb.orderBy('order.created_at', 'DESC').getMany();
  }

  async findOne(orderNo: string) {
    const order = await this.orderRepository.findOne({
      where: { orderNo },
      relations: { items: { product: true, productSku: true }, user: true },
    });
    if (!order) throw new NotFoundException(`Order ${orderNo} not found`);

    if (order.status === OrderStatus.PENDING && this.isPayExpired(order)) {
      await this.cancelPendingOrderInternal(order);
      order.status = OrderStatus.CANCELLED;
    }

    return order;
  }

  async updateStatus(orderNo: string, status: OrderStatus) {
    const order = await this.findOne(orderNo);
    await this.orderRepository.update(order.id, { status });
    return this.findOne(orderNo);
  }

  async pay(userId: number, orderNo: string, paymentMethod: PaymentMethod) {
    const order = await this.findOne(orderNo);
    if (order.userId !== userId) {
      throw new ForbiddenException('You can only pay your own orders');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be paid');
    }
    if (this.isPayExpired(order)) {
      await this.cancelPendingOrderInternal(order);
      throw new BadRequestException('Order payment window has expired');
    }

    await this.orderRepository.update(order.id, {
      status: OrderStatus.PAID,
      paymentMethod,
      payExpiresAt: null,
    });
    return this.findOne(orderNo);
  }

  async userCancel(userId: number, orderNo: string) {
    const order = await this.findOne(orderNo);
    if (order.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException('Only pending orders can be cancelled');
    }

    await this.cancelPendingOrderInternal(order);
    return this.findOne(orderNo);
  }

  async adminUpdate(orderNo: string, dto: UpdateOrderDto) {
    const order = await this.findOne(orderNo);

    if (!dto.shippingAddress && !dto.status && !dto.items) {
      throw new BadRequestException('No fields to update');
    }

    return this.dataSource.transaction(async (manager) => {
      const updates: Partial<Order> = {};

      if (dto.shippingAddress !== undefined) {
        updates.shippingAddress = dto.shippingAddress;
      }
      if (dto.status !== undefined) {
        updates.status = dto.status;
      }

      if (dto.items) {
        const orderItemIds = new Set(order.items.map((item) => item.id));
        if (dto.items.length !== order.items.length) {
          throw new BadRequestException('Cannot add or remove order items from admin edit');
        }

        let totalAmount = 0;
        for (const item of dto.items) {
          if (!orderItemIds.has(item.id)) {
            throw new NotFoundException(`Order item #${item.id} not found`);
          }
          await manager.update(OrderItem, item.id, {
            quantity: item.quantity,
            price: item.price,
          });
          totalAmount += item.quantity * item.price;
        }
        updates.totalAmount = totalAmount;
      }

      if (Object.keys(updates).length > 0) {
        await manager.update(Order, order.id, updates);
      }

      const result = await manager.findOne(Order, {
        where: { id: order.id },
        relations: { items: { product: true, productSku: true }, user: true },
      });
      if (!result) {
        throw new NotFoundException(`Order ${orderNo} not found`);
      }
      return result;
    });
  }

  async adminRemove(orderNo: string) {
    const order = await this.findOne(orderNo);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Shipping, { orderId: order.id });
      await manager.delete(OrderItem, { orderId: order.id });
      await manager.delete(Order, { id: order.id });
    });

    return { orderNo };
  }

  async userRemove(userId: number, orderNo: string) {
    const order = await this.findOne(orderNo);
    if (order.userId !== userId) {
      throw new ForbiddenException('You can only delete your own orders');
    }
    if (order.status !== OrderStatus.COMPLETED && order.status !== OrderStatus.CANCELLED) {
      throw new BadRequestException('Only completed or cancelled orders can be deleted');
    }

    return this.adminRemove(orderNo);
  }

  async adminRemoveMany(orderNos: string[]) {
    const deleted: string[] = [];
    const failed: Array<{ orderNo: string; reason: string }> = [];

    for (const orderNo of orderNos) {
      try {
        await this.adminRemove(orderNo);
        deleted.push(orderNo);
      } catch (error) {
        failed.push({ orderNo, reason: batchDeleteErrorMessage(error) });
      }
    }

    return { deleted, failed };
  }

  /** Merge duplicate SKU lines so stock checks use aggregated quantity. */
  private mergeOrderItems(items: OrderItemDto[]): OrderItemDto[] {
    const map = new Map<number, OrderItemDto>();

    for (const item of items) {
      const existing = map.get(item.productSkuId);
      if (existing) {
        existing.quantity += item.quantity;
        if (!existing.currency && item.currency) {
          existing.currency = item.currency;
        }
      } else {
        map.set(item.productSkuId, { ...item });
      }
    }

    return [...map.values()];
  }

  private resolvePayExpiresAt(order: Order) {
    if (order.payExpiresAt) {
      return new Date(order.payExpiresAt);
    }
    return new Date(new Date(order.createdAt).getTime() + PENDING_ORDER_PAY_TIMEOUT_MS);
  }

  private isPayExpired(order: Order) {
    return this.resolvePayExpiresAt(order).getTime() <= Date.now();
  }

  private async expirePendingOrders(userId?: number) {
    const qb = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.status = :status', { status: OrderStatus.PENDING });

    if (userId) {
      qb.andWhere('order.user_id = :userId', { userId });
    }

    const pendingOrders = await qb.getMany();
    const expiredOrders = pendingOrders.filter((order) => this.isPayExpired(order));

    for (const order of expiredOrders) {
      try {
        await this.cancelPendingOrderInternal(order);
      } catch (error) {
        this.logger.warn(`Failed to expire pending order ${order.orderNo}: ${String(error)}`);
      }
    }
  }

  private async cancelPendingOrderInternal(order: Order) {
    if (order.status !== OrderStatus.PENDING) return;

    await this.dataSource.transaction(async (manager) => {
      const items = order.items?.length
        ? order.items
        : await manager.find(OrderItem, { where: { orderId: order.id } });

      for (const item of items) {
        if (!item.productSkuId) continue;
        await this.productService.restoreStock(item.productSkuId, item.quantity, manager);
        await this.productService.decrementSalesCount(item.productId, item.quantity, manager);
      }

      await manager.update(Order, order.id, {
        status: OrderStatus.CANCELLED,
        payExpiresAt: null,
      });
    });
  }

  private async backfillPayExpiresAt() {
    const pendingOrders = await this.orderRepository.find({
      where: { status: OrderStatus.PENDING, payExpiresAt: IsNull() },
    });

    for (const order of pendingOrders) {
      await this.orderRepository.update(order.id, {
        payExpiresAt: buildPendingPayExpiresAt(order.createdAt),
      });
    }
  }

  private async backfillOrderNumbers() {
    const orders = await this.orderRepository.find({
      where: [{ orderNo: IsNull() }, { orderNo: '' }],
    });

    for (const order of orders) {
      await this.orderRepository.update(order.id, {
        orderNo: await this.createUniqueOrderNo(this.orderRepository),
      });
    }
  }

  private async ensureOrderNoIndex() {
    const rows = await this.dataSource.query(
      `SELECT INDEX_NAME
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'orders'
         AND COLUMN_NAME = 'order_no'
         AND NON_UNIQUE = 0
       LIMIT 1`,
    );

    if (rows.length > 0) return;

    try {
      await this.dataSource.query('CREATE UNIQUE INDEX IDX_orders_order_no ON orders (order_no)');
    } catch (error) {
      this.logger.warn(`Unable to create unique index on orders.order_no: ${String(error)}`);
    }
  }

  private async createUniqueOrderNo(repository: Repository<Order>) {
    for (let attempt = 0; attempt < 5; attempt++) {
      const orderNo = generateOrderNo();
      const existing = await repository.findOne({ where: { orderNo } });
      if (!existing) return orderNo;
    }

    throw new BadRequestException('Failed to generate unique order number');
  }
}
