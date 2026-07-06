import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../order/entities/order.entity';

export enum ShippingCarrier {
  DHL = 'DHL',
  UPS = 'UPS',
}

export enum ShippingStatus {
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
}

@Entity('shippings')
export class Shipping {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'order_id', unique: true })
  orderId: number;

  @OneToOne(() => Order)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'tracking_number', type: 'varchar', length: 64 })
  trackingNumber: string;

  @Column({ type: 'enum', enum: ShippingCarrier })
  carrier: ShippingCarrier;

  @Column({ type: 'enum', enum: ShippingStatus, default: ShippingStatus.IN_TRANSIT })
  status: ShippingStatus;

  @Column({ name: 'shipped_at', type: 'datetime', nullable: true })
  shippedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
