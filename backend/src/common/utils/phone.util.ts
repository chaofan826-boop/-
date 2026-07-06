import { BadRequestException } from '@nestjs/common';
import { getRegion, REGIONS } from '../constants/regions';

export function validatePhoneForRegion(regionCode: string, raw: string): void {
  const region = getRegion(regionCode);
  if (!region) {
    throw new BadRequestException('Invalid region');
  }

  const digits = raw.replace(/\D/g, '');
  const local = digits.startsWith(region.dial) ? digits.slice(region.dial.length) : digits;
  if (!region.pattern.test(local)) {
    throw new BadRequestException('手机号格式不正确');
  }
}

export function normalizePhone(regionCode: string, raw: string): string {
  const region = getRegion(regionCode);
  if (!region) {
    throw new BadRequestException('Invalid region');
  }

  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith(region.dial)) {
    return digits;
  }
  return `${region.dial}${digits}`;
}

export function getPhoneLookupCandidates(account: string): string[] {
  const digits = account.replace(/\D/g, '');
  if (!digits) {
    return [];
  }

  const candidates = new Set<string>([digits]);

  for (const region of REGIONS) {
    const local = digits.startsWith(region.dial) ? digits.slice(region.dial.length) : digits;
    if (region.pattern.test(local)) {
      candidates.add(`${region.dial}${local}`);
      candidates.add(local);
    }
  }

  return [...candidates];
}

export function formatPhoneDisplay(regionCode: string | null, phone: string | null): string {
  if (!phone) return '';
  if (!regionCode) return phone;
  const region = getRegion(regionCode);
  if (!region) return phone;
  if (phone.startsWith(region.dial)) {
    return `+${region.dial} ${phone.slice(region.dial.length)}`;
  }
  return phone;
}
