import { getDateTimeFormatter } from './getDateTimeFormatter'

const TOKENS = /'[^']*'|y{1,4}|M{1,4}|d{1,2}|E{1,4}|H{1,2}|h{1,2}|m{1,2}|s{1,2}|S{1,3}|a/g

/** LDML date pattern: `'dd.MM.yyyy HH:mm'`, `'EEEE, d MMMM'`… */
export function formatLdmlDate(date: Date, pattern: string, locale: string): string {
  const pad = (n: number, len: number) => String(n).padStart(len, '0')
  return pattern.replace(TOKENS, (token) => {
    if (token.startsWith("'")) return token.slice(1, -1)
    const len = token.length
    switch (token[0]) {
      case 'y':
        return len === 2 ? pad(date.getFullYear() % 100, 2) : String(date.getFullYear())
      case 'M':
        if (len >= 3)
          return getDateTimeFormatter(locale, { month: len === 3 ? 'short' : 'long' }).format(date)
        return pad(date.getMonth() + 1, len)
      case 'd':
        return pad(date.getDate(), len)
      case 'E':
        return getDateTimeFormatter(locale, { weekday: len === 4 ? 'long' : 'short' }).format(date)
      case 'H':
        return pad(date.getHours(), len)
      case 'h':
        return pad(date.getHours() % 12 || 12, len)
      case 'm':
        return pad(date.getMinutes(), len)
      case 's':
        return pad(date.getSeconds(), len)
      case 'S':
        return pad(date.getMilliseconds(), 3).slice(0, len)
      case 'a':
        return date.getHours() < 12 ? 'AM' : 'PM'
      default:
        return token
    }
  })
}
