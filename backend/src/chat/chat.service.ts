import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRole } from '../user/entities/user.entity';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
import { ChatConversation, ConversationStatus } from './entities/chat-conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatQuickReply, QuickReplyStatus } from './entities/chat-quick-reply.entity';

type AuthUser = { id: number; role: UserRole };

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatConversation)
    private readonly conversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatQuickReply)
    private readonly quickReplyRepository: Repository<ChatQuickReply>,
  ) {}

  async getOrCreateCustomerConversation(customerId: number) {
    let conversation = await this.conversationRepository.findOne({
      where: { customerId, status: ConversationStatus.OPEN },
      relations: { customer: true },
      order: { id: 'DESC' },
    });

    if (!conversation) {
      conversation = await this.conversationRepository.save(
        this.conversationRepository.create({
          customerId,
          status: ConversationStatus.OPEN,
        }),
      );
      conversation = await this.conversationRepository.findOne({
        where: { id: conversation.id },
        relations: { customer: true },
      });
    }

    const unreadCount = await this.countUnreadAdminMessages(
      conversation!.id,
      conversation!.customerLastReadMessageId,
    );

    return this.toConversationView(conversation!, null, unreadCount);
  }

  async getCustomerUnreadCount(customerId: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { customerId, status: ConversationStatus.OPEN },
      order: { id: 'DESC' },
    });

    if (!conversation) {
      return { total: 0 };
    }

    const total = await this.countUnreadAdminMessages(
      conversation.id,
      conversation.customerLastReadMessageId,
    );

    return { total };
  }

  async listConversations() {
    const conversations = await this.conversationRepository.find({
      relations: { customer: true },
      order: { lastMessageAt: 'DESC', id: 'DESC' },
    });

    const ids = conversations.map((item) => item.id);
    const lastMessages = ids.length ? await this.loadLastMessages(ids) : new Map<number, ChatMessage>();
    const unreadMap = ids.length ? await this.loadUnreadCounts(ids) : new Map<number, number>();

    return conversations.map((conversation) =>
      this.toConversationView(
        conversation,
        lastMessages.get(conversation.id) ?? null,
        unreadMap.get(conversation.id) ?? 0,
      ),
    );
  }

  async getAdminUnreadCount() {
    const total = await this.countAllUnreadCustomerMessages();
    return { total };
  }

  async getMessages(conversationId: number, user: AuthUser) {
    const conversation = await this.ensureConversationAccess(conversationId, user);

    const messages = await this.messageRepository.find({
      where: { conversationId: conversation.id },
      order: { id: 'ASC' },
    });

    if (user.role === UserRole.ADMIN) {
      await this.markAdminConversationRead(conversation.id);
    } else if (user.role === UserRole.CUSTOMER) {
      await this.markCustomerConversationRead(conversation.id);
    }

    return messages.map((message) => this.toMessageView(message));
  }

  async sendMessage(conversationId: number, user: AuthUser, dto: SendMessageDto) {
    const conversation = await this.ensureConversationAccess(conversationId, user);

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new ForbiddenException('Conversation is closed');
    }

    if (user.role === UserRole.CUSTOMER && user.id !== conversation.customerId) {
      throw new ForbiddenException('Access denied');
    }

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: conversation.id,
        senderId: user.id,
        senderRole: user.role,
        content: dto.content.trim(),
      }),
    );

    await this.conversationRepository.update(conversation.id, {
      lastMessageAt: message.createdAt,
    });

    return this.toMessageView(message);
  }

  listQuickReplies() {
    return this.quickReplyRepository.find({
      where: { status: QuickReplyStatus.ACTIVE },
      order: { sortOrder: 'ASC', id: 'ASC' },
    }).then((items) => items.map((item) => this.toQuickReplyView(item)));
  }

  listAllQuickReplies() {
    return this.quickReplyRepository
      .find({ order: { sortOrder: 'ASC', id: 'ASC' } })
      .then((items) => items.map((item) => this.toQuickReplyView(item)));
  }

  createQuickReply(dto: CreateQuickReplyDto) {
    return this.quickReplyRepository
      .save(
        this.quickReplyRepository.create({
          title: dto.title.trim(),
          content: dto.content.trim(),
          sortOrder: dto.sortOrder ?? 0,
          status: dto.status ?? QuickReplyStatus.ACTIVE,
        }),
      )
      .then((item) => this.toQuickReplyView(item));
  }

  async updateQuickReply(dto: UpdateQuickReplyDto) {
    const item = await this.quickReplyRepository.findOne({ where: { id: dto.id } });
    if (!item) {
      throw new NotFoundException('Quick reply not found');
    }

    if (dto.title !== undefined) item.title = dto.title.trim();
    if (dto.content !== undefined) item.content = dto.content.trim();
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) item.status = dto.status;

    return this.toQuickReplyView(await this.quickReplyRepository.save(item));
  }

  async removeQuickReply(id: number) {
    const item = await this.quickReplyRepository.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('Quick reply not found');
    }
    await this.quickReplyRepository.delete(id);
    return null;
  }

  private async ensureConversationAccess(conversationId: number, user: AuthUser) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: { customer: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (user.role !== UserRole.ADMIN && conversation.customerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    return conversation;
  }

  private async markAdminConversationRead(conversationId: number) {
    const lastMessage = await this.messageRepository.findOne({
      where: { conversationId },
      order: { id: 'DESC' },
    });

    await this.conversationRepository.update(conversationId, {
      adminLastReadMessageId: lastMessage?.id ?? null,
    });
  }

  private async markCustomerConversationRead(conversationId: number) {
    const lastMessage = await this.messageRepository.findOne({
      where: { conversationId },
      order: { id: 'DESC' },
    });

    await this.conversationRepository.update(conversationId, {
      customerLastReadMessageId: lastMessage?.id ?? null,
    });
  }

  private async countUnreadAdminMessages(conversationId: number, lastReadId: number | null) {
    const query = this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversation_id = :conversationId', { conversationId })
      .andWhere('message.sender_role = :role', { role: UserRole.ADMIN });

    if (lastReadId) {
      query.andWhere('message.id > :lastReadId', { lastReadId });
    }

    return query.getCount();
  }

  private async countAllUnreadCustomerMessages() {
    return this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.conversation', 'conversation')
      .where('message.sender_role = :role', { role: UserRole.CUSTOMER })
      .andWhere(
        '(conversation.admin_last_read_message_id IS NULL OR message.id > conversation.admin_last_read_message_id)',
      )
      .getCount();
  }

  private async loadUnreadCounts(conversationIds: number[]) {
    const rows = await this.messageRepository
      .createQueryBuilder('message')
      .innerJoin('message.conversation', 'conversation')
      .select('conversation.id', 'conversationId')
      .addSelect('COUNT(message.id)', 'count')
      .where('conversation.id IN (:...conversationIds)', { conversationIds })
      .andWhere('message.sender_role = :role', { role: UserRole.CUSTOMER })
      .andWhere(
        '(conversation.admin_last_read_message_id IS NULL OR message.id > conversation.admin_last_read_message_id)',
      )
      .groupBy('conversation.id')
      .getRawMany<{ conversationId: string; count: string }>();

    return new Map(rows.map((row) => [Number(row.conversationId), Number(row.count)]));
  }

  private async loadLastMessages(conversationIds: number[]) {
    const rows = await this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversation_id IN (:...conversationIds)', { conversationIds })
      .orderBy('message.id', 'DESC')
      .getMany();

    const map = new Map<number, ChatMessage>();
    for (const row of rows) {
      if (!map.has(row.conversationId)) {
        map.set(row.conversationId, row);
      }
    }
    return map;
  }

  private toConversationView(
    conversation: ChatConversation,
    lastMessage: ChatMessage | null = null,
    unreadCount = 0,
  ) {
    return {
      id: conversation.id,
      customerId: conversation.customerId,
      customerName: conversation.customer?.name ?? null,
      customerEmail: conversation.customer?.email ?? null,
      status: conversation.status,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      unreadCount,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: lastMessage.content,
            senderRole: lastMessage.senderRole,
            createdAt: lastMessage.createdAt.toISOString(),
          }
        : null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private toMessageView(message: ChatMessage) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private toQuickReplyView(item: ChatQuickReply) {
    return {
      id: item.id,
      title: item.title,
      content: item.content,
      sortOrder: item.sortOrder,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }
}
