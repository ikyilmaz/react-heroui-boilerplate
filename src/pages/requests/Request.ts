import type { RequestStatus } from './RequestStatus'

/**
 * Every inline-edited field has a clear (×) button, so they may be `null`; an empty cell shows as
 * empty text and matches no filter. Dates are `Date`s, as DevExtreme's date columns expect.
 */
export interface Request {
  id: string
  requestNo: number | null
  starter: string
  processStart: Date | null
  requestDate: Date | null
  /** TRY */
  amount: number | null
  /** 0–100 */
  progress: number | null
  status: RequestStatus
}
