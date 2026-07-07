export interface ProductSpecOption {
  name: string;
  values?: string[];
}

export type SkuSpecValues = Record<string, string>;

const COLOR_KEYS = ['颜色', 'color', 'Color'];
const SIZE_KEYS = ['尺寸', '尺码', 'size', 'Size'];

function cleanSpecValues(specValues?: SkuSpecValues | null): SkuSpecValues {
  if (!specValues) return {};
  const result: SkuSpecValues = {};
  for (const [key, value] of Object.entries(specValues)) {
    const name = key.trim();
    const val = typeof value === 'string' ? value.trim() : '';
    if (name && val) {
      result[name] = val;
    }
  }
  return result;
}

function pickValue(specValues: SkuSpecValues, keys: string[]): string | null {
  for (const key of keys) {
    const value = specValues[key]?.trim();
    if (value) return value;
  }
  return null;
}

export function normalizeSpecOptions(
  options?: ProductSpecOption[] | null,
): ProductSpecOption[] {
  if (!options?.length) return [];
  const seen = new Set<string>();
  const result: ProductSpecOption[] = [];
  for (const option of options) {
    const name = option.name?.trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const values = [
      ...new Set((option.values || []).map((value) => value.trim()).filter(Boolean)),
    ];
    result.push({ name, values: values.length ? values : undefined });
  }
  return result;
}

export function mergeSpecValues(
  specValues?: SkuSpecValues | null,
  color?: string | null,
  size?: string | null,
): SkuSpecValues {
  const merged = cleanSpecValues(specValues);
  if (color?.trim() && !pickValue(merged, COLOR_KEYS)) {
    merged['颜色'] = color.trim();
  }
  if (size?.trim() && !pickValue(merged, SIZE_KEYS)) {
    merged['尺寸'] = size.trim();
  }
  return merged;
}

export function extractLegacyColorSize(specValues: SkuSpecValues): {
  color: string | null;
  size: string | null;
} {
  return {
    color: pickValue(specValues, COLOR_KEYS),
    size: pickValue(specValues, SIZE_KEYS),
  };
}

export function inferSpecOptionsFromSkus(
  skus: Array<{
    color?: string | null;
    size?: string | null;
    specValues?: SkuSpecValues | null;
  }>,
  existing?: ProductSpecOption[] | null,
): ProductSpecOption[] {
  const normalizedExisting = normalizeSpecOptions(existing);
  if (normalizedExisting.length) return normalizedExisting;

  const valueMap = new Map<string, Set<string>>();
  for (const sku of skus) {
    const values = mergeSpecValues(sku.specValues, sku.color, sku.size);
    for (const [name, value] of Object.entries(values)) {
      if (!valueMap.has(name)) valueMap.set(name, new Set());
      valueMap.get(name)!.add(value);
    }
  }

  return [...valueMap.entries()].map(([name, values]) => ({
    name,
    values: [...values],
  }));
}

export function formatSpecText(
  specValues?: SkuSpecValues | null,
  fallback?: { color?: string | null; size?: string | null },
): string {
  const values = mergeSpecValues(specValues, fallback?.color, fallback?.size);
  return Object.values(values).filter(Boolean).join(' / ');
}

export function normalizeSkuSpecInput(dto: {
  specValues?: SkuSpecValues | null;
  color?: string | null;
  size?: string | null;
}): { specValues: SkuSpecValues; color: string | null; size: string | null } {
  const specValues = mergeSpecValues(dto.specValues, dto.color, dto.size);
  const legacy = extractLegacyColorSize(specValues);
  return {
    specValues,
    color: legacy.color,
    size: legacy.size,
  };
}
