const cache = new Map<string, Intl.NumberFormat>()

export function getNumberFormatter(locale: string, options?: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options ?? {})}`
  let formatter = cache.get(key)
  if (!formatter) cache.set(key, (formatter = new Intl.NumberFormat(locale, options)))
  return formatter
}
