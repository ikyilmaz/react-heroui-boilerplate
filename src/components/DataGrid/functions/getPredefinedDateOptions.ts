import type { PredefinedFormat } from '../types/PredefinedFormat'

export function getPredefinedDateOptions(type: PredefinedFormat): Intl.DateTimeFormatOptions | undefined {
  switch (type) {
    case 'shortDate':
      return { dateStyle: 'short' }
    case 'longDate':
      return { dateStyle: 'full' }
    case 'shortTime':
      return { timeStyle: 'short' }
    case 'longTime':
      return { timeStyle: 'medium' }
    case 'shortDateShortTime':
      return { dateStyle: 'short', timeStyle: 'short' }
    case 'longDateLongTime':
      return { dateStyle: 'full', timeStyle: 'medium' }
    case 'monthAndDay':
      return { month: 'long', day: 'numeric' }
    case 'monthAndYear':
      return { month: 'long', year: 'numeric' }
    case 'year':
      return { year: 'numeric' }
    case 'month':
      return { month: 'long' }
    case 'day':
      return { day: 'numeric' }
    case 'dayOfWeek':
      return { weekday: 'long' }
    case 'hour':
      return { hour: '2-digit', hourCycle: 'h23' }
    case 'minute':
      return { minute: '2-digit' }
    case 'second':
      return { second: '2-digit' }
    default:
      return undefined
  }
}
