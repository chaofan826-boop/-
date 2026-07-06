export type ConversationStatus = 'open' | 'closed'

export interface ChatMessage {
  id: number
  conversationId: number
  senderId: number
  senderRole: 'admin' | 'customer'
  content: string
  createdAt: string
}

export interface ChatConversation {
  id: number
  customerId: number
  customerName: string | null
  customerEmail: string | null
  status: ConversationStatus
  lastMessageAt: string | null
  lastMessage: Pick<ChatMessage, 'id' | 'content' | 'senderRole' | 'createdAt'> | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export interface SendMessagePayload {
  content: string
}

export type QuickReplyStatus = 'active' | 'inactive'

export interface ChatQuickReply {
  id: number
  title: string
  content: string
  sortOrder: number
  status: QuickReplyStatus
  createdAt: string
  updatedAt: string
}

export interface CreateQuickReplyPayload {
  title: string
  content: string
  sortOrder?: number
  status?: QuickReplyStatus
}

export interface UpdateQuickReplyPayload extends CreateQuickReplyPayload {
  id: number
}

export interface ChatUnreadCount {
  total: number
}
