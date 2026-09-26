import type { Request } from './Request'

/** `rowLabelExpr`: how a request is named in accessible names and announcements. */
export function getRequestLabel(r: Request): string {
  return `#${r.requestNo ?? ''}`
}
