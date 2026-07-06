import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('banner_settings')
export class BannerSettings {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'carousel_enabled', default: true })
  carouselEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
