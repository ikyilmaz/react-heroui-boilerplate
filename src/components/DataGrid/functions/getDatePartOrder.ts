const cache = new Map<string, ('day' | 'month' | 'year')[]>()

/** The order of day, month and year in the locale's short date (`tr`: day, month, year). */
export function getDatePartOrder(locale: string): ('day' | 'month' | 'year')[] {
  let order = cache.get(locale)
  if (!order) {
    order = new Intl.DateTimeFormat(locale)
      .formatToParts(new Date(2000, 10, 22))
      .map((p) => p.type)
      .filter((t): t is 'day' | 'month' | 'year' => t === 'day' || t === 'month' || t === 'year')
    cache.set(locale, order)
  }
  return order
}
