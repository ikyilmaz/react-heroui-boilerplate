import { getDatePartOrder } from './getDatePartOrder'

/** `'1.03.2026'`, `'01/03/26 13:55'` (in the locale's part order) → Date; otherwise undefined. */
export function parseDate(text: string, locale: string): Date | undefined {
  const numbers = text.match(/\d+/g)?.map(Number)
  if (!numbers || numbers.length < 3) return undefined
  const parts: Record<string, number> = {}
  getDatePartOrder(locale).forEach((part, i) => (parts[part] = numbers[i]))
  let { year } = parts
  const { month, day } = parts
  if (year < 100) year += 2000
  const [hour = 0, minute = 0] = numbers.slice(3)
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) return undefined
  const date = new Date(year, month - 1, day, hour, minute)
  return date.getMonth() === month - 1 ? date : undefined
}
