import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../order/entities/order.entity';
import { CreateShippingDto } from './dto/create-shipping.dto';
import {
  Shipping,
  ShippingCarrier,
  ShippingStatus,
} from './entities/shipping.entity';

export interface TrackingEvent {
  time: string;
  location: string;
  description: string;
  status: string;
}

@Injectable()
export class ShippingService {
  constructor(
    @InjectRepository(Shipping)
    private readonly shippingRepository: Repository<Shipping>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(dto: CreateShippingDto) {
    const order = await this.orderRepository.findOne({ where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException(`Order #${dto.orderId} not found`);
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot ship a cancelled order');
    }
    if (order.status !== OrderStatus.PAID && order.status !== OrderStatus.SHIPPED) {
      throw new BadRequestException('Order must be paid before shipping');
    }

    const existing = await this.shippingRepository.findOne({ where: { orderId: dto.orderId } });
    if (existing) {
      throw new ConflictException(`Order #${dto.orderId} already has shipping info`);
    }

    const shippedAt = new Date();
    const shipping = this.shippingRepository.create({
      orderId: dto.orderId,
      trackingNumber: dto.trackingNumber.trim(),
      carrier: dto.carrier,
      status: ShippingStatus.IN_TRANSIT,
      shippedAt,
    });

    await this.shippingRepository.save(shipping);

    if (order.status === OrderStatus.PAID) {
      await this.orderRepository.update(dto.orderId, { status: OrderStatus.SHIPPED });
    }

    return this.findByOrderId(dto.orderId);
  }

  async track(orderId: number, userId: number, isAdmin: boolean) {
    const shipping = await this.shippingRepository.findOne({
      where: { orderId },
      relations: { order: true },
    });

    if (!shipping) {
      throw new NotFoundException(`Shipping for order #${orderId} not found`);
    }

    if (!isAdmin && shipping.order.userId !== userId) {
      throw new ForbiddenException('You can only track your own orders');
    }

    return {
      orderId: shipping.orderId,
      trackingNumber: shipping.trackingNumber,
      carrier: shipping.carrier,
      status: shipping.status,
      shippedAt: shipping.shippedAt,
      events: this.buildMockTrackingEvents(shipping),
    };
  }

  async findByOrderId(orderId: number) {
    const shipping = await this.shippingRepository.findOne({ where: { orderId } });
    if (!shipping) {
      throw new NotFoundException(`Shipping for order #${orderId} not found`);
    }
    return shipping;
  }

  private buildMockTrackingEvents(shipping: Shipping): TrackingEvent[] {
    const base = shipping.shippedAt ?? shipping.createdAt;
    const carrierHub =
      shipping.carrier === ShippingCarrier.DHL ? 'DHL Express Hub' : 'UPS Sorting Center';
    const destCity = 'Los Angeles, US';

    const events: TrackingEvent[] = [
      {
        time: this.offsetTime(base, 0),
        location: 'Shenzhen, CN',
        description: 'Package picked up by carrier',
        status: 'picked_up',
      },
      {
        time: this.offsetTime(base, 8),
        location: 'Hong Kong, CN',
        description: 'Departed origin facility',
        status: 'in_transit',
      },
      {
        time: this.offsetTime(base, 24),
        location: carrierHub,
        description: 'Arrived at international hub',
        status: 'in_transit',
      },
      {
        time: this.offsetTime(base, 48),
        location: 'San Francisco, US',
        description: 'Customs clearance completed',
        status: 'in_transit',
      },
      {
        time: this.offsetTime(base, 72),
        location: destCity,
        description: 'Out for delivery',
        status: 'out_for_delivery',
      },
    ];

    if (shipping.status === ShippingStatus.DELIVERED) {
      events.push({
        time: this.offsetTime(base, 80),
        location: destCity,
        description: 'Delivered — signed by recipient',
        status: 'delivered',
      });
    }

    return events.reverse();
  }

  private offsetTime(base: Date, hours: number) {
    const date = new Date(base.getTime() + hours * 3600 * 1000);
    return date.toISOString();
  }
}
