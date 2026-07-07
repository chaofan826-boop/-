import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Category } from '../../category/entities/category.entity';
import { Merchant } from '../../merchant/entities/merchant.entity';
import { OrderItem } from '../../order/entities/order-item.entity';
import { ProductSku } from './product-sku.entity';

export enum ProductStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface LocalizedTitle {
  zh: string;
  en: string;
}

export interface ProductSpecOption {
  name: string;
  values?: string[];
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'merchant_id' })
  merchantId: number;

  @ManyToOne(() => Merchant, (merchant) => merchant.products)
  @JoinColumn({ name: 'merchant_id' })
  merchant: Merchant;

  @Column({ name: 'spu_code', type: 'varchar', length: 64 })
  spuCode: string;

  @Column({ type: 'json' })
  title: LocalizedTitle;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'main_image', type: 'varchar', length: 512, nullable: true })
  mainImage: string | null;

  @Column({ type: 'json', nullable: true })
  images: string[] | null;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.DRAFT })
  status: ProductStatus;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId: number | null;

  @Column({
    name: 'sales_count',
    type: 'int',
    unsigned: true,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number | null) => Number(value ?? 0),
    },
  })
  salesCount: number;

  @Column({ name: 'spec_options', type: 'json', nullable: true })
  specOptions: ProductSpecOption[] | null;

  @ManyToOne(() => Category, (category) => category.products, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @OneToMany(() => ProductSku, (sku) => sku.product, { cascade: true })
  skus: ProductSku[];

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
