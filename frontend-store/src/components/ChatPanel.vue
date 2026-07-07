<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowDown, Picture } from '@element-plus/icons-vue'
import { getConversationMessages, getMyConversation, recallChatMessage, sendChatMessage } from '@/api/chat'
import { uploadChatImage } from '@/api/upload'
import { getOrders, type Order, type OrderItem } from '@/api/order'
import OrderInquiryPreview from '@/components/OrderInquiryPreview.vue'
import OrderStatusBadge from '@/components/OrderStatusBadge.vue'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { buildOrderInquiryMessage, pickInquiryOrders } from '@/utils/order-inquiry'
import { buildChatImageMessage, canRecallMessage, parseChatMessageContent, quotePreview, recalledMessageText, replySenderLabel } from '@/utils/chat-message'
import type { ChatConversation, ChatMessage } from '@/types/chat'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

const userStore = useUserStore()
const appStore = useAppStore()
const loading = ref(false)
const ordersLoading = ref(false)
const sending = ref(false)
const imageUploading = ref(false)
const conversation = ref<ChatConversation | null>(null)
const messages = ref<ChatMessage[]>([])
const draft = ref('')
const replyingTo = ref<ChatMessage | null>(null)
const highlightMessageId = ref<number | null>(null)
const isNearBottom = ref(true)
const listRef = ref<HTMLElement | null>(null)
const imageInputRef = ref<HTMLInputElement | null>(null)
const inquiryOrders = ref<Order[]>([])
const orderPickerVisible = ref(false)
const selectedOrderNo = ref('')

let pollTimer: ReturnType<typeof setInterval> | null = null
let highlightTimer: ReturnType<typeof setTimeout> | null = null

const singleInquiryOrder = computed(() =>
  inquiryOrders.value.length === 1 ? inquiryOrders.value[0] : null,
)

const selectedOrder = computed(() =>
  inquiryOrders.value.find((order) => order.orderNo === selectedOrderNo.value) ?? null,
)

const hasInquiryOrders = computed(() => inquiryOrders.value.length > 0)

const previewImages = computed(() =>
  messages.value
    .filter((msg) => !msg.isRecalled)
    .map((msg) => parseChatMessageContent(msg.content))
    .filter((item) => item.type === 'image')
    .map((item) => item.imageUrl),
)

const viewerRole = 'customer' as const

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
const MAX_IMAGE_SIZE = 5 * 1024 * 1024
const SCROLL_BOTTOM_THRESHOLD = 80

const showScrollToLatest = computed(() => !isNearBottom.value)

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
  if (!conversation.value || !canRecall(msg)) return
  try {
    const updated = await recallChatMessage(conversation.value.id, msg.id)
    const index = messages.value.findIndex((item) => item.id === msg.id)
    if (index >= 0) {
      messages.value[index] = updated
    }
    if (replyingTo.value?.id === msg.id) {
      replyingTo.value = null
    }
    ElMessage.success('消息已撤回')
  } catch {
    ElMessage.error('撤回失败，请稍后重试')
  }
}

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

function itemImage(item: OrderItem) {
  if (item.product?.mainImage) return item.product.mainImage
  return `https://picsum.photos/seed/p${item.productId}/80/80`
}

function selectOrder(orderNo: string) {
  selectedOrderNo.value = orderNo
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

async function loadMessages() {
  if (!conversation.value) return
  messages.value = await getConversationMessages(conversation.value.id)
  await nextTick()
  updateScrollState()
}

async function loadInquiryOrders() {
  ordersLoading.value = true
  try {
    const orders = await getOrders()
    inquiryOrders.value = pickInquiryOrders(orders)
    if (inquiryOrders.value.length === 1) {
      selectedOrderNo.value = inquiryOrders.value[0].orderNo
    } else if (
      selectedOrderNo.value &&
      !inquiryOrders.value.some((order) => order.orderNo === selectedOrderNo.value)
    ) {
      selectedOrderNo.value = inquiryOrders.value[0]?.orderNo ?? ''
    }
  } catch {
    inquiryOrders.value = []
  } finally {
    ordersLoading.value = false
  }
}

async function initChat() {
  loading.value = true
  try {
    const [conv] = await Promise.all([getMyConversation(), loadInquiryOrders()])
    conversation.value = conv
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

  const replyToMessageId = replyingTo.value?.id

  sending.value = true
  try {
    const message = await sendChatMessage(conversation.value.id, {
      content,
      ...(replyToMessageId ? { replyToMessageId } : {}),
    })
    messages.value.push(message)
    draft.value = ''
    replyingTo.value = null
    await scrollToBottom()
    return true
  } catch {
    ElMessage.error('发送失败，请稍后重试')
    return false
  } finally {
    sending.value = false
  }
}

async function sendOrderInquiry(order: Order) {
  const content = buildOrderInquiryMessage(order, (amount) => appStore.formatPrice(amount))
  const ok = await handleSend(content)
  if (ok) {
    ElMessage.success('订单咨询已发送')
    orderPickerVisible.value = false
  }
}

function openOrderPicker() {
  selectedOrderNo.value = inquiryOrders.value[0]?.orderNo ?? ''
  orderPickerVisible.value = true
}

async function confirmOrderInquiry() {
  if (!selectedOrder.value) {
    ElMessage.warning('请选择要咨询的订单')
    return
  }
  await sendOrderInquiry(selectedOrder.value)
}

function handleComposerKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey) return
  event.preventDefault()
  handleSend()
}

function triggerImagePicker() {
  if (sending.value || imageUploading.value) return
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
  if (!file || !conversation.value || imageUploading.value || sending.value) return
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
      orderPickerVisible.value = false
      replyingTo.value = null
      isNearBottom.value = true
    }
  },
)

onUnmounted(() => {
  stopPolling()
  if (highlightTimer) {
    clearTimeout(highlightTimer)
  }
})
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

      <div v-if="hasInquiryOrders || ordersLoading" v-loading="ordersLoading" class="order-inquiry">
        <div class="inquiry-head">
          <span class="inquiry-title">订单咨询</span>
          <span class="inquiry-desc">发送订单信息，方便客服协助改单</span>
        </div>

        <template v-if="singleInquiryOrder">
          <OrderInquiryPreview :order="singleInquiryOrder" compact />
          <el-button
            type="primary"
            plain
            class="inquiry-send-btn"
            :loading="sending"
            @click="sendOrderInquiry(singleInquiryOrder)"
          >
            一键发送订单咨询
          </el-button>
        </template>

        <template v-else-if="inquiryOrders.length > 1">
          <el-button type="primary" plain class="inquiry-send-btn" @click="openOrderPicker">
            选择订单咨询（{{ inquiryOrders.length }} 笔）
          </el-button>
        </template>
      </div>

      <div class="message-list-wrap">
        <div ref="listRef" class="message-list" @scroll="handleMessageListScroll">
        <div v-if="!messages.length && !loading" class="empty-chat">暂无消息，发送第一条咨询吧</div>
        <div
          v-for="msg in messages"
          :key="msg.id"
          :data-message-id="msg.id"
          :class="[
            'message-row',
            msg.senderRole === 'customer' ? 'mine' : 'service',
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
                <span v-if="msg.senderRole === 'customer' && !msg.isRecalled" class="read-receipt" :class="{ read: msg.isRead }">
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
        <el-input
          v-model="draft"
          type="textarea"
          :rows="3"
          maxlength="2000"
          show-word-limit
          placeholder="请输入您的问题，Enter 发送，Shift+Enter 换行"
          @keydown="handleComposerKeydown"
        />
        <div class="composer-actions">
          <button
            type="button"
            class="image-upload-btn"
            :disabled="sending || imageUploading"
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
            发送
          </el-button>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="orderPickerVisible"
      title="选择要咨询的订单"
      width="94%"
      class="order-picker-dialog"
      append-to-body
      destroy-on-close
    >
      <div class="order-picker-layout">
        <div class="picker-list-wrap">
          <p class="picker-list-title">我的订单</p>
          <div class="order-picker-list">
            <button
              v-for="order in inquiryOrders"
              :key="order.orderNo"
              type="button"
              class="order-picker-item"
              :class="{ active: selectedOrderNo === order.orderNo }"
              @click="selectOrder(order.orderNo)"
            >
              <div class="picker-thumbs">
                <img
                  v-for="item in order.items.slice(0, 3)"
                  :key="item.id"
                  :src="itemImage(item)"
                  :alt="item.product?.title?.zh || '商品'"
                  loading="lazy"
                />
                <span v-if="order.items.length > 3" class="more-thumb">+{{ order.items.length - 3 }}</span>
              </div>
              <div class="picker-body">
                <div class="picker-top">
                  <span class="picker-no">{{ order.orderNo }}</span>
                  <OrderStatusBadge :status="order.status" size="sm" />
                </div>
                <p class="picker-time">{{ new Date(order.createdAt).toLocaleString('zh-CN') }}</p>
                <div class="picker-meta">
                  <span>{{ order.items.length }} 件商品</span>
                  <span>{{ appStore.formatPrice(Number(order.totalAmount)) }}</span>
                </div>
              </div>
            </button>
          </div>
        </div>

        <div v-if="selectedOrder" class="picker-preview-wrap">
          <p class="picker-list-title">订单详情</p>
          <OrderInquiryPreview :order="selectedOrder" />
        </div>
      </div>

      <template #footer>
        <el-button @click="orderPickerVisible = false">取消</el-button>
        <el-button type="primary" :loading="sending" :disabled="!selectedOrder" @click="confirmOrderInquiry">
          发送咨询
        </el-button>
      </template>
    </el-dialog>
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

.order-inquiry {
  margin-bottom: 12px;
  padding: 12px;
  border-radius: var(--cb-radius);
  border: 1px solid rgba(201, 169, 98, 0.22);
  background: rgba(22, 17, 14, 0.55);
}

.inquiry-head {
  margin-bottom: 10px;
}

.inquiry-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--cb-text);
}

.inquiry-desc {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--cb-text-muted);
}

.inquiry-send-btn {
  width: 100%;
  margin-top: 10px;
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
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
}

.scroll-latest-btn:hover {
  background: rgba(201, 169, 98, 0.14);
  border-color: var(--cb-accent);
}

.scroll-latest-btn .el-icon {
  font-size: 14px;
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

.message-row.service {
  justify-content: flex-start;
}

.message-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-width: 88%;
}

.message-row.service .message-wrap {
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

.bubble {
  max-width: 100%;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid var(--cb-border);
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

.message-row.mine .bubble {
  background: rgba(201, 169, 98, 0.14);
  border-color: rgba(201, 169, 98, 0.35);
}

.message-row.service .bubble {
  background: rgba(18, 18, 22, 0.85);
}

.bubble--image {
  padding: 4px;
  background: rgba(18, 18, 22, 0.55);
}

.message-row.mine .bubble--image {
  background: rgba(201, 169, 98, 0.08);
  border-color: rgba(201, 169, 98, 0.28);
}

.chat-image {
  display: block;
  width: 168px;
  max-width: 100%;
  height: 168px;
  border-radius: 10px;
  overflow: hidden;
  cursor: zoom-in;
}

.chat-image :deep(.el-image__inner) {
  border-radius: 10px;
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

.order-picker-layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: min(68vh, 560px);
}

.picker-list-title {
  margin: 0 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--cb-text);
}

.picker-list-wrap {
  flex-shrink: 0;
}

.order-picker-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 2px;
}

.order-picker-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border-radius: var(--cb-radius-lg);
  border: 1px solid var(--cb-border);
  background: rgba(18, 18, 22, 0.72);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
}

.order-picker-item.active {
  border-color: rgba(201, 169, 98, 0.45);
  background: rgba(201, 169, 98, 0.08);
  box-shadow: 0 0 0 1px rgba(201, 169, 98, 0.08);
}

.picker-thumbs {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.picker-thumbs img {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--cb-border);
  background: rgba(18, 18, 22, 0.9);
}

.picker-thumbs img + img {
  margin-left: -10px;
}

.more-thumb {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-left: -10px;
  border-radius: 8px;
  border: 1px solid var(--cb-border);
  background: rgba(10, 10, 12, 0.88);
  font-size: 11px;
  font-weight: 600;
  color: var(--cb-text-muted);
}

.picker-body {
  flex: 1;
  min-width: 0;
}

.picker-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.picker-no {
  font-family: var(--cb-font-mono);
  font-size: 11px;
  color: var(--cb-accent);
  word-break: break-all;
}

.picker-time {
  margin: 0 0 4px;
  font-size: 11px;
  color: var(--cb-text-muted);
}

.picker-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--cb-text-dim);
}

.picker-preview-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-top: 2px;
  border-top: 1px solid rgba(201, 169, 98, 0.12);
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

.order-picker-dialog {
  max-width: 440px;
}

.order-picker-dialog .el-dialog__body {
  padding-top: 8px;
}
</style>
