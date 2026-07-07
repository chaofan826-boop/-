export const PENDING_ORDER_PAY_TIMEOUT_MS = 30 * 60 * 1000

export interface PendingPayOrderLike {
  payExpiresAt?: string | null
  createdAt: string
}

export function getOrderPayExpiresAt(order: PendingPayOrderLike) {
  if (order.payExpiresAt) {
    return new Date(order.payExpiresAt).getTime()
  }
  return new Date(order.createdAt).getTime() + PENDING_ORDER_PAY_TIMEOUT_MS
}

export function getPendingPayRemainingMs(order: PendingPayOrderLike, now = Date.now()) {
  return Math.max(0, getOrderPayExpiresAt(order) - now)
}

export function formatPendingPayCountdown(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function isPendingPayExpired(order: PendingPayOrderLike, now = Date.now()) {
  return getPendingPayRemainingMs(order, now) <= 0
}
