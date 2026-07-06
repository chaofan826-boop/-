import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ProductSku } from '../product/entities/product-sku.entity';
import { ProductService } from '../product/product.service';
import { ProductPricingService } from '../promotion/product-pricing.service';
import { UserRole } from '../user/entities/user.entity';
import { Shipping } from '../shipping/entities/shipping.entity';
import { CreateOrderDto, OrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
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

  async adminUpdate(id: number, dto: UpdateOrderDto) {
    const order = await this.findOne(id);

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
        await manager.update(Order, id, updates);
      }

      const result = await manager.findOne(Order, {
        where: { id },
        relations: { items: { product: true, productSku: true }, user: true },
      });
      if (!result) {
        throw new NotFoundException(`Order #${id} not found`);
      }
      return result;
    });
  }

  async adminRemove(id: number) {
    await this.findOne(id);

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(Shipping, { orderId: id });
      await manager.delete(OrderItem, { orderId: id });
      await manager.delete(Order, { id });
    });

    return { id };
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
