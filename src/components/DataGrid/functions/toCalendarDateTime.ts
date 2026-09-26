import { CalendarDateTime } from '@internationalized/date'
import { toDate } from './toDate'

/** Data values are `Date`s; the date editor works with `CalendarDateTime`. */
export function toCalendarDateTime(value: unknown): CalendarDateTime | null {
  const d = toDate(value)
  if (!d) return null
  return new CalendarDateTime(d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes())
}
