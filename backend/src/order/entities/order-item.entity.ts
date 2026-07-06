import {

  Column,

  CreateDateColumn,

  Entity,

  JoinColumn,

  ManyToOne,

  PrimaryGeneratedColumn,

} from 'typeorm';

import { ProductSku } from '../../product/entities/product-sku.entity';

import { Product } from '../../product/entities/product.entity';

import { Order } from './order.entity';



@Entity('order_items')

export class OrderItem {

  @PrimaryGeneratedColumn()

  id: number;



  @Column({ name: 'order_id' })

  orderId: number;



  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })

  @JoinColumn({ name: 'order_id' })

  order: Order;



  @Column({ name: 'product_id' })

  productId: number;



  @ManyToOne(() => Product, (product) => product.orderItems)

  @JoinColumn({ name: 'product_id' })

  product: Product;



  @Column({ name: 'product_sku_id', type: 'int', nullable: true })
  productSkuId: number | null;



  @ManyToOne(() => ProductSku, { nullable: true })

  @JoinColumn({ name: 'product_sku_id' })

  productSku: ProductSku | null;



  @Column({ type: 'int', unsigned: true, default: 1 })

  quantity: number;



  @Column({ type: 'decimal', precision: 10, scale: 2 })

  price: number;



  @CreateDateColumn({ name: 'created_at' })

  createdAt: Date;

}


