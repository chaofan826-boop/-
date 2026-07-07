import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserRole } from '../../user/entities/user.entity';
import { ChatConversation } from './chat-conversation.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'conversation_id' })
  conversationId: number;

  @ManyToOne(() => ChatConversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation: ChatConversation;

  @Column({ name: 'sender_id' })
  senderId: number;

  @Column({ name: 'sender_role', type: 'enum', enum: UserRole })
  senderRole: UserRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'reply_to_message_id', nullable: true })
  replyToMessageId: number | null;

  @ManyToOne(() => ChatMessage, { nullable: true })
  @JoinColumn({ name: 'reply_to_message_id' })
  replyToMessage: ChatMessage | null;

  @Column({ name: 'is_recalled', default: false })
  isRecalled: boolean;

  @Column({ name: 'recalled_at', type: 'datetime', nullable: true })
  recalledAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
