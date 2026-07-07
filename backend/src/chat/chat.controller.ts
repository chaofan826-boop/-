import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { AdminRoles } from '../auth/admin-roles.decorator';
import { RequirePermissions } from '../auth/permissions.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { hasAdminPermission } from '../common/constants/admin-permissions';
import { isAdminRole } from '../common/constants/user-roles';
import { UserRole } from '../user/entities/user.entity';
import { ChatService } from './chat.service';
import { CreateQuickReplyDto } from './dto/create-quick-reply.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateQuickReplyDto } from './dto/update-quick-reply.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversation/mine/unread-count')
  getMyUnreadCount(@Request() req: { user: { id: number; role: UserRole } }) {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can access customer unread count');
    }
    return this.chatService.getCustomerUnreadCount(req.user.id);
  }

  @Get('conversation/mine')
  getMyConversation(@Request() req: { user: { id: number; role: UserRole } }) {
    if (req.user.role !== UserRole.CUSTOMER) {
      throw new ForbiddenException('Only customers can open customer service chat');
    }
    return this.chatService.getOrCreateCustomerConversation(req.user.id);
  }

  @Get('conversations')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('chat')
  listConversations() {
    return this.chatService.listConversations();
  }

  @Get('unread-count')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('chat')
  getUnreadCount() {
    return this.chatService.getAdminUnreadCount();
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Request()
    req: {
      user: { id: number; role: UserRole; permissions?: string[] | null };
    },
    @Param('id', ParseIntPipe) id: number,
  ) {
    this.assertChatAccess(req.user);
    return this.chatService.getMessages(id, req.user);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Request()
    req: {
      user: { id: number; role: UserRole; permissions?: string[] | null };
    },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    this.assertChatAccess(req.user);
    return this.chatService.sendMessage(id, req.user, dto);
  }

  @Get('quick-replies')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('chat')
  listQuickReplies() {
    return this.chatService.listQuickReplies();
  }

  @Get('quick-replies/all')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('chat')
  listAllQuickReplies() {
    return this.chatService.listAllQuickReplies();
  }

  @Post('quick-replies/create')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('chat')
  createQuickReply(@Body() dto: CreateQuickReplyDto) {
    return this.chatService.createQuickReply(dto);
  }

  @Post('quick-replies/update')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('chat')
  updateQuickReply(@Body() dto: UpdateQuickReplyDto) {
    return this.chatService.updateQuickReply(dto);
  }

  @Delete('quick-replies/:id')
  @UseGuards(RolesGuard)
  @AdminRoles()
  @RequirePermissions('chat')
  removeQuickReply(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.removeQuickReply(id);
  }

  private assertChatAccess(user: {
    role: UserRole;
    permissions?: string[] | null;
  }) {
    if (isAdminRole(user.role) && !hasAdminPermission(user, 'chat')) {
      throw new ForbiddenException('当前账号没有客服消息权限');
    }
  }
}
