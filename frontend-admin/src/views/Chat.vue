<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  createQuickReply,
  deleteQuickReply,
  getAllQuickReplies,
  getChatConversations,
  getConversationMessages,
  getQuickReplies,
  sendChatMessage,
  updateQuickReply,
} from '@/api/chat'
import type { ChatConversation, ChatMessage, ChatQuickReply } from '@/types/chat'

const loadingList = ref(false)
const loadingMessages = ref(false)
const sending = ref(false)
const conversations = ref<ChatConversation[]>([])
const activeId = ref<number | null>(null)
const messages = ref<ChatMessage[]>([])
const draft = ref('')
const listRef = ref<HTMLElement | null>(null)
const quickReplies = ref<ChatQuickReply[]>([])

const scriptDialogVisible = ref(false)
const scriptLoading = ref(false)
const scriptSubmitLoading = ref(false)
const allScripts = ref<ChatQuickReply[]>([])
const editingScriptId = ref<number | null>(null)
const scriptForm = reactive({
  title: '',
  content: '',
  sortOrder: 0,
  status: 'active' as 'active' | 'inactive',
})

let pollTimer: ReturnType<typeof setInterval> | null = null

const activeConversation = ref<ChatConversation | null>(null)
function formatTime(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function previewText(conversation: ChatConversation) {
  if (!conversation.lastMessage) return '暂无消息'
  const prefix = conversation.lastMessage.senderRole === 'admin' ? '客服: ' : '用户: '
  return prefix + conversation.lastMessage.content
}

async function scrollToBottom() {
  await nextTick()
  if (listRef.value) {
    listRef.value.scrollTop = listRef.value.scrollHeight
  }
}

async function loadConversations() {
  loadingList.value = true
  try {
    conversations.value = await getChatConversations()
    if (!activeId.value && conversations.value.length) {
      await selectConversation(conversations.value[0].id)
    } else if (activeId.value) {
      activeConversation.value =
        conversations.value.find((item) => item.id === activeId.value) ?? null
    }
  } finally {
    loadingList.value = false
  }
}

async function loadMessages() {
  if (!activeId.value) return
  loadingMessages.value = true
  try {
    messages.value = await getConversationMessages(activeId.value)
    await scrollToBottom()
  } finally {
    loadingMessages.value = false
  }
}

async function selectConversation(id: number) {
  activeId.value = id
  activeConversation.value = conversations.value.find((item) => item.id === id) ?? null
  await loadMessages()
}

async function loadQuickReplies() {
  quickReplies.value = await getQuickReplies()
}

async function loadAllScripts() {
  scriptLoading.value = true
  try {
    allScripts.value = await getAllQuickReplies()
  } finally {
    scriptLoading.value = false
  }
}

function resetScriptForm() {
  editingScriptId.value = null
  Object.assign(scriptForm, {
    title: '',
    content: '',
    sortOrder: 0,
    status: 'active' as const,
  })
}

function openScriptDialog() {
  resetScriptForm()
  scriptDialogVisible.value = true
  loadAllScripts()
}

function openEditScript(row: ChatQuickReply) {
  editingScriptId.value = row.id
  Object.assign(scriptForm, {
    title: row.title,
    content: row.content,
    sortOrder: row.sortOrder,
    status: row.status,
  })
}

async function handleSaveScript() {
  if (!scriptForm.title.trim() || !scriptForm.content.trim()) {
    ElMessage.warning('请填写标题和内容')
    return
  }

  scriptSubmitLoading.value = true
  try {
    const payload = {
      title: scriptForm.title.trim(),
      content: scriptForm.content.trim(),
      sortOrder: scriptForm.sortOrder,
      status: scriptForm.status,
    }
    if (editingScriptId.value) {
      await updateQuickReply({ id: editingScriptId.value, ...payload })
      ElMessage.success('话术已更新')
    } else {
      await createQuickReply(payload)
      ElMessage.success('话术已添加')
    }
    resetScriptForm()
    await Promise.all([loadAllScripts(), loadQuickReplies()])
  } finally {
    scriptSubmitLoading.value = false
  }
}

async function handleDeleteScript(row: ChatQuickReply) {
  await ElMessageBox.confirm(`确定删除话术「${row.title}」？`, '删除确认', { type: 'warning' })
  await deleteQuickReply(row.id)
  ElMessage.success('已删除')
  if (editingScriptId.value === row.id) resetScriptForm()
  await Promise.all([loadAllScripts(), loadQuickReplies()])
}

async function handleSend(contentOverride?: string) {
  const content = (contentOverride ?? draft.value).trim()
  if (!content || !activeId.value || sending.value) return

  sending.value = true
  try {
    const message = await sendChatMessage(activeId.value, { content })
    messages.value.push(message)
    draft.value = ''
    await scrollToBottom()
    await loadConversations()
  } finally {
    sending.value = false
  }
}

async function handleQuickReply(item: ChatQuickReply) {
  if (!activeId.value) {
    ElMessage.warning('请先选择会话')
    return
  }
  await handleSend(item.content)
}

function handleComposerKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  handleSend()
}

function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    await loadConversations()
    if (activeId.value) {
      await loadMessages()
    }
  }, 3000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

watch(activeId, (id) => {
  if (!id) messages.value = []
})

onMounted(async () => {
  await Promise.all([loadConversations(), loadQuickReplies()])
  startPolling()
})
onUnmounted(stopPolling)
</script>

<template>
  <div class="chat-page">
    <div class="page-head">
      <div>
        <p class="page-tag">CUSTOMER SERVICE</p>
        <h2 class="page-title">客服消息</h2>
      </div>
      <el-button @click="openScriptDialog">话术设置</el-button>
    </div>
    <div class="chat-layout">
      <el-card v-loading="loadingList" shadow="never" class="conversation-list">
        <template #header>
          <span>用户会话</span>
          <el-button link type="primary" @click="loadConversations">刷新</el-button>
        </template>

        <div v-if="!conversations.length" class="empty-list">暂无用户咨询</div>

        <button
          v-for="item in conversations"
          :key="item.id"
          type="button"
          :class="['conversation-item', { active: activeId === item.id }]"
          @click="selectConversation(item.id)"
        >
          <div class="item-top">
            <strong>{{ item.customerName || `用户 #${item.customerId}` }}</strong>
            <div class="item-meta">
              <el-badge v-if="item.unreadCount > 0" :value="item.unreadCount" :max="99" />
              <span class="item-time">{{ item.lastMessageAt ? formatTime(item.lastMessageAt) : '' }}</span>
            </div>
          </div>
          <p class="item-email">{{ item.customerEmail || '未绑定邮箱' }}</p>
          <p class="item-preview">{{ previewText(item) }}</p>
        </button>
      </el-card>

      <el-card shadow="never" class="message-panel">
        <template v-if="activeConversation" #header>
          <div class="panel-head">
            <div>
              <strong>{{ activeConversation.customerName || `用户 #${activeConversation.customerId}` }}</strong>
              <span class="panel-sub">{{ activeConversation.customerEmail || '未绑定邮箱' }}</span>
            </div>
            <el-tag size="small" type="success">进行中</el-tag>
          </div>
        </template>

        <div v-if="!activeConversation" class="empty-panel">请选择左侧会话查看消息</div>

        <template v-else>
          <div ref="listRef" v-loading="loadingMessages" class="message-list">
            <div
              v-for="msg in messages"
              :key="msg.id"
              :class="['message-row', msg.senderRole === 'admin' ? 'mine' : 'customer']"
            >
              <div class="bubble">
                <p class="role">{{ msg.senderRole === 'admin' ? '客服' : '用户' }}</p>
                <p class="content">{{ msg.content }}</p>
                <span class="time">{{ formatTime(msg.createdAt) }}</span>
              </div>
            </div>
          </div>

          <div class="composer">
            <div v-if="quickReplies.length" class="quick-replies">
              <span class="quick-label">快捷回复</span>
              <div class="quick-list">
                <el-tooltip
                  v-for="item in quickReplies"
                  :key="item.id"
                  :content="item.content"
                  placement="top"
                >
                  <el-button size="small" @click="handleQuickReply(item)">
                    {{ item.title }}
                  </el-button>
                </el-tooltip>
              </div>
            </div>

            <el-input
              v-model="draft"
              type="textarea"
              :rows="4"
              maxlength="2000"
              show-word-limit
              placeholder="输入回复内容，Enter 发送，Shift+Enter 换行"
              @keydown="handleComposerKeydown"
            />
            <el-button type="primary" :loading="sending" :disabled="!draft.trim()" @click="handleSend()">
              发送回复
            </el-button>
          </div>        </template>
      </el-card>
    </div>

    <el-dialog v-model="scriptDialogVisible" title="话术设置" width="760px" destroy-on-close>
      <div class="script-layout">
        <el-form label-width="72px" class="script-form">
          <el-form-item label="标题">
            <el-input v-model="scriptForm.title" maxlength="80" placeholder="如：欢迎语" />
          </el-form-item>
          <el-form-item label="内容">
            <el-input
              v-model="scriptForm.content"
              type="textarea"
              :rows="4"
              maxlength="2000"
              show-word-limit
              placeholder="快捷回复的完整话术"
            />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="scriptForm.sortOrder" :min="0" />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="scriptForm.status" style="width: 120px">
              <el-option label="启用" value="active" />
              <el-option label="停用" value="inactive" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :loading="scriptSubmitLoading" @click="handleSaveScript">
              {{ editingScriptId ? '保存修改' : '添加话术' }}
            </el-button>
            <el-button v-if="editingScriptId" @click="resetScriptForm">取消编辑</el-button>
          </el-form-item>
        </el-form>

        <el-table v-loading="scriptLoading" :data="allScripts" stripe max-height="360">
          <el-table-column prop="title" label="标题" width="100" />
          <el-table-column prop="content" label="内容" min-width="220" show-overflow-tooltip />
          <el-table-column prop="sortOrder" label="排序" width="70" />
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                {{ row.status === 'active' ? '启用' : '停用' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEditScript(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDeleteScript(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>
<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-tag {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  letter-spacing: 0.15em;
  color: var(--cb-neon-cyan);
  opacity: 0.6;
  margin-bottom: 4px;
}

.page-title {
  margin: 0;
  font-family: var(--cb-font-display);
  font-size: 22px;
  letter-spacing: 0.06em;
  color: var(--cb-text);
}

.chat-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 16px;
  min-height: 620px;
}

.conversation-list :deep(.el-card__header),
.message-panel :deep(.el-card__header) {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-list :deep(.el-card__body) {
  padding: 8px;
  max-height: 560px;
  overflow-y: auto;
}

.empty-list,
.empty-panel {
  padding: 48px 16px;
  text-align: center;
  color: var(--cb-text-muted);
}

.conversation-item {
  width: 100%;
  margin-bottom: 8px;
  padding: 12px;
  border: 1px solid var(--cb-border);
  border-radius: var(--cb-radius);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.conversation-item:hover,
.conversation-item.active {
  border-color: var(--cb-accent);
  background: rgba(201, 169, 98, 0.08);
}

.item-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.item-top strong {
  color: var(--cb-text);
  font-size: 14px;
}

.item-time {
  font-size: 11px;
  color: var(--cb-text-muted);
  white-space: nowrap;
}

.item-email,
.item-preview {
  margin: 0;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.item-preview {
  margin-top: 6px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.message-panel {
  display: flex;
  flex-direction: column;
}

.message-panel :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  height: 560px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-sub {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px 16px;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
}

.message-row.mine {
  justify-content: flex-end;
}

.message-row.customer {
  justify-content: flex-start;
}

.bubble {
  max-width: 72%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--cb-border);
}

.message-row.mine .bubble {
  background: rgba(201, 169, 98, 0.14);
}

.message-row.customer .bubble {
  background: rgba(18, 18, 22, 0.85);
}

.role {
  margin: 0 0 4px;
  font-size: 11px;
  color: var(--cb-accent);
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

.quick-replies {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.quick-label {
  font-size: 12px;
  color: var(--cb-text-muted);
}

.quick-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.script-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.script-form {
  padding-bottom: 8px;
  border-bottom: 1px solid var(--cb-border);
}

@media (max-width: 960px) {
  .chat-layout {
    grid-template-columns: 1fr;
  }
}
</style>
