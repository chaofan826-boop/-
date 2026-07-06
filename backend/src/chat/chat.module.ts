import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatConversation } from './entities/chat-conversation.entity';
import { ChatMessage } from './entities/chat-message.entity';

import { ChatQuickReply } from './entities/chat-quick-reply.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ChatConversation, ChatMessage, ChatQuickReply])],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
