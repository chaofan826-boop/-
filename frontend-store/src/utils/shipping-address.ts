export interface ShippingAddress {
  id: number
  receiverName: string
  receiverPhone: string
  detailAddress: string
  label: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface ShippingAddressPayload {
  receiverName: string
  receiverPhone: string
  detailAddress: string
  label?: string
  isDefault?: boolean
}

export function formatShippingAddress(
  receiverName: string,
  receiverPhone: string,
  detailAddress: string,
) {
  return `${receiverName.trim()} | ${receiverPhone.trim()} | ${detailAddress.trim()}`
}

export function formatShippingAddressRecord(address: Pick<ShippingAddress, 'receiverName' | 'receiverPhone' | 'detailAddress'>) {
  return formatShippingAddress(address.receiverName, address.receiverPhone, address.detailAddress)
}

export function parseShippingAddress(value: string) {
  const parts = value.split('|').map((part) => part.trim())
  if (parts.length < 3) {
    return {
      receiverName: parts[0] || '',
      receiverPhone: parts[1] || '',
      detailAddress: parts.slice(2).join(' | ') || parts[1] || '',
    }
  }
  return {
    receiverName: parts[0],
    receiverPhone: parts[1],
    detailAddress: parts.slice(2).join(' | '),
  }
}

export function addressSummary(address: Pick<ShippingAddress, 'receiverName' | 'receiverPhone' | 'detailAddress' | 'label'>) {
  const label = address.label ? `[${address.label}] ` : ''
  return `${label}${address.receiverName} ${address.receiverPhone} · ${address.detailAddress}`
}
