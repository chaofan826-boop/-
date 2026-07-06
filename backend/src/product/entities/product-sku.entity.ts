import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

export enum SkuStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface SkuSpecValues {
  color?: string;
  size?: string;
}

export type MultiCurrencyPrices = Record<string, number>;

@Entity('product_skus')
export class ProductSku {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'merchant_id' })
  merchantId: number;

  @Column({ name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.skus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'sku_code', type: 'varchar', length: 64 })
  skuCode: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  size: string | null;

  @Column({ name: 'spec_values', type: 'json', nullable: true })
  specValues: SkuSpecValues | null;

  @Column({ type: 'json' })
  prices: MultiCurrencyPrices;

  @Column({
    type: 'int',
    unsigned: true,
    default: 0,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number | null) => Number(value ?? 0),
    },
  })
  stock: number;

  @Column({ name: 'image_url', type: 'varchar', length: 512, nullable: true })
  imageUrl: string | null;

  @Column({ type: 'enum', enum: SkuStatus, default: SkuStatus.ACTIVE })
  status: SkuStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
