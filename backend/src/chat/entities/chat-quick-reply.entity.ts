import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum QuickReplyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

@Entity('chat_quick_replies')
export class ChatQuickReply {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 80 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'enum', enum: QuickReplyStatus, default: QuickReplyStatus.ACTIVE })
  status: QuickReplyStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
