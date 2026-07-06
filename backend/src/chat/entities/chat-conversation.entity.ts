import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { ChatMessage } from './chat-message.entity';

export enum ConversationStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

@Entity('chat_conversations')
export class ChatConversation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'customer_id' })
  customerId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'customer_id' })
  customer: User;

  @Column({ type: 'enum', enum: ConversationStatus, default: ConversationStatus.OPEN })
  status: ConversationStatus;

  @Column({ name: 'last_message_at', type: 'datetime', nullable: true })
  lastMessageAt: Date | null;

  @Column({ name: 'admin_last_read_message_id', type: 'int', nullable: true })
  adminLastReadMessageId: number | null;

  @Column({ name: 'customer_last_read_message_id', type: 'int', nullable: true })
  customerLastReadMessageId: number | null;

  @OneToMany(() => ChatMessage, (message) => message.conversation)
  messages: ChatMessage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
