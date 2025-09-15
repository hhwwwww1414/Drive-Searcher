const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const opts: Intl.NumberFormatOptions = {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    ...options,
  }
  const key = JSON.stringify(opts)
  if (!formatterCache.has(key)) {
    formatterCache.set(key, new Intl.NumberFormat('ru-RU', opts))
  }
  return formatterCache.get(key)!
}

export function formatCurrency(
  value: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (value == null || Number.isNaN(value)) return '—'
  return getFormatter(options).format(value)
}
