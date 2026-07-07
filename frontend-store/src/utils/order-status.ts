export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '待支付',
  paid: '已支付',
  shipped: '已发货',
  completed: '已完成',
  cancelled: '已取消',
}

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] || status
}

export function orderStatusClass(status: string) {
  return `status-${status}`
}

const USER_DELETABLE_STATUSES = new Set(['completed', 'cancelled'])

export function canUserDeleteOrder(status: string) {
  return USER_DELETABLE_STATUSES.has(status)
}
