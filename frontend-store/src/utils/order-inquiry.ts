import type { Order } from '@/api/order'

import { orderStatusLabel } from '@/utils/order-status'



export { orderStatusLabel }



function itemSummary(order: Order) {

  const count = order.items.reduce((sum, item) => sum + item.quantity, 0)

  const firstTitle = order.items[0]?.product?.title?.zh || '商品'

  if (order.items.length <= 1) return `${firstTitle} × ${count}`

  return `${firstTitle} 等 ${order.items.length} 件商品 · 共 ${count} 件`

}



export function buildOrderInquiryMessage(order: Order, formatPrice: (amount: number) => string) {

  const lines = [

    '【订单咨询】',

    `订单号：${order.orderNo}`,

    `订单状态：${orderStatusLabel(order.status)}`,

    `下单时间：${new Date(order.createdAt).toLocaleString('zh-CN')}`,

    `商品信息：${itemSummary(order)}`,

    `订单金额：${formatPrice(Number(order.totalAmount))}`,

    `收货地址：${order.shippingAddress}`,

    '',

    '我想咨询改订单相关事宜（如修改地址、商品数量、取消订单等），请协助处理。',

  ]

  return lines.join('\n')

}



export function pickInquiryOrders(orders: Order[]) {

  return [...orders]

    .filter((order) => order.status !== 'cancelled')

    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

}

