import { useMemo, useSyncExternalStore } from 'react'
import { boxes, requestsOf, type BoxId, type Decision } from '@/pages/workflows/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Onay / ret kararları
 *
 * Maket olduğu için sunucu yok; kararlar bellekte tutuluyor. Liste sayfaları buna abone olup
 * karar verilmiş talepleri "Bekleyen Onaylar"dan düşüyor, sayılar da buna göre güncelleniyor.
 * ------------------------------------------------------------------------------------------------- */

export interface DecisionRecord {
  decision: Decision
  note: string
  at: Date
}

let state: ReadonlyMap<string, DecisionRecord> = new Map()
const listeners = new Set<() => void>()

export function decide(id: string, decision: Decision, note: string) {
  state = new Map(state).set(id, { decision, note, at: new Date() })
  listeners.forEach((l) => l())
}

export function undoDecision(id: string) {
  const next = new Map(state)
  next.delete(id)
  state = next
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useDecisions() {
  return useSyncExternalStore(subscribe, () => state)
}

/**
 * Kutudaki talepler; "Bekleyen Onaylar"dan karar verilmiş olanlar düşülür. Kanca dışında da
 * (örn. tüm kutuların sayısını tek abonelikle hesaplarken) aynı kural kullanılsın diye ayrı.
 */
export function boxRequests(box: BoxId, decisions: ReadonlyMap<string, DecisionRecord>) {
  return box === 'bekleyen' ? requestsOf(box).filter((r) => !decisions.has(r.id)) : requestsOf(box)
}

/** Kutudaki talepler, kararlar değiştikçe güncellenir (bkz. `boxRequests`). */
export function useBoxRequests(box: BoxId) {
  const decisions = useDecisions()
  return useMemo(() => boxRequests(box, decisions), [box, decisions])
}

/** Her kutunun talep sayısı tek abonelikle (kutu sekmeleri ve gelen kutusu menüsü için). */
export function useBoxCounts(): ReadonlyMap<BoxId, number> {
  const decisions = useDecisions()
  return useMemo(() => new Map(boxes.map((b) => [b.id, boxRequests(b.id, decisions).length])), [decisions])
}
