import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserCoupon } from './user-coupon.entity';

export enum CouponStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface LocalizedTitle {
  zh: string;
  en: string;
}

export interface CouponAmounts {
  USD?: number;
  CNY?: number;
}

@Entity('coupons')
export class Coupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'json' })
  title: LocalizedTitle;

  @Column({ name: 'discount_amounts', type: 'json' })
  discountAmounts: CouponAmounts;

  @Column({ name: 'min_order_amounts', type: 'json', nullable: true })
  minOrderAmounts: CouponAmounts | null;

  @Column({ name: 'category_ids', type: 'json', nullable: true })
  categoryIds: number[] | null;

  @Column({ name: 'total_quantity', type: 'int', nullable: true })
  totalQuantity: number | null;

  @Column({ name: 'claimed_count', type: 'int', default: 0 })
  claimedCount: number;

  @Column({ name: 'per_user_limit', type: 'int', default: 1 })
  perUserLimit: number;

  @Column({ name: 'claim_start_at', type: 'datetime' })
  claimStartAt: Date;

  @Column({ name: 'claim_end_at', type: 'datetime' })
  claimEndAt: Date;

  @Column({ name: 'validity_days', type: 'int', default: 7 })
  validityDays: number;

  @Column({ name: 'show_on_home', type: 'boolean', default: true })
  showOnHome: boolean;

  @Column({ type: 'enum', enum: CouponStatus, default: CouponStatus.ACTIVE })
  status: CouponStatus;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @OneToMany(() => UserCoupon, (userCoupon) => userCoupon.coupon)
  userCoupons: UserCoupon[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
