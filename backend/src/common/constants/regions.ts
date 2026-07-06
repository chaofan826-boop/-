export interface RegionOption {
  code: string;
  label: string;
  dial: string;
  pattern: RegExp;
  placeholder: string;
}

export const REGIONS: RegionOption[] = [
  { code: 'CN', label: '中国大陆', dial: '86', pattern: /^1[3-9]\d{9}$/, placeholder: '请输入 11 位手机号' },
  { code: 'HK', label: '中国香港', dial: '852', pattern: /^[5689]\d{7}$/, placeholder: '请输入 8 位手机号' },
  { code: 'MO', label: '中国澳门', dial: '853', pattern: /^6\d{7}$/, placeholder: '请输入 8 位手机号' },
  { code: 'TW', label: '中国台湾', dial: '886', pattern: /^9\d{8}$/, placeholder: '请输入 9 位手机号' },
  { code: 'US', label: '美国', dial: '1', pattern: /^\d{10}$/, placeholder: '请输入 10 位手机号' },
  { code: 'SG', label: '新加坡', dial: '65', pattern: /^[89]\d{7}$/, placeholder: '请输入 8 位手机号' },
  { code: 'JP', label: '日本', dial: '81', pattern: /^[789]0\d{8}$/, placeholder: '请输入手机号' },
  { code: 'KR', label: '韩国', dial: '82', pattern: /^1\d{8,9}$/, placeholder: '请输入手机号' },
];

export function getRegion(code: string): RegionOption | undefined {
  return REGIONS.find((r) => r.code === code);
}
