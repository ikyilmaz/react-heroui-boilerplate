import { isPlainObject } from './isPlainObject'

/** `'a.b'` → `(target, value) => target.a.b = value`, creating the intermediate objects. */
export function compileSetter(path: string): (target: object, value: unknown) => void {
  const parts = path.split('.')
  return (target, value) => {
    let current = target as Record<string, unknown>
    for (const part of parts.slice(0, -1)) {
      if (!isPlainObject(current[part])) current[part] = {}
      current = current[part] as Record<string, unknown>
    }
    current[parts[parts.length - 1]] = value
  }
}
