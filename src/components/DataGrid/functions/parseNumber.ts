import { getNumberSeparators } from './getNumberSeparators'

/** `'₺48.500'`, `'%45'`, `'#152356'` → numbers; text without digits → undefined. */
export function parseNumber(text: string, locale: string): number | undefined {
  const { group, decimal } = getNumberSeparators(locale)
  let s = text.trim().split(group).join('')
  if (decimal !== '.') s = s.split(decimal).join('.')
  s = s.replace(/[^\d.+-]/g, '')
  if (!/\d/.test(s)) return undefined
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}
