import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('shipping_addresses')
@Index(['userId', 'isDefault'])
export class ShippingAddress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'receiver_name', type: 'varchar', length: 64 })
  receiverName: string;

  @Column({ name: 'receiver_phone', type: 'varchar', length: 32 })
  receiverPhone: string;

  @Column({ name: 'detail_address', type: 'text' })
  detailAddress: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  label: string | null;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
