const cache = new Map<string, Intl.Collator>()

export function getCollator(locale?: string, options?: Intl.CollatorOptions): Intl.Collator {
  const key = `${locale ?? ''}|${JSON.stringify(options ?? {})}`
  let collator = cache.get(key)
  if (!collator) cache.set(key, (collator = new Intl.Collator(locale, options)))
  return collator
}
