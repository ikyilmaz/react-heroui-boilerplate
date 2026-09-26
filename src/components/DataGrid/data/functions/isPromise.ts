export function isPromise<T>(value: unknown): value is Promise<T> {
  return typeof (value as { then?: unknown } | null)?.then === 'function'
}
