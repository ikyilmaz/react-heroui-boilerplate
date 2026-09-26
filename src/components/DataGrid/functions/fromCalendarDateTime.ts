import type { CalendarDateTime } from '@internationalized/date'

export function fromCalendarDateTime(value: CalendarDateTime | null): Date | null {
  return value ? new Date(value.year, value.month - 1, value.day, value.hour, value.minute) : null
}
