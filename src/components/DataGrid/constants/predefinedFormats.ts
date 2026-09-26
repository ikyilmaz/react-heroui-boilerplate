import type { PredefinedFormat } from '../types/PredefinedFormat'

export const NUMBER_FORMATS = new Set<PredefinedFormat>([
  'currency',
  'fixedPoint',
  'decimal',
  'percent',
  'exponential',
  'largeNumber',
  'thousands',
  'millions',
  'billions',
  'trillions',
])

export const DATE_FORMATS = new Set<PredefinedFormat>([
  'shortDate',
  'longDate',
  'shortTime',
  'longTime',
  'shortDateShortTime',
  'longDateLongTime',
  'monthAndDay',
  'monthAndYear',
  'quarterAndYear',
  'year',
  'quarter',
  'month',
  'day',
  'dayOfWeek',
  'hour',
  'minute',
  'second',
  'millisecond',
])
