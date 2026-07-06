import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PromotionType {
  FEATURED = 'featured',
  FLASH_SALE = 'flash_sale',
  DISCOUNT = 'discount',
}

export enum PromotionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface LocalizedTitle {
  zh: string;
  en: string;
}

export type ProductSalePrices = Record<string, { USD?: number; CNY?: number }>;

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'enum', enum: PromotionType })
  type: PromotionType;

  @Column({ type: 'json' })
  title: LocalizedTitle;

  @Column({ type: 'json', nullable: true })
  subtitle: LocalizedTitle | null;

  @Column({ name: 'discount_percent', type: 'int', default: 0 })
  discountPercent: number;

  @Column({ name: 'product_ids', type: 'json' })
  productIds: number[];

  @Column({ name: 'sale_prices', type: 'json', nullable: true })
  salePrices: ProductSalePrices | null;

  @Column({ name: 'flash_stock', type: 'int', nullable: true })
  flashStock: number | null;

  @Column({ name: 'start_at', type: 'datetime' })
  startAt: Date;

  @Column({ name: 'end_at', type: 'datetime' })
  endAt: Date;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'enum', enum: PromotionStatus, default: PromotionStatus.ACTIVE })
  status: PromotionStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
