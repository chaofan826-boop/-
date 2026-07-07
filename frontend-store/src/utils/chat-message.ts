const CHAT_IMAGE_PATTERN = /^\[chat-image\]([\s\S]+?)\[\/chat-image\]$/

export const CHAT_RECALL_WINDOW_MS = 2 * 60 * 1000

export type ParsedChatMessage =
  | { type: 'text'; text: string }
  | { type: 'image'; imageUrl: string }

export type ChatSenderRole = 'admin' | 'customer'

export function buildChatImageMessage(url: string) {
  return `[chat-image]${url}[/chat-image]`
}

export function parseChatMessageContent(content: string): ParsedChatMessage {
  const match = content.match(CHAT_IMAGE_PATTERN)
  if (match?.[1]) {
    return { type: 'image', imageUrl: match[1] }
  }
  return { type: 'text', text: content }
}

export function chatMessagePreview(content: string, isRecalled = false) {
  if (isRecalled) return '[已撤回]'
  const parsed = parseChatMessageContent(content)
  return parsed.type === 'image' ? '[图片]' : content
}

export function quotePreview(content: string, isRecalled = false) {
  if (isRecalled) return '原消息已撤回'
  const parsed = parseChatMessageContent(content)
  if (parsed.type === 'image') return '[图片]'
  const text = parsed.text.trim()
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

export function replySenderLabel(senderRole: ChatSenderRole, viewerRole: ChatSenderRole) {
  if (senderRole === viewerRole) return '我'
  return senderRole === 'admin' ? '客服' : '用户'
}

export function canRecallMessage(
  message: { senderId: number; senderRole: ChatSenderRole; isRecalled: boolean; createdAt: string },
  userId: number,
  viewerRole: ChatSenderRole,
) {
  if (message.isRecalled) return false
  if (message.senderId !== userId) return false
  if (message.senderRole !== viewerRole) return false
  return Date.now() - new Date(message.createdAt).getTime() <= CHAT_RECALL_WINDOW_MS
}

export function recalledMessageText(senderRole: ChatSenderRole, viewerRole: ChatSenderRole) {
  if (senderRole === viewerRole) return '你撤回了一条消息'
  return senderRole === 'admin' ? '客服撤回了一条消息' : '对方撤回了一条消息'
}
