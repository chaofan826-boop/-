export interface ProductSpecOption {
  name: string
  values?: string[]
}

export type SkuSpecValues = Record<string, string>

const COLOR_KEYS = ['颜色', 'color', 'Color']
const SIZE_KEYS = ['尺寸', '尺码', 'size', 'Size']

function pickValue(specValues: SkuSpecValues, keys: string[]): string {
  for (const key of keys) {
    const value = specValues[key]?.trim()
    if (value) return value
  }
  return ''
}

export function getSkuSpecValues(sku: {
  color?: string | null
  size?: string | null
  specValues?: SkuSpecValues | null
}): SkuSpecValues {
  const values: SkuSpecValues = {}
  if (sku.specValues) {
    for (const [key, value] of Object.entries(sku.specValues)) {
      const name = key.trim()
      const val = typeof value === 'string' ? value.trim() : ''
      if (name && val) values[name] = val
    }
  }
  if (!Object.keys(values).length) {
    if (sku.color?.trim()) values['颜色'] = sku.color.trim()
    if (sku.size?.trim()) values['尺寸'] = sku.size.trim()
  }
  return values
}

export function inferSpecOptionsFromSkus(
  skus: Array<{
    color?: string | null
    size?: string | null
    specValues?: SkuSpecValues | null
  }>,
  existing?: ProductSpecOption[] | null,
): ProductSpecOption[] {
  if (existing?.length) {
    return existing.map((option) => ({
      name: option.name,
      values: [...(option.values || [])],
    }))
  }

  const valueMap = new Map<string, Set<string>>()
  for (const sku of skus) {
    const values = getSkuSpecValues(sku)
    for (const [name, value] of Object.entries(values)) {
      if (!valueMap.has(name)) valueMap.set(name, new Set())
      valueMap.get(name)!.add(value)
    }
  }

  return [...valueMap.entries()].map(([name, values]) => ({
    name,
    values: [...values],
  }))
}

export function normalizeSpecOptions(
  options: Array<{ name: string; values: string[] }>,
): ProductSpecOption[] {
  const seen = new Set<string>()
  const result: ProductSpecOption[] = []
  for (const option of options) {
    const name = option.name.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    const values = [...new Set(option.values.map((value) => value.trim()).filter(Boolean))]
    result.push({ name, values: values.length ? values : undefined })
  }
  return result
}

export function formatSpecText(sku: {
  color?: string | null
  size?: string | null
  specValues?: SkuSpecValues | null
}): string {
  return Object.values(getSkuSpecValues(sku)).join(' / ')
}

export function buildSpecSignature(specValues: SkuSpecValues): string {
  return Object.entries(specValues)
    .sort(([a], [b]) => a.localeCompare(b, 'zh-CN'))
    .map(([name, value]) => `${name}:${value}`)
    .join('|')
}

export function getSpecValueOptions(
  specName: string,
  presetValues: string[],
  skus: Array<{ specValues?: SkuSpecValues | null; color?: string | null; size?: string | null }>,
): string[] {
  const fromSkus = skus
    .map((sku) => getSkuSpecValues(sku)[specName])
    .filter(Boolean)
  return [...new Set([...presetValues, ...fromSkus])]
}

export { COLOR_KEYS, SIZE_KEYS, pickValue }
