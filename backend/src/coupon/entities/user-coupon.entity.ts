import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Coupon } from './coupon.entity';

export enum UserCouponStatus {
  AVAILABLE = 'available',
  USED = 'used',
  EXPIRED = 'expired',
}

@Entity('user_coupons')
export class UserCoupon {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'coupon_id' })
  couponId: number;

  @ManyToOne(() => Coupon, (coupon) => coupon.userCoupons)
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @Column({ type: 'enum', enum: UserCouponStatus, default: UserCouponStatus.AVAILABLE })
  status: UserCouponStatus;

  @Column({ name: 'claimed_at', type: 'datetime' })
  claimedAt: Date;

  @Column({ name: 'expires_at', type: 'datetime' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'datetime', nullable: true })
  usedAt: Date | null;

  @Column({ name: 'order_no', type: 'varchar', length: 32, nullable: true })
  orderNo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
