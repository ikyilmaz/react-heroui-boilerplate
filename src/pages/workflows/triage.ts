import { useSyncExternalStore } from 'react'
import type { WorkRequest } from '@/pages/workflows/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Ana sayfanın küçük durum depoları: erteleme, okundu bilgisi, hatırlatma ve bilgi yanıtı
 *
 * `decisions.ts` ile aynı desen: sunucu olmadığı için her şey bellekte tutulur ve
 * `useSyncExternalStore` ile okunur. Maket olduğundan sayfa yenilenince hepsi sıfırlanır; bu
 * bilinçli (kalıcı olan yalnızca yerleşim, sık kullanılanlar ve kısayol tercihi).
 * ------------------------------------------------------------------------------------------------- */

/** Değişmez anlık görüntü tutan küçük bir abonelik deposu. */
export function createStore<T>(initial: T) {
  let state = initial
  const listeners = new Set<() => void>()
  const subscribe = (l: () => void) => {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  }
  return {
    get: () => state,
    set(next: T | ((prev: T) => T)) {
      const value = typeof next === 'function' ? (next as (prev: T) => T)(state) : next
      if (Object.is(value, state)) return
      state = value
      listeners.forEach((l) => l())
    },
    subscribe,
    /** Bileşende okuma; değer değiştikçe yeniden çizer. */
    use: () => useSyncExternalStore(subscribe, () => state, () => state),
  }
}

/** Haritaya ekleyip / haritadan silip yeni bir harita döndürür (anlık görüntü değişmez kalsın). */
function withEntry<V>(m: ReadonlyMap<string, V>, id: string, v: V): ReadonlyMap<string, V> {
  return new Map(m).set(id, v)
}
function withoutEntry<V>(m: ReadonlyMap<string, V>, id: string): ReadonlyMap<string, V> {
  if (!m.has(id)) return m
  const next = new Map(m)
  next.delete(id)
  return next
}

/* ---- Erteleme ("Sonra") ------------------------------------------------------------------------ */

const snoozeStore = createStore<ReadonlyMap<string, Date>>(new Map())

/** Talebi `until` anına kadar kuyruktan çıkarır. */
export function snooze(id: string, until: Date) {
  snoozeStore.set((m) => withEntry(m, id, until))
}

/** Ertelemeyi kaldırır; talep kuyruktaki öncelik yerine döner ("Geri getir", "Geri al"). */
export function unsnooze(id: string) {
  snoozeStore.set((m) => withoutEntry(m, id))
}

/** Ertelenen talepler ve geri gelecekleri an. Süresi geçmiş kayıtlar da burada durur; `isSnoozed` bakar. */
export function useSnoozes(): ReadonlyMap<string, Date> {
  return snoozeStore.use()
}

/** Talep şu an ertelenmiş mi (geri gelme anı henüz gelmedi). */
export function isSnoozed(id: string, snoozes: ReadonlyMap<string, Date>, now = Date.now()) {
  const until = snoozes.get(id)
  return !!until && until.getTime() > now
}

export type SnoozeTargetId = 'yarin' | 'pazartesi' | 'hafta'

export interface SnoozeTarget {
  id: SnoozeTargetId
  label: string
  until: Date
}

/** Erteleme seçenekleri: yarın 09:00, gelecek pazartesi 09:00, bir hafta sonra 09:00. */
export function snoozeTargets(now = new Date()): SnoozeTarget[] {
  const at9 = (daysAhead: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + daysAhead)
    d.setHours(9, 0, 0, 0)
    return d
  }
  // Pazartesi = 1; bugün pazartesiyse bir sonraki pazartesi
  const toMonday = ((8 - now.getDay()) % 7) || 7
  return [
    { id: 'yarin', label: 'Yarın sabah', until: at9(1) },
    { id: 'pazartesi', label: 'Pazartesi sabahı', until: at9(toMonday) },
    { id: 'hafta', label: 'Gelecek hafta', until: at9(7) },
  ]
}

/* ---- Okundu / okunmadı ------------------------------------------------------------------------- */

const readStore = createStore<ReadonlyMap<string, boolean>>(new Map())

/** Talebi okundu işaretler (maket verisindeki `read`'i ezer). */
export function markRead(id: string) {
  readStore.set((m) => (m.get(id) === false ? m : withEntry(m, id, false)))
}

/** Talebi okunmadı işaretler. */
export function markUnread(id: string) {
  readStore.set((m) => (m.get(id) === true ? m : withEntry(m, id, true)))
}

/** Birden çok talebi tek seferde okundu işaretler ("Tümünü okundu say"). */
export function markAllRead(ids: readonly string[]) {
  readStore.set((m) => {
    const next = new Map(m)
    ids.forEach((id) => next.set(id, false))
    return next
  })
}

/** Kullanıcının okundu bilgisini değiştirdiği talepler: `true` okunmadı, `false` okundu. */
export function useReadOverrides(): ReadonlyMap<string, boolean> {
  return readStore.use()
}

/** Talep okunmamış mı: önce kullanıcının işareti, yoksa maket verisi. */
export function isUnread(r: WorkRequest, overrides: ReadonlyMap<string, boolean>) {
  return overrides.get(r.id) ?? !r.read
}

/** Okundu bilgisini tersine çevirir (klavyede E). */
export function toggleRead(r: WorkRequest) {
  if (isUnread(r, readStore.get())) markRead(r.id)
  else markUnread(r.id)
}

/* ---- Hatırlatma -------------------------------------------------------------------------------- */

const reminderStore = createStore<ReadonlyMap<string, Date>>(new Map())

/** Adım sahibine hatırlatma gönderildi (maket: yalnızca zamanı tutulur). */
export function remind(id: string) {
  reminderStore.set((m) => withEntry(m, id, new Date()))
}

/** Hatırlatmayı geri alır. */
export function unremind(id: string) {
  reminderStore.set((m) => withoutEntry(m, id))
}

/** Hatırlatma gönderilen talepler ve gönderim anı. */
export function useReminders(): ReadonlyMap<string, Date> {
  return reminderStore.use()
}

/** Bugün hatırlatma gönderildi mi. */
export function remindedToday(id: string, reminders: ReadonlyMap<string, Date>) {
  const at = reminders.get(id)
  if (!at) return false
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return at >= start
}

/* ---- Bilgi isteğine yanıt ---------------------------------------------------------------------- */

export interface AnswerRecord {
  note: string
  at: Date
}

const answerStore = createStore<ReadonlyMap<string, AnswerRecord>>(new Map())

/** "Sizden bilgi istendi" talebine yanıt verildi; talep yeniden "ilerliyor" sayılır. */
export function answer(id: string, note: string) {
  answerStore.set((m) => withEntry(m, id, { note, at: new Date() }))
}

/** Yanıtı geri alır. */
export function unanswer(id: string) {
  answerStore.set((m) => withoutEntry(m, id))
}

/** Yanıt verilen talepler. */
export function useAnswers(): ReadonlyMap<string, AnswerRecord> {
  return answerStore.use()
}
