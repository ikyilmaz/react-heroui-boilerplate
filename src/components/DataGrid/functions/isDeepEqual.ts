/** Structural equality of option values: plain objects and arrays by content, the rest by identity. */
export function isDeepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (Array.isArray(a) && Array.isArray(b))
    return a.length === b.length && a.every((v, i) => isDeepEqual(v, b[i]))
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const pa = Object.getPrototypeOf(a)
    if (pa !== Object.prototype || Object.getPrototypeOf(b) !== Object.prototype) return false
    const ka = Object.keys(a)
    const kb = Object.keys(b)
    return (
      ka.length === kb.length &&
      ka.every((k) => isDeepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
    )
  }
  return false
}
