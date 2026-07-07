import type {
  ChatConversation,
  ChatCustomerSearchResult,
  ChatMessage,
  ChatQuickReply,
  ChatUnreadCount,
  CreateQuickReplyPayload,
  SendMessagePayload,
  UpdateQuickReplyPayload,
} from '@/types/chat'
import { del, get, post } from './request'

export const getChatConversations = (params?: { keyword?: string }) =>
  get<ChatConversation[]>('/chat/conversations', { params })

export const searchChatCustomers = (keyword: string) =>
  get<ChatCustomerSearchResult[]>('/chat/customers/search', { params: { keyword } })

export const getConversationByCustomer = (customerId: number) =>
  get<ChatConversation>(`/chat/conversations/customer/${customerId}`)

export const getChatUnreadCount = () => get<ChatUnreadCount>('/chat/unread-count')

export const getConversationMessages = (conversationId: number) =>
  get<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`)

export const sendChatMessage = (conversationId: number, data: SendMessagePayload) =>
  post<ChatMessage>(`/chat/conversations/${conversationId}/messages`, data)

export const recallChatMessage = (conversationId: number, messageId: number) =>
  post<ChatMessage>(`/chat/conversations/${conversationId}/messages/${messageId}/recall`)

export const getQuickReplies = () => get<ChatQuickReply[]>('/chat/quick-replies')

export const getAllQuickReplies = () => get<ChatQuickReply[]>('/chat/quick-replies/all')

export const createQuickReply = (data: CreateQuickReplyPayload) =>
  post<ChatQuickReply>('/chat/quick-replies/create', data)

export const updateQuickReply = (data: UpdateQuickReplyPayload) =>
  post<ChatQuickReply>('/chat/quick-replies/update', data)

export const deleteQuickReply = (id: number) => del<null>(`/chat/quick-replies/${id}`)
