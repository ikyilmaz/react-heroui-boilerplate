import { useMemo, useSyncExternalStore } from 'react'
import {
  CURRENT_USER,
  boxes,
  findEvent,
  findRequest,
  menuApps,
  people,
  processOf,
  requestsOf,
  RECENT_LIMIT,
  type BoxId,
  type FlowEvent,
  type HistoryEntry,
  type MenuApp,
  type Person,
  type RequestStatus,
  type WorkRequest,
} from '@/synergy/shared/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Bellekteki sunucu durumu (maket)
 *
 * Orijinalde sunucuda olan her değişiklik burada, tek bir küçük depoda:
 * - kararlar: `decide(requestId, eventId, { reason, forwardTo })` (SaveAndContinue; geri alma yok),
 * - okunma: `markRead(id)` (MarkWorkflowItemAsRead; yalnızca açınca, "okunmadı" yapılamaz),
 * - taslak silme: `deleteDraft(id)` (DeleteDraftDocument),
 * - görüntülenen dokümanlar: `markDocumentViewed(requestId, docId)`,
 * - favori uygulamalar: `togglePin(appId)` (MenuManager.PinRecentlyMenuItem).
 * Sayfa yenilenince her şey sıfırlanır. Her dilim değişince yeni bir nesne olur; kancalar dilime
 * abone olur (`useSyncExternalStore`).
 * ------------------------------------------------------------------------------------------------- */

interface DecisionRecord {
  requestId: string
  eventId: number
  /** Olayın metni ("Onayla", "Reddet", "Yönlendir"...). */
  eventText: string
  kind: FlowEvent['kind']
  reason?: string
  /** Yönlendir olayında seçilen kullanıcı. */
  forwardTo?: Person
  at: Date
}

interface State {
  decisions: ReadonlyMap<string, DecisionRecord>
  read: ReadonlySet<string>
  deletedDrafts: ReadonlySet<string>
  viewedDocs: ReadonlySet<string>
  /** Favori durumu değiştirilen uygulamalar: id → pinned. */
  pins: ReadonlyMap<string, boolean>
}

let state: State = {
  decisions: new Map(),
  read: new Set(),
  deletedDrafts: new Set(),
  viewedDocs: new Set(),
  pins: new Map(),
}
const listeners = new Set<() => void>()

function commit(next: Partial<State>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

function useSlice<K extends keyof State>(key: K): State[K] {
  return useSyncExternalStore(
    subscribe,
    () => state[key],
    () => state[key],
  )
}

/* --- Kararlar ---------------------------------------------------------------------------------- */

/**
 * Olayı talebe uygular (onay / sebep / yönlendirme pencereleri arayüzde önceden geçilmiş olmalı).
 * Talep Bekleyen Onaylar'dan düşer, Geçmiş › Onaylar'a eklenir, tarihçe uzar. Geri alınamaz.
 */
export function decide(requestId: string, eventId: number, opts: { reason?: string; forwardTo?: Person } = {}) {
  const r = findRequest(requestId)
  const event = r && findEvent(r, eventId)
  if (!r || !event || !event.enable || state.decisions.has(requestId)) return
  const record: DecisionRecord = {
    requestId,
    eventId,
    eventText: event.description,
    kind: event.kind,
    at: new Date(),
    ...(opts.reason?.trim() && { reason: opts.reason.trim() }),
    ...(opts.forwardTo && { forwardTo: opts.forwardTo }),
  }
  commit({ decisions: new Map(state.decisions).set(requestId, record), read: new Set(state.read).add(requestId) })
}

/** Karardan sonraki durum: onay son adımdaysa Tamamlandı, ret Reddedildi, diğerleri Devam ediyor. */
function statusAfter(r: WorkRequest, d: DecisionRecord): RequestStatus {
  if (d.kind === 'reject') return 'Reddedildi'
  if (d.kind === 'approve' && r.step + 1 >= processOf(r).steps.length) return 'Tamamlandı'
  return 'Devam ediyor'
}

/**
 * Kararın talebe yansımış hâli: tarihçede bekleyen adım yanıtlanır, ardından sıradaki adım
 * (onay), yönlendirilen kişi (yönlendir), bir önceki adım (geri gönder) bekler ya da akış biter
 * (ret, son adım onayı). Kutu `gecmis-onaylar` olur.
 */
export function withDecision(r: WorkRequest, d: DecisionRecord | undefined): WorkRequest {
  if (!d) return r
  const p = processOf(r)
  const status = statusAfter(r, d)
  const history: HistoryEntry[] = r.history.map((h) =>
    h.type === 'approver' && !h.responseDate
      ? { ...h, responseDate: d.at, eventText: d.eventText, ...(d.reason && { reason: d.reason }) }
      : h,
  )
  const waiting = (step: number, approver: Person): HistoryEntry => ({
    id: `${r.id}-d${step}`,
    step: p.steps[step],
    type: 'approver',
    approver,
    actionerType: 'self',
    requestDate: d.at,
  })
  let step = r.step
  if (d.kind === 'forward' && d.forwardTo) history.push(waiting(r.step, d.forwardTo))
  else if (d.kind === 'sendBack' && r.step > 0) {
    step = r.step - 1
    const prev = r.history.find((h) => h.step === p.steps[step])?.approver ?? r.requester
    history.push(waiting(step, prev))
  } else if (d.kind === 'approve') {
    step = r.step + 1
    if (step < p.steps.length) history.push(waiting(step, nextOwner(r, step)))
  }
  if (status === 'Tamamlandı' || status === 'Reddedildi') {
    if (d.kind === 'approve') step = p.steps.length
    history.push({ id: `${r.id}-de`, step: 'Akış sonlandı', type: 'end', actionerType: 'self', requestDate: d.at, responseDate: d.at })
  }
  return { ...r, box: 'gecmis-onaylar', status, step, responseDate: d.at, read: true, history }
}

/** Onaydan sonraki adımın sahibi: kullanıcı ve talep sahibi dışındaki maket kişilerden. */
function nextOwner(r: WorkRequest, step: number): Person {
  const others = people.filter((x) => x.name !== CURRENT_USER.name && x.name !== r.requester.name)
  return others[(r.processNo + step * 5) % others.length] ?? r.requester
}

/* --- Okunma ------------------------------------------------------------------------------------ */

/** Talebi okundu yapar (ayrıntı açılınca). Geri alınamaz. */
export function markRead(requestId: string) {
  if (state.read.has(requestId)) return
  commit({ read: new Set(state.read).add(requestId) })
}

export function useReadIds() {
  return useSlice('read')
}

/** Talep okunmuş mu (ham `read` + bu oturumda açılanlar). */
export function isRead(r: WorkRequest, readIds: ReadonlySet<string>) {
  return r.read || readIds.has(r.id)
}

/* --- Taslaklar --------------------------------------------------------------------------------- */

/** Taslağı siler ("Silmek istediğinize emin misiniz?" onayından sonra). */
export function deleteDraft(requestId: string) {
  commit({ deletedDrafts: new Set(state.deletedDrafts).add(requestId) })
}

/* --- Dokümanlar -------------------------------------------------------------------------------- */

export function markDocumentViewed(requestId: string, docId: number) {
  const key = `${requestId}:${docId}`
  if (state.viewedDocs.has(key)) return
  commit({ viewedDocs: new Set(state.viewedDocs).add(key) })
}

/** Bu talepte görüntülenmiş doküman numaraları. */
export function useViewedDocuments(requestId: string | undefined): ReadonlySet<number> {
  const viewed = useSlice('viewedDocs')
  return useMemo(() => {
    const out = new Set<number>()
    if (!requestId) return out
    for (const k of viewed) if (k.startsWith(`${requestId}:`)) out.add(Number(k.slice(requestId.length + 1)))
    return out
  }, [viewed, requestId])
}

/* --- Kutular ----------------------------------------------------------------------------------- */

/**
 * Kutudaki güncel talepler (saf; kanca dışında da kullanılabilir): Bekleyen Onaylar'dan karar
 * verilenler düşer ve Geçmiş › Onaylar'ın başına eklenir; silinen taslaklar düşer.
 */
function boxRequests(box: BoxId, s: Pick<State, 'decisions' | 'deletedDrafts'> = state): WorkRequest[] {
  const base = requestsOf(box)
  switch (box) {
    case 'bekleyen':
      return base.filter((r) => !s.decisions.has(r.id))
    case 'gecmis-onaylar': {
      const decided = requestsOf('bekleyen')
        .filter((r) => s.decisions.has(r.id))
        .map((r) => withDecision(r, s.decisions.get(r.id)))
      return [...decided, ...base]
    }
    case 'taslaklar':
      return base.filter((r) => !s.deletedDrafts.has(r.id))
    default:
      return base
  }
}

/** Kutudaki talepler; kararlar ve taslak silme değiştikçe güncellenir. */
export function useBoxRequests(box: BoxId) {
  const decisions = useSlice('decisions')
  const deletedDrafts = useSlice('deletedDrafts')
  return useMemo(() => boxRequests(box, { decisions, deletedDrafts }), [box, decisions, deletedDrafts])
}

/**
 * Her kutunun talep sayısı (menü, süreç listesi, kategori düğmeleri). `unreadInfo: true` ile
 * Bilgilendirmeler okunmamışları sayar (orijinalde başlangıçtaki sayı açınca bir azalır).
 */
export function useBoxCounts(opts: { unreadInfo?: boolean } = {}): ReadonlyMap<BoxId, number> {
  const decisions = useSlice('decisions')
  const deletedDrafts = useSlice('deletedDrafts')
  const read = useSlice('read')
  const unreadInfo = !!opts.unreadInfo
  return useMemo(
    () =>
      new Map(
        boxes.map((b) => {
          const rs = boxRequests(b.id, { decisions, deletedDrafts })
          return [b.id, unreadInfo && b.id === 'bilgilendirmeler' ? rs.filter((r) => !isRead(r, read)).length : rs.length]
        }),
      ),
    [decisions, deletedDrafts, read, unreadInfo],
  )
}

/**
 * Kimliğe göre güncel talep (kararı işlenmiş hâli) ve kararı. Ayrıntı sayfası bunu kullanır; karar
 * verilmiş bir Bekleyen Onaylar talebi `gecmis-onaylar` kutusunda, uzamış tarihçesiyle döner.
 */
export function useRequest(requestId: string | undefined): { request?: WorkRequest; decision?: DecisionRecord; deleted: boolean } {
  const decisions = useSlice('decisions')
  const deletedDrafts = useSlice('deletedDrafts')
  return useMemo(() => {
    const raw = findRequest(requestId)
    const decision = requestId ? decisions.get(requestId) : undefined
    return {
      ...(raw && { request: withDecision(raw, decision) }),
      ...(decision && { decision }),
      deleted: !!requestId && deletedDrafts.has(requestId),
    }
  }, [requestId, decisions, deletedDrafts])
}

/* --- Menü uygulamaları ------------------------------------------------------------------------- */

/** Favori durumunu çevirir (Favorilere Ekle / Favorilerden Kaldır). */
export function togglePin(appId: string) {
  const current = state.pins.get(appId) ?? menuApps.find((a) => a.id === appId)?.pinned ?? false
  commit({ pins: new Map(state.pins).set(appId, !current) })
}

/** Son kullanılanlar (ilk 20) ve favoriler (pinned); her ikisinde de güncel `pinned`. */
export function useMenuApps(): { recent: MenuApp[]; favorites: MenuApp[] } {
  const pins = useSlice('pins')
  return useMemo(() => {
    const all = menuApps.map((a) => (pins.has(a.id) ? { ...a, pinned: pins.get(a.id)! } : a))
    return { recent: all.slice(0, RECENT_LIMIT), favorites: all.filter((a) => a.pinned) }
  }, [pins])
}
