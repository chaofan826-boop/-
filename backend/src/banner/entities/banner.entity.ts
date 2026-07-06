import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BannerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface LocalizedTitle {
  zh: string;
  en: string;
}

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'json', nullable: true })
  title: LocalizedTitle | null;

  @Column({ name: 'image_url', type: 'varchar', length: 512 })
  imageUrl: string;

  @Column({ name: 'link_url', type: 'varchar', length: 512, nullable: true })
  linkUrl: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'enum', enum: BannerStatus, default: BannerStatus.ACTIVE })
  status: BannerStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date | null;
}
