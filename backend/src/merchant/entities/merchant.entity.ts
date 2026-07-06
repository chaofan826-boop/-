import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from '../../product/entities/product.entity';

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'merchant_code', type: 'varchar', length: 32, unique: true })
  merchantCode: string;

  @Column({ type: 'varchar', length: 128 })
  name: string;

  @Column({ name: 'contact_email', type: 'varchar', length: 255 })
  contactEmail: string;

  @Column({ name: 'default_currency', type: 'varchar', length: 3, default: 'USD' })
  defaultCurrency: string;

  @Column({ type: 'tinyint', default: 1 })
  status: number;

  @OneToMany(() => Product, (product) => product.merchant)
  products: Product[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
