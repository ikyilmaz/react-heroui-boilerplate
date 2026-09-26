import type { Request } from './Request'

/** Initial values of a new request (`onInitNewRow`). */
export function createRequest(): Request {
  const now = new Date()
  now.setSeconds(0, 0)
  return {
    id: `r${Date.now()}`,
    requestNo: 152600 + Math.floor(Math.random() * 100),
    starter: 'Yeni Kullanıcı',
    processStart: now,
    requestDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    amount: 0,
    progress: 0,
    status: 'waiting',
  }
}
