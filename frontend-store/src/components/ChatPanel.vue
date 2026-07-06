<script setup lang="ts">
import { nextTick, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getConversationMessages, getMyConversation, sendChatMessage } from '@/api/chat'
import { useUserStore } from '@/stores/user'
import type { ChatConversation, ChatMessage } from '@/types/chat'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const userStore = useUserStore()
const loading = ref(false)
const sending = ref(false)
const conversation = ref<ChatConversation | null>(null)
const messages = ref<ChatMessage[]>([])
const draft = ref('')
const listRef = ref<HTMLElement | null>(null)

let pollTimer: ReturnType<typeof setInterval> | null = null

function closePanel() {
  emit('update:visible', false)
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function scrollToBottom() {
  await nextTick()
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight
  }
}

async function loadMessages() {
  if (!conversation.value) return
  messages.value = await getConversationMessages(conversation.value.id)
  await scrollToBottom()
}

async function initChat() {
  loading.value = true
  try {
    conversation.value = await getMyConversation()
    await loadMessages()
  } catch {
    ElMessage.error('客服会话加载失败，请稍后重试')
    closePanel()
  } finally {
    loading.value = false
  }
}

async function handleSend(contentOverride?: string) {
  const content = (typeof contentOverride === 'string' ? contentOverride : draft.value).trim()
  if (!content || !conversation.value || sending.value) return

  sending.value = true
  try {
    const message = await sendChatMessage(conversation.value.id, { content })
    messages.value.push(message)
    draft.value = ''
    await scrollToBottom()
  } catch {
    ElMessage.error('发送失败，请稍后重试')
  } finally {
    sending.value = false
  }
}

function handleComposerKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  handleSend()
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(() => {
    if (props.visible && conversation.value) {
      loadMessages().catch(() => undefined)
    }
  }, 3000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(
  () => props.visible,
  async (open) => {
    if (open) {
      if (!userStore.token) {
        ElMessage.warning('请先登录后再联系客服')
        closePanel()
        return
      }
      await initChat()
      startPolling()
    } else {
      stopPolling()
    }
  },
)

onUnmounted(stopPolling)
</script>

<template>
  <el-drawer
    :model-value="visible"
    title="联系客服"
    direction="rtl"
    size="380px"
    class="chat-drawer"
    @close="closePanel"
  >
    <div v-loading="loading" class="chat-panel">
      <div class="chat-tip">
        您好，{{ userStore.user?.name || '用户' }}！如有订单、商品或售后问题，请直接留言，客服会尽快回复。
      </div>

      <div ref="listRef" class="message-list">
        <div v-if="!messages.length && !loading" class="empty-chat">暂无消息，发送第一条咨询吧</div>
        <div
          v-for="msg in messages"
          :key="msg.id"
          :class="['message-row', msg.senderRole === 'customer' ? 'mine' : 'service']"
        >
          <div class="bubble">
            <p class="content">{{ msg.content }}</p>
            <span class="time">{{ formatTime(msg.createdAt) }}</span>
          </div>
        </div>
      </div>

      <div class="composer">
        <el-input
          v-model="draft"
          type="textarea"
          :rows="3"
          maxlength="2000"
          show-word-limit
          placeholder="请输入您的问题，Enter 发送，Shift+Enter 换行"
          @keydown="handleComposerKeydown"
        />
        <el-button type="primary" :loading="sending" :disabled="!draft.trim()" @click="handleSend()">
          发送
        </el-button>
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 120px);
}

.chat-tip {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: var(--cb-radius);
  border: 1px solid var(--cb-border);
  background: rgba(201, 169, 98, 0.06);
  font-size: 13px;
  line-height: 1.6;
  color: var(--cb-text-dim);
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px 16px;
}

.empty-chat {
  padding: 32px 16px;
  text-align: center;
  color: var(--cb-text-muted);
  font-size: 13px;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-row.service {
  justify-content: flex-start;
}

.bubble {
  max-width: 82%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--cb-border);
}

.message-row.mine .bubble {
  background: rgba(201, 169, 98, 0.14);
  border-color: rgba(201, 169, 98, 0.35);
}

.message-row.service .bubble {
  background: rgba(18, 18, 22, 0.85);
}

.content {
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--cb-text);
  white-space: pre-wrap;
  word-break: break-word;
}

.time {
  display: block;
  margin-top: 6px;
  font-size: 11px;
  color: var(--cb-text-muted);
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--cb-border);
}
</style>

<style>
.chat-drawer .el-drawer__header {
  margin-bottom: 0;
  color: var(--cb-text);
}

.chat-drawer .el-drawer__body {
  padding-top: 12px;
}
</style>
