export type ChatSenderRole = 'admin' | 'customer'

export interface ChatReplyReference {
  id: number
  senderId: number
  senderRole: ChatSenderRole
  content: string
  isRecalled: boolean
  createdAt: string
}

export interface ChatMessage {
  id: number
  conversationId: number
  senderId: number
  senderRole: ChatSenderRole
  content: string
  replyToMessageId?: number | null
  replyTo?: ChatReplyReference | null
  isRecalled: boolean
  recalledAt?: string | null
  createdAt: string
  isRead: boolean
}

export interface ChatConversation {
  id: number
  customerId: number
  customerName: string | null
  customerEmail: string | null
  status: ConversationStatus
  lastMessageAt: string | null
  lastMessage: Pick<ChatMessage, 'id' | 'content' | 'senderRole' | 'createdAt' | 'isRecalled'> | null
  unreadCount?: number
  createdAt: string
  updatedAt: string
}

export type ConversationStatus = 'open' | 'closed'

export interface ChatUnreadCount {
  total: number
}

export interface SendMessagePayload {
  content: string
  replyToMessageId?: number
}
