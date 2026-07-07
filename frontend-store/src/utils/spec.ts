export interface ProductSpecOption {
  name: string
  values?: string[]
}

export type SkuSpecValues = Record<string, string>

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
  if (existing?.length) return existing

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

export function formatSpecText(sku: {
  color?: string | null
  size?: string | null
  specValues?: SkuSpecValues | null
}): string {
  return Object.values(getSkuSpecValues(sku)).join(' / ')
}

export function getSpecValueOptions(
  specName: string,
  presetValues: string[] | undefined,
  skus: Array<{ specValues?: SkuSpecValues | null; color?: string | null; size?: string | null }>,
): string[] {
  const fromSkus = skus
    .map((sku) => getSkuSpecValues(sku)[specName])
    .filter(Boolean)
  return [...new Set([...(presetValues || []), ...fromSkus])]
}

export function skuMatchesSelectedSpecs(
  sku: { color?: string | null; size?: string | null; specValues?: SkuSpecValues | null },
  selected: SkuSpecValues,
  specNames: string[],
): boolean {
  const values = getSkuSpecValues(sku)
  return specNames.every((name) => {
    const selectedValue = selected[name]
    if (!selectedValue) return true
    return values[name] === selectedValue
  })
}
