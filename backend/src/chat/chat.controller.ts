import { Body, Controller, Delete, ForbiddenException, Get, Param, ParseIntPipe, Post, Request, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
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
  @Roles(UserRole.ADMIN)
  listConversations() {
    return this.chatService.listConversations();
  }

  @Get('unread-count')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  getUnreadCount() {
    return this.chatService.getAdminUnreadCount();
  }

  @Get('conversations/:id/messages')
  getMessages(
    @Request() req: { user: { id: number; role: UserRole } },
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.chatService.getMessages(id, req.user);
  }

  @Post('conversations/:id/messages')
  sendMessage(
    @Request() req: { user: { id: number; role: UserRole } },
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(id, req.user, dto);
  }

  @Get('quick-replies')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listQuickReplies() {
    return this.chatService.listQuickReplies();
  }

  @Get('quick-replies/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  listAllQuickReplies() {
    return this.chatService.listAllQuickReplies();
  }

  @Post('quick-replies/create')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  createQuickReply(@Body() dto: CreateQuickReplyDto) {
    return this.chatService.createQuickReply(dto);
  }

  @Post('quick-replies/update')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateQuickReply(@Body() dto: UpdateQuickReplyDto) {
    return this.chatService.updateQuickReply(dto);
  }

  @Delete('quick-replies/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  removeQuickReply(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.removeQuickReply(id);
  }
}
