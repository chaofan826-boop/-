import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User, UserRole } from '../../user/entities/user.entity';

@Entity('admin_operation_logs')
@Index(['createdAt'])
@Index(['actorId', 'createdAt'])
@Index(['module', 'createdAt'])
export class AdminOperationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'actor_id' })
  actorId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'actor_id' })
  actor: User;

  @Column({ name: 'actor_name', type: 'varchar', length: 100 })
  actorName: string;

  @Column({ name: 'actor_role', type: 'enum', enum: UserRole })
  actorRole: UserRole;

  @Column({ type: 'varchar', length: 32 })
  module: string;

  @Column({ type: 'varchar', length: 32 })
  action: string;

  @Column({ type: 'varchar', length: 16 })
  method: string;

  @Column({ type: 'varchar', length: 255 })
  path: string;

  @Column({ type: 'varchar', length: 255 })
  summary: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 64, nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
