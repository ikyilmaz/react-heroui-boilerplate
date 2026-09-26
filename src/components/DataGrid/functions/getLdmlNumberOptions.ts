/**
 * Reads `'#,##0.00'` / `'0.#%'` / `"'#'0"`-style patterns: digits, grouping, affixes. An unquoted
 * `%` means percent (value × 100); quoted text (`'%'`, `'#'`) is literal.
 */
export function getLdmlNumberOptions(pattern: string): {
  options: Intl.NumberFormatOptions
  prefix: string
  suffix: string
  percent: boolean
} {
  // Hide quoted literals so their characters are not read as pattern symbols
  const literals: string[] = []
  const masked = pattern.replace(/'([^']*)'/g, (_, text: string) => {
    literals.push(text)
    // A letter, not a digit: digits are pattern symbols
    return `\uE000${String.fromCharCode(65 + literals.length - 1)}\uE000`
  })
  const restore = (s: string) =>
    s.replace(/\uE000([A-Z])\uE000/g, (_, c: string) => literals[c.charCodeAt(0) - 65])
  const match = /^([^#0,.]*)([#0,.]+)(.*)$/.exec(masked)
  const [, prefix = '', body = '0', suffix = ''] = match ?? []
  const [integer, fraction = ''] = body.split('.')
  const minFraction = (fraction.match(/0/g) ?? []).length
  return {
    options: {
      useGrouping: integer.includes(','),
      minimumIntegerDigits: Math.max(1, (integer.match(/0/g) ?? []).length),
      minimumFractionDigits: minFraction,
      maximumFractionDigits: Math.max(minFraction, fraction.length),
    },
    prefix: restore(prefix),
    suffix: restore(suffix),
    percent: masked.includes('%'),
  }
}
