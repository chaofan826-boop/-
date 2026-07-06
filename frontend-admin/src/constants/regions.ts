const REGION_LABELS: Record<string, string> = {
  CN: '中国大陆',
  HK: '中国香港',
  MO: '中国澳门',
  TW: '中国台湾',
  US: '美国',
  SG: '新加坡',
  JP: '日本',
  KR: '韩国',
}

const REGION_DIAL: Record<string, string> = {
  CN: '86',
  HK: '852',
  MO: '853',
  TW: '886',
  US: '1',
  SG: '65',
  JP: '81',
  KR: '82',
}

export function regionLabel(code: string | null | undefined): string {
  if (!code) return '—'
  return REGION_LABELS[code] ?? code
}

export function formatPhoneDisplay(region: string | null | undefined, phone: string | null | undefined): string {
  if (!phone) return '—'
  const dial = region ? REGION_DIAL[region] : null
  if (dial && phone.startsWith(dial)) {
    return `+${dial} ${phone.slice(dial.length)}`
  }
  return phone
}
