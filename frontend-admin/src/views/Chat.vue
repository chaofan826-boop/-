<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Picture, Search } from '@element-plus/icons-vue'
import {
  createQuickReply,
  deleteQuickReply,
  getAllQuickReplies,
  getChatConversations,
  getConversationByCustomer,
  getConversationMessages,
  getQuickReplies,
  recallChatMessage,
  searchChatCustomers,
  sendChatMessage,
  updateQuickReply,
} from '@/api/chat'
import { uploadChatImage } from '@/api/upload'
import type { ChatConversation, ChatCustomerSearchResult, ChatMessage, ChatQuickReply } from '@/types/chat'
import {
  buildChatImageMessage,
  canRecallMessage,
  chatMessagePreview,
  parseChatMessageContent,
  quotePreview,
  recalledMessageText,
  replySenderLabel,
} from '@/utils/chat-message'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loadingList = ref(false)
const loadingMessages = ref(false)
const searchingCustomers = ref(false)
const sending = ref(false)
const imageUploading = ref(false)
const conversations = ref<ChatConversation[]>([])
const customerResults = ref<ChatCustomerSearchResult[]>([])
const searchKeyword = ref('')
const activeId = ref<number | null>(null)
const messages = ref<ChatMessage[]>([])
const draft = ref('')
const replyingTo = ref<ChatMessage | null>(null)
const highlightMessageId = ref<number | null>(null)
const isNearBottom = ref(true)
const listRef = ref<HTMLElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
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
let searchTimer: ReturnType<typeof setTimeout> | null = null
let highlightTimer: ReturnType<typeof setTimeout> | null = null

const activeConversation = ref<ChatConversation | null>(null)
const isSearching = computed(() => searchKeyword.value.trim().length > 0)

function customerContactLine(item: {
  customerEmail?: string | null
  customerPhone?: string | null
  email?: string | null
  phone?: string | null
}) {
  const email = item.customerEmail ?? item.email
  const phone = item.customerPhone ?? item.phone
  if (email && phone) return `${email} · ${phone}`
  return email || phone || '未绑定联系方式'
}
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
  return prefix + chatMessagePreview(conversation.lastMessage.content, conversation.lastMessage.isRecalled)
}

const viewerRole = 'admin' as const
const SCROLL_BOTTOM_THRESHOLD = 80
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

const showScrollToLatest = computed(() => !isNearBottom.value)

const previewImages = computed(() =>
  messages.value
    .filter((msg) => !msg.isRecalled)
    .map((msg) => parseChatMessageContent(msg.content))
    .filter((item) => item.type === 'image')
    .map((item) => item.imageUrl),
)

function messageContent(msg: ChatMessage) {
  return parseChatMessageContent(msg.content)
}

function isImageMessage(msg: ChatMessage) {
  return messageContent(msg).type === 'image'
}

function messageImageUrl(msg: ChatMessage) {
  const parsed = messageContent(msg)
  return parsed.type === 'image' ? parsed.imageUrl : ''
}

function previewIndex(imageUrl: string) {
  return Math.max(previewImages.value.indexOf(imageUrl), 0)
}

function canRecall(msg: ChatMessage) {
  const userId = userStore.user?.id
  if (!userId) return false
  return canRecallMessage(msg, userId, viewerRole)
}

function startReply(msg: ChatMessage) {
  if (msg.isRecalled) return
  replyingTo.value = msg
}

function cancelReply() {
  replyingTo.value = null
}

async function handleRecall(msg: ChatMessage) {
  if (!activeId.value || !canRecall(msg)) return
  try {
    const updated = await recallChatMessage(activeId.value, msg.id)
    const index = messages.value.findIndex((item) => item.id === msg.id)
    if (index >= 0) {
      messages.value[index] = updated
    }
    if (replyingTo.value?.id === msg.id) {
      replyingTo.value = null
    }
    ElMessage.success('消息已撤回')
    await loadConversations()
  } catch {
    ElMessage.error('撤回失败，请稍后重试')
  }
}

async function scrollToBottom() {
  await nextTick()
  if (!listRef.value) return
  const scroll = () => {
    if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight
      isNearBottom.value = true
    }
  }
  scroll()
  requestAnimationFrame(scroll)
}

function updateScrollState() {
  if (!listRef.value) return
  const { scrollTop, scrollHeight, clientHeight } = listRef.value
  isNearBottom.value = scrollHeight - scrollTop - clientHeight <= SCROLL_BOTTOM_THRESHOLD
}

function handleMessageListScroll() {
  updateScrollState()
}

async function scrollToLatest() {
  await scrollToBottom()
}

async function scrollToQuotedMessage(messageId: number) {
  await nextTick()
  if (!listRef.value) return

  const target = listRef.value.querySelector(`[data-message-id="${messageId}"]`) as HTMLElement | null
  if (!target) {
    ElMessage.info('原消息不在当前会话中')
    return
  }

  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  highlightMessageId.value = messageId
  if (highlightTimer) {
    clearTimeout(highlightTimer)
  }
  highlightTimer = setTimeout(() => {
    highlightMessageId.value = null
    highlightTimer = null
  }, 1600)
}

async function loadConversations() {
  loadingList.value = true
  try {
    const keyword = searchKeyword.value.trim()
    conversations.value = await getChatConversations(keyword ? { keyword } : undefined)
    if (!isSearching.value && !activeId.value && conversations.value.length) {
      await selectConversation(conversations.value[0].id)
    } else if (activeId.value) {
      activeConversation.value =
        conversations.value.find((item) => item.id === activeId.value) ?? activeConversation.value
    }
  } finally {
    loadingList.value = false
  }
}

async function runCustomerSearch() {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    customerResults.value = []
    await loadConversations()
    return
  }

  searchingCustomers.value = true
  try {
    const [customers] = await Promise.all([
      searchChatCustomers(keyword),
      loadConversations(),
    ])
    customerResults.value = customers
  } finally {
    searchingCustomers.value = false
  }
}

function handleSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    runCustomerSearch()
  }, 300)
}

function clearSearch() {
  searchKeyword.value = ''
  customerResults.value = []
  loadConversations()
}

async function openCustomerById(customerId: number) {
  loadingList.value = true
  try {
    const conversation = await getConversationByCustomer(customerId)
    searchKeyword.value = ''
    customerResults.value = []
    await loadConversations()
    activeId.value = conversation.id
    activeConversation.value =
      conversations.value.find((item) => item.id === conversation.id) ?? conversation
    await loadMessages()
  } catch {
    ElMessage.error('无法打开该用户的会话')
  } finally {
    loadingList.value = false
  }
}

async function openCustomerChat(customer: ChatCustomerSearchResult) {
  if (customer.conversationId) {
    await selectConversation(customer.conversationId)
    return
  }

  loadingList.value = true
  try {
    const conversation = await getConversationByCustomer(customer.id)
    await loadConversations()
    await selectConversation(conversation.id)
  } finally {
    loadingList.value = false
  }
}

async function loadMessages() {
  if (!activeId.value) return
  loadingMessages.value = true
  try {
    messages.value = await getConversationMessages(activeId.value)
    await nextTick()
    updateScrollState()
  } finally {
    loadingMessages.value = false
  }
}

async function selectConversation(id: number) {
  activeId.value = id
  activeConversation.value = conversations.value.find((item) => item.id === id) ?? null
  await loadMessages()
}

function parseCustomerIdFromRoute() {
  const raw = route.query.customerId
  const value = typeof raw === 'string' ? Number(raw) : NaN
  return Number.isFinite(value) && value > 0 ? value : null
}

async function openCustomerFromRoute() {
  const customerId = parseCustomerIdFromRoute()
  if (!customerId) return
  await openCustomerById(customerId)
  await router.replace({ path: '/chat' })
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
  if (!content || !activeId.value || sending.value) return false

  const replyToMessageId = replyingTo.value?.id

  sending.value = true
  try {
    const message = await sendChatMessage(activeId.value, {
      content,
      ...(replyToMessageId ? { replyToMessageId } : {}),
    })
    messages.value.push(message)
    draft.value = ''
    replyingTo.value = null
    await scrollToBottom()
    await loadConversations()
    return true
  } catch {
    ElMessage.error('发送失败，请稍后重试')
    return false
  } finally {
    sending.value = false
  }
}

function triggerImagePicker() {
  if (!activeId.value || sending.value || imageUploading.value) return
  imageInputRef.value?.click()
}

function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    ElMessage.warning('仅支持 JPG、PNG、GIF、WebP 图片')
    return false
  }
  if (file.size > MAX_IMAGE_SIZE) {
    ElMessage.warning('图片大小不能超过 5MB')
    return false
  }
  return true
}

async function handleImageSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !activeId.value || imageUploading.value || sending.value) return
  if (!validateImageFile(file)) return

  imageUploading.value = true
  try {
    const { url } = await uploadChatImage(file)
    const ok = await handleSend(buildChatImageMessage(url))
    if (ok) {
      ElMessage.success('图片已发送')
    }
  } catch {
    ElMessage.error('图片发送失败，请稍后重试')
  } finally {
    imageUploading.value = false
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
    if (isSearching.value) {
      await runCustomerSearch()
    } else {
      await loadConversations()
    }
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
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
  if (highlightTimer) {
    clearTimeout(highlightTimer)
    highlightTimer = null
  }
}

watch(activeId, (id) => {
  if (!id) {
    messages.value = []
    replyingTo.value = null
    isNearBottom.value = true
  }
})

onMounted(async () => {
  await Promise.all([loadConversations(), loadQuickReplies()])
  await openCustomerFromRoute()
  startPolling()
})

watch(
  () => route.query.customerId,
  () => {
    openCustomerFromRoute()
  },
)

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
      <el-card v-loading="loadingList || searchingCustomers" shadow="never" class="conversation-list">
        <template #header>
          <span>用户会话</span>
          <el-button link type="primary" @click="runCustomerSearch">刷新</el-button>
        </template>

        <div class="search-box">
          <el-input
            v-model="searchKeyword"
            clearable
            placeholder="搜索客户：姓名 / 邮箱 / 手机 / ID"
            @input="handleSearchInput"
            @clear="clearSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <template v-if="isSearching">
          <p class="search-section-title">客户搜索结果</p>
          <div v-if="!customerResults.length" class="empty-list">未找到匹配客户</div>
          <button
            v-for="customer in customerResults"
            :key="`customer-${customer.id}`"
            type="button"
            :class="['conversation-item', { active: activeConversation?.customerId === customer.id }]"
            @click="openCustomerChat(customer)"
          >
            <div class="item-top">
              <strong>{{ customer.name || `用户 #${customer.id}` }}</strong>
              <div class="item-meta">
                <el-badge v-if="customer.unreadCount > 0" :value="customer.unreadCount" :max="99" />
                <el-tag v-if="!customer.conversationId" size="small" type="info">新会话</el-tag>
              </div>
            </div>
            <p class="item-email">{{ customerContactLine(customer) }}</p>
            <p class="item-preview">用户 ID：{{ customer.id }}</p>
          </button>
        </template>

        <template v-else>
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
            <p class="item-email">{{ customerContactLine(item) }}</p>
            <p class="item-preview">{{ previewText(item) }}</p>
          </button>
        </template>
      </el-card>

      <el-card shadow="never" class="message-panel">
        <template v-if="activeConversation" #header>
          <div class="panel-head">
            <div>
              <strong>{{ activeConversation.customerName || `用户 #${activeConversation.customerId}` }}</strong>
              <span class="panel-sub">{{ customerContactLine(activeConversation) }}</span>
            </div>
            <el-tag size="small" type="success">进行中</el-tag>
          </div>
        </template>

        <div v-if="!activeConversation" class="empty-panel">请选择左侧会话查看消息</div>

        <template v-else>
          <div class="message-list-wrap">
            <div ref="listRef" v-loading="loadingMessages" class="message-list" @scroll="handleMessageListScroll">
            <div
              v-for="msg in messages"
              :key="msg.id"
              :data-message-id="msg.id"
              :class="[
                'message-row',
                msg.senderRole === 'admin' ? 'mine' : 'customer',
                { 'message-row--highlight': highlightMessageId === msg.id },
              ]"
            >
              <div class="message-wrap">
                <div
                  class="bubble"
                  :class="{
                    'bubble--image': !msg.isRecalled && isImageMessage(msg),
                    'bubble--recalled': msg.isRecalled,
                  }"
                >
                  <p class="role">{{ msg.senderRole === 'admin' ? '客服' : '用户' }}</p>
                  <p v-if="msg.isRecalled" class="recalled-text">
                    {{ recalledMessageText(msg.senderRole, viewerRole) }}
                  </p>
                  <template v-else>
                    <div
                      v-if="msg.replyTo"
                      class="reply-quote"
                      role="button"
                      tabindex="0"
                      @click="scrollToQuotedMessage(msg.replyTo.id)"
                      @keydown.enter.prevent="scrollToQuotedMessage(msg.replyTo.id)"
                    >
                      <span class="reply-label">
                        {{ replySenderLabel(msg.replyTo.senderRole, viewerRole) }}
                      </span>
                      <span class="reply-text">
                        {{ quotePreview(msg.replyTo.content, msg.replyTo.isRecalled) }}
                      </span>
                    </div>
                    <el-image
                      v-if="isImageMessage(msg)"
                      :src="messageImageUrl(msg)"
                      :preview-src-list="previewImages"
                      :initial-index="previewIndex(messageImageUrl(msg))"
                      fit="cover"
                      class="chat-image"
                      preview-teleported
                    />
                    <p v-else class="content">{{ msg.content }}</p>
                  </template>
                  <div class="bubble-foot">
                    <span class="time">{{ formatTime(msg.createdAt) }}</span>
                    <span
                      v-if="msg.senderRole === 'admin' && !msg.isRecalled"
                      class="read-receipt"
                      :class="{ read: msg.isRead }"
                    >
                      {{ msg.isRead ? '已读' : '未读' }}
                    </span>
                  </div>
                </div>
                <div v-if="!msg.isRecalled" class="message-actions">
                  <button type="button" class="msg-action-btn" @click="startReply(msg)">引用</button>
                  <button
                    v-if="canRecall(msg)"
                    type="button"
                    class="msg-action-btn msg-action-btn--danger"
                    @click="handleRecall(msg)"
                  >
                    撤回
                  </button>
                </div>
              </div>
            </div>
          </div>
            <button
              v-if="showScrollToLatest"
              type="button"
              class="scroll-latest-btn"
              @click="scrollToLatest"
            >
              <el-icon><ArrowDown /></el-icon>
              回到最新
            </button>
          </div>

          <div class="composer">
            <div v-if="replyingTo" class="reply-compose-bar">
              <div class="reply-compose-main">
                <span class="reply-compose-label">
                  回复 {{ replySenderLabel(replyingTo.senderRole, viewerRole) }}
                </span>
                <span class="reply-compose-text">
                  {{ quotePreview(replyingTo.content, replyingTo.isRecalled) }}
                </span>
              </div>
              <button type="button" class="reply-compose-close" aria-label="取消引用" @click="cancelReply">
                ×
              </button>
            </div>
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
            <div class="composer-actions">
              <button
                type="button"
                class="image-upload-btn"
                :disabled="!activeId || sending || imageUploading"
                @click="triggerImagePicker"
              >
                <el-icon><Picture /></el-icon>
                <span>{{ imageUploading ? '上传中...' : '图片' }}</span>
              </button>
              <input
                ref="imageInputRef"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                hidden
                @change="handleImageSelected"
              />
              <el-button
                type="primary"
                :loading="sending"
                :disabled="!draft.trim() || imageUploading"
                @click="handleSend()"
              >
                发送回复
              </el-button>
            </div>
          </div>
        </template>
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

.search-box {
  padding: 0 4px 10px;
}

.search-section-title {
  margin: 0 4px 8px;
  font-size: 12px;
  color: var(--cb-text-muted);
  letter-spacing: 0.04em;
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

.message-list-wrap {
  position: relative;
  flex: 1;
  min-height: 0;
}

.message-list {
  height: 100%;
  overflow-y: auto;
  padding: 8px 4px 16px;
}

.scroll-latest-btn {
  position: absolute;
  left: 50%;
  bottom: 12px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border: 1px solid rgba(201, 169, 98, 0.45);
  border-radius: 999px;
  background: rgba(10, 10, 12, 0.88);
  color: var(--cb-accent);
  font-size: 12px;
  cursor: pointer;
  transform: translateX(-50%);
  box-shadow: var(--cb-shadow-elevated);
  transition: background 0.2s ease, border-color 0.2s ease;
}

.scroll-latest-btn:hover {
  background: rgba(201, 169, 98, 0.14);
  border-color: var(--cb-accent);
}

.scroll-latest-btn .el-icon {
  font-size: 14px;
}

.message-row {
  display: flex;
  margin-bottom: 12px;
  border-radius: 12px;
  transition: background-color 0.3s ease;
}

.message-row--highlight .bubble {
  box-shadow: 0 0 0 2px rgba(201, 169, 98, 0.45);
  animation: quote-target-flash 1.6s ease;
}

@keyframes quote-target-flash {
  0%,
  100% {
    background-color: inherit;
  }

  20% {
    background-color: rgba(201, 169, 98, 0.18);
  }
}

.message-row.mine {
  justify-content: flex-end;
}

.message-row.customer {
  justify-content: flex-start;
}

.message-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 76%;
}

.message-row.customer .message-wrap {
  align-items: flex-start;
}

.message-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.message-wrap:hover .message-actions {
  opacity: 1;
}

.msg-action-btn {
  padding: 0;
  border: none;
  background: transparent;
  color: var(--cb-text-muted);
  font-size: 11px;
  cursor: pointer;
}

.msg-action-btn:hover {
  color: var(--cb-accent);
}

.msg-action-btn--danger:hover {
  color: #f87171;
}

.bubble--recalled {
  background: rgba(18, 18, 22, 0.55);
}

.recalled-text {
  margin: 0;
  font-size: 13px;
  color: var(--cb-text-muted);
  font-style: italic;
}

.reply-quote {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  padding: 8px 10px;
  border-left: 3px solid rgba(201, 169, 98, 0.55);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.reply-quote:hover {
  background: rgba(201, 169, 98, 0.1);
  border-left-color: var(--cb-accent);
}

.reply-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--cb-accent);
}

.reply-text {
  font-size: 12px;
  line-height: 1.5;
  color: var(--cb-text-muted);
  word-break: break-word;
}

.reply-compose-bar {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: var(--cb-radius);
  border: 1px solid rgba(201, 169, 98, 0.25);
  background: rgba(201, 169, 98, 0.06);
}

.reply-compose-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reply-compose-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--cb-accent);
}

.reply-compose-text {
  font-size: 12px;
  color: var(--cb-text-muted);
  word-break: break-word;
}

.reply-compose-close {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 50%;
  background: rgba(18, 18, 22, 0.72);
  color: var(--cb-text-muted);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
}

.reply-compose-close:hover {
  color: var(--cb-text);
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

.bubble--image {
  padding: 4px;
}

.chat-image {
  display: block;
  width: 180px;
  max-width: 100%;
  height: 180px;
  border-radius: 10px;
  overflow: hidden;
  cursor: zoom-in;
}

.chat-image :deep(.el-image__inner) {
  border-radius: 10px;
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
  font-size: 11px;
  color: var(--cb-text-muted);
}

.bubble-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

.read-receipt {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--cb-text-muted);
}

.read-receipt.read {
  color: var(--cb-accent);
}

.composer {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--cb-border);
}

.composer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.image-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: var(--cb-radius);
  border: 1px solid var(--cb-border);
  background: rgba(18, 18, 22, 0.72);
  color: var(--cb-text-dim);
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.image-upload-btn:hover:not(:disabled) {
  border-color: rgba(201, 169, 98, 0.45);
  color: var(--cb-accent);
  background: rgba(201, 169, 98, 0.08);
}

.image-upload-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
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
