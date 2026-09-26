const cache = new Map<string, { group: string; decimal: string }>()

export function getNumberSeparators(locale: string): { group: string; decimal: string } {
  let result = cache.get(locale)
  if (!result) {
    const parts = new Intl.NumberFormat(locale).formatToParts(12345.6)
    result = {
      group: parts.find((p) => p.type === 'group')?.value ?? ',',
      decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
    }
    cache.set(locale, result)
  }
  return result
}
