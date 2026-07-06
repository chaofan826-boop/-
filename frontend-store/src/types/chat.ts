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
  unreadCount?: number
  createdAt: string
  updatedAt: string
}

export interface ChatUnreadCount {
  total: number
}

export interface SendMessagePayload {
  content: string
}
