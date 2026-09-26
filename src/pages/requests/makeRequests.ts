import { REQUEST_STARTERS } from './requestStarters'
import type { Request } from './Request'
import type { RequestStatus } from './RequestStatus'

const STATUSES: RequestStatus[] = ['waiting', 'urgent', 'info', 'approved']

/**
 * Showcase data. Deterministic pseudo-random (fixed-seed LCG): paging and search need many rows,
 * but the same table should come up every time.
 */
export function makeRequests(count: number): Request[] {
  let seed = 20260920
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
  const pick = <T,>(list: readonly T[]) => list[Math.floor(next() * list.length)]

  return Array.from({ length: count }, (_, i) => {
    const month = 3 + Math.floor(next() * 7)
    const day = 1 + Math.floor(next() * 28)
    const status = pick(STATUSES)
    return {
      id: `r${i + 1}`,
      requestNo: 152512 - i * 7 - Math.floor(next() * 5),
      starter: pick(REQUEST_STARTERS),
      processStart: new Date(2026, month - 1, day, 8 + Math.floor(next() * 10), Math.floor(next() * 12) * 5),
      requestDate: new Date(2026, month - 1, day),
      amount: (1 + Math.floor(next() * 400)) * 250,
      progress: status === 'approved' ? 100 : Math.floor(next() * 20) * 5,
      status,
    }
  })
}
