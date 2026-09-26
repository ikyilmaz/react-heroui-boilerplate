const cache = new Map<string, Intl.DateTimeFormat>()

export function getDateTimeFormatter(
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options ?? {})}`
  let formatter = cache.get(key)
  if (!formatter) cache.set(key, (formatter = new Intl.DateTimeFormat(locale, options)))
  return formatter
}
