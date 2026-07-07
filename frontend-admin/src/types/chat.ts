export type ConversationStatus = 'open' | 'closed'
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
  customerPhone?: string | null
  status: ConversationStatus
  lastMessageAt: string | null
  lastMessage: Pick<ChatMessage, 'id' | 'content' | 'senderRole' | 'createdAt' | 'isRecalled'> | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export interface ChatCustomerSearchResult {
  id: number
  name: string
  email: string | null
  phone: string | null
  conversationId: number | null
  unreadCount: number
}

export interface SendMessagePayload {
  content: string
  replyToMessageId?: number
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
