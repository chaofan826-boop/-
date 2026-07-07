import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { isAdminRole } from '../common/constants/user-roles';
import { hasAdminPermission } from '../common/constants/admin-permissions';
import { User, UserRole } from '../user/entities/user.entity';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';
import { ChatConversation, ConversationStatus } from './entities/chat-conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatQuickReply, QuickReplyStatus } from './entities/chat-quick-reply.entity';

type AuthUser = { id: number; role: UserRole; permissions?: string[] | null };

const RECALL_WINDOW_MS = 2 * 60 * 1000;

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatConversation)
    private readonly conversationRepository: Repository<ChatConversation>,
    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatQuickReply)
    private readonly quickReplyRepository: Repository<ChatQuickReply>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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

  async listConversations(keyword?: string) {
    const trimmed = keyword?.trim();
    const qb = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.customer', 'customer')
      .orderBy('conversation.lastMessageAt', 'DESC')
      .addOrderBy('conversation.id', 'DESC');

    if (trimmed) {
      if (/^\d+$/.test(trimmed)) {
        qb.andWhere(
          '(customer.id = :id OR customer.name LIKE :kw OR customer.email LIKE :kw OR customer.phone LIKE :kw)',
          { id: Number(trimmed), kw: `%${trimmed}%` },
        );
      } else {
        qb.andWhere(
          '(customer.name LIKE :kw OR customer.email LIKE :kw OR customer.phone LIKE :kw)',
          { kw: `%${trimmed}%` },
        );
      }
    }

    const conversations = await qb.getMany();

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

  async searchCustomers(keyword: string) {
    const trimmed = keyword.trim();
    if (!trimmed) {
      return [];
    }

    const qb = this.userRepository
      .createQueryBuilder('user')
      .where('user.role = :role', { role: UserRole.CUSTOMER })
      .orderBy('user.id', 'DESC')
      .take(20);

    if (/^\d+$/.test(trimmed)) {
      qb.andWhere(
        '(user.id = :id OR user.name LIKE :kw OR user.email LIKE :kw OR user.phone LIKE :kw)',
        { id: Number(trimmed), kw: `%${trimmed}%` },
      );
    } else {
      qb.andWhere('(user.name LIKE :kw OR user.email LIKE :kw OR user.phone LIKE :kw)', {
        kw: `%${trimmed}%`,
      });
    }

    const customers = await qb.getMany();
    if (!customers.length) {
      return [];
    }

    const customerIds = customers.map((customer) => customer.id);
    const conversations = await this.conversationRepository.find({
      where: { customerId: In(customerIds) },
      relations: { customer: true },
      order: { id: 'DESC' },
    });

    const conversationByCustomer = new Map<number, ChatConversation>();
    for (const conversation of conversations) {
      const existing = conversationByCustomer.get(conversation.customerId);
      if (!existing || conversation.id > existing.id) {
        conversationByCustomer.set(conversation.customerId, conversation);
      }
    }

    const conversationIds = [...conversationByCustomer.values()].map((item) => item.id);
    const unreadMap = conversationIds.length
      ? await this.loadUnreadCounts(conversationIds)
      : new Map<number, number>();

    return customers.map((customer) => {
      const conversation = conversationByCustomer.get(customer.id) ?? null;
      return {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        conversationId: conversation?.id ?? null,
        unreadCount: conversation ? unreadMap.get(conversation.id) ?? 0 : 0,
      };
    });
  }

  async getOrCreateConversationForCustomer(customerId: number) {
    const customer = await this.userRepository.findOne({ where: { id: customerId } });
    if (!customer || customer.role !== UserRole.CUSTOMER) {
      throw new NotFoundException('Customer not found');
    }

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

    const lastMessage = await this.messageRepository.findOne({
      where: { conversationId: conversation!.id },
      order: { id: 'DESC' },
    });
    const unreadCount = await this.loadUnreadCounts([conversation!.id]);

    return this.toConversationView(
      conversation!,
      lastMessage,
      unreadCount.get(conversation!.id) ?? 0,
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

    const replyMap = await this.loadReplyMessageMap(messages);

    const readState = {
      adminLastReadMessageId: conversation.adminLastReadMessageId,
      customerLastReadMessageId: conversation.customerLastReadMessageId,
    };

    const views = messages.map((message) => this.toMessageView(message, readState, replyMap));

    if (isAdminRole(user.role)) {
      await this.markAdminConversationRead(conversation.id);
    } else if (user.role === UserRole.CUSTOMER) {
      await this.markCustomerConversationRead(conversation.id);
    }

    return views;
  }

  async sendMessage(conversationId: number, user: AuthUser, dto: SendMessageDto) {
    const conversation = await this.ensureConversationAccess(conversationId, user);

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new ForbiddenException('Conversation is closed');
    }

    if (user.role === UserRole.CUSTOMER && user.id !== conversation.customerId) {
      throw new ForbiddenException('Access denied');
    }

    if (dto.replyToMessageId) {
      const replyTarget = await this.messageRepository.findOne({
        where: { id: dto.replyToMessageId, conversationId: conversation.id },
      });
      if (!replyTarget) {
        throw new BadRequestException('Reply target message not found');
      }
    }

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: conversation.id,
        senderId: user.id,
        senderRole: isAdminRole(user.role) ? UserRole.ADMIN : user.role,
        content: dto.content.trim(),
        replyToMessageId: dto.replyToMessageId ?? null,
      }),
    );

    await this.conversationRepository.update(conversation.id, {
      lastMessageAt: message.createdAt,
    });

    const replyMap = message.replyToMessageId
      ? await this.loadReplyMessageMap([message])
      : new Map<number, ChatMessage>();

    return this.toMessageView(message, {
      adminLastReadMessageId: conversation.adminLastReadMessageId,
      customerLastReadMessageId: conversation.customerLastReadMessageId,
    }, replyMap);
  }

  async recallMessage(conversationId: number, messageId: number, user: AuthUser) {
    const conversation = await this.ensureConversationAccess(conversationId, user);
    const message = await this.messageRepository.findOne({
      where: { id: messageId, conversationId: conversation.id },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.isRecalled) {
      throw new BadRequestException('Message already recalled');
    }

    if (message.senderId !== user.id) {
      throw new ForbiddenException('Only the sender can recall this message');
    }

    if (user.role === UserRole.CUSTOMER && message.senderRole !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Access denied');
    }

    if (isAdminRole(user.role) && !isAdminRole(message.senderRole)) {
      throw new ForbiddenException('Access denied');
    }

    const elapsed = Date.now() - message.createdAt.getTime();
    if (elapsed > RECALL_WINDOW_MS) {
      throw new BadRequestException('Recall window expired');
    }

    message.isRecalled = true;
    message.recalledAt = new Date();
    const saved = await this.messageRepository.save(message);

    const replyMap = saved.replyToMessageId
      ? await this.loadReplyMessageMap([saved])
      : new Map<number, ChatMessage>();

    return this.toMessageView(saved, {
      adminLastReadMessageId: conversation.adminLastReadMessageId,
      customerLastReadMessageId: conversation.customerLastReadMessageId,
    }, replyMap);
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

    if (!isAdminRole(user.role) && conversation.customerId !== user.id) {
      throw new ForbiddenException('Access denied');
    }

    if (isAdminRole(user.role) && !hasAdminPermission(user, 'chat')) {
      throw new ForbiddenException('当前账号没有客服消息权限');
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
      customerPhone: conversation.customer?.phone ?? null,
      status: conversation.status,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      unreadCount,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            content: this.toPublicMessageContent(lastMessage),
            senderRole: lastMessage.senderRole,
            createdAt: lastMessage.createdAt.toISOString(),
            isRecalled: lastMessage.isRecalled,
          }
        : null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private async loadReplyMessageMap(messages: ChatMessage[]) {
    const replyIds = [...new Set(
      messages
        .map((message) => message.replyToMessageId)
        .filter((id): id is number => typeof id === 'number'),
    )];

    if (!replyIds.length) {
      return new Map<number, ChatMessage>();
    }

    const replyMessages = await this.messageRepository.find({
      where: { id: In(replyIds) },
    });

    return new Map(replyMessages.map((message) => [message.id, message]));
  }

  private toReplyView(message: ChatMessage | undefined | null) {
    if (!message) {
      return null;
    }

    return {
      id: message.id,
      senderId: message.senderId,
      senderRole: message.senderRole,
      content: this.toPublicMessageContent(message),
      isRecalled: message.isRecalled,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private toPublicMessageContent(message: ChatMessage) {
    if (message.isRecalled) {
      return '';
    }
    return message.content;
  }

  private toMessageView(
    message: ChatMessage,
    readState?: {
      adminLastReadMessageId: number | null;
      customerLastReadMessageId: number | null;
    },
    replyMap: Map<number, ChatMessage> = new Map(),
  ) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      content: this.toPublicMessageContent(message),
      replyToMessageId: message.replyToMessageId,
      replyTo: this.toReplyView(
        message.replyToMessageId ? replyMap.get(message.replyToMessageId) : null,
      ),
      isRecalled: message.isRecalled,
      recalledAt: message.recalledAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
      isRead: this.isMessageReadByRecipient(message, readState),
    };
  }

  private isMessageReadByRecipient(
    message: ChatMessage,
    readState?: {
      adminLastReadMessageId: number | null;
      customerLastReadMessageId: number | null;
    },
  ) {
    if (!readState) return false;

    if (message.senderRole === UserRole.CUSTOMER) {
      return (
        readState.adminLastReadMessageId != null &&
        message.id <= readState.adminLastReadMessageId
      );
    }

    if (isAdminRole(message.senderRole)) {
      return (
        readState.customerLastReadMessageId != null &&
        message.id <= readState.customerLastReadMessageId
      );
    }

    return false;
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
