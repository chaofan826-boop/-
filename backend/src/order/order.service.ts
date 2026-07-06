import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductSku } from '../product/entities/product-sku.entity';
import { ProductService } from '../product/product.service';
import { ProductPricingService } from '../promotion/product-pricing.service';
import { UserRole } from '../user/entities/user.entity';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';
import { Order, OrderStatus } from './entities/order.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly productService: ProductService,
    private readonly productPricingService: ProductPricingService,
    private readonly dataSource: DataSource,
  ) {}

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
        userId,
        totalAmount,
        shippingAddress: dto.shippingAddress,
        status: OrderStatus.PENDING,
        items: orderItems as OrderItem[],
      });

      const saved = await manager.save(order);

      const result = await manager.findOne(Order, {
        where: { id: saved.id },
        relations: { items: { product: true, productSku: true }, user: true },
      });
      if (!result) {
        throw new NotFoundException(`Order #${saved.id} not found`);
      }
      return result;
    });
  }

  findAll(userId?: number, isAdmin = false) {
    if (!isAdmin) {
      return this.orderRepository.find({
        where: { userId },
        relations: { items: { product: true, productSku: true }, user: true },
        order: { createdAt: 'DESC' },
      });
    }

    return this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.productSku', 'productSku')
      .where('user.role != :adminRole', { adminRole: UserRole.ADMIN })
      .orderBy('order.created_at', 'DESC')
      .getMany();
  }

  async findOne(id: number) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: { product: true, productSku: true }, user: true },
    });
    if (!order) throw new NotFoundException(`Order #${id} not found`);
    return order;
  }

  async updateStatus(id: number, status: OrderStatus) {
    await this.findOne(id);
    await this.orderRepository.update(id, { status });
    return this.findOne(id);
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
}
