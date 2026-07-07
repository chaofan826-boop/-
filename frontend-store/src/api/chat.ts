import type { ChatConversation, ChatMessage, ChatUnreadCount, SendMessagePayload } from '@/types/chat'
import { get, post } from './request'

export const getMyConversation = () => get<ChatConversation>('/chat/conversation/mine')

export const getChatUnreadCount = () => get<ChatUnreadCount>('/chat/conversation/mine/unread-count')

export const getConversationMessages = (conversationId: number) =>
  get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`)

export const sendChatMessage = (conversationId: number, data: SendMessagePayload) =>
  post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, data)

export const recallChatMessage = (conversationId: number, messageId: number) =>
  post<ChatMessage>(`/chat/conversations/${conversationId}/messages/${messageId}/recall`)
