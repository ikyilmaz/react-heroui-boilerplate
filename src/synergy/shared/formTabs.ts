import type { PanelSize } from '@/synergy/shared/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Form sekmelerinin durumu (FormTabs.tsx çizer): hangi formlar açık, hangi sekmede, yan yana mı.
 * Saf işlevler, React yok; `useReducer` ile kullanılır. Kurallar (orijinaldeki panel mantığı):
 * - Child panel boyutuna göre açılır: 1 / 2 sekmeyi böler (child sağda ⅓ / ⅔, açan form solda),
 *   3 yeni sekmede açılır. Bölünmüş sekmede yine 1 / 2 açılırsa şerit kayar: açan form ile child
 *   yan yana kalır, sığmayan form kendi sekmesine çıkar; child kapanınca (düzen o arada
 *   değişmediyse) yerine döner.
 * - Bir formun aynı anda tek child'ı açık olur: yenisi öncekini (açtıklarıyla birlikte) kapatır.
 * - Kapanan form açtığı child'larla birlikte kapanır; seçili sekme kapandıysa açanın sekmesine
 *   dönülür. Ana form kapanmaz.
 * Değişiklik yoksa aynı durum döner (React yeniden çizmez).
 * ------------------------------------------------------------------------------------------------- */

/** Açılışta bölmeden çıkarılan form: child kapanınca kendi sekmesinden yan bölmeye döner. */
interface Undo {
  /** Child'ın açıldığı sekme. */
  view: string
  /** Çıkarılan formun sekmesi. */
  out: string
  /** Çıkarılan form solda mıydı. */
  left: boolean
  /** Sekmenin önceki payları. */
  ratio: number
  base: number
}

interface Entry {
  id: string
  /** Açan form (ana form ya da başka bir child). */
  parent: string
  undo?: Undo
}

/** Sekme: tek form ya da yan yana iki form (gruplu sekme). */
export interface View {
  key: string
  /** Formlar, soldan sağa (bir ya da iki). */
  ids: string[]
  /** Odaktaki form: sekmede vurgulu, dar ekranda görünen. */
  focus: string
  /** Sol bölmenin payı (%). */
  ratio: number
  /** Panel boyutundan gelen pay: bölücüye çift tıklanınca buna dönülür. */
  base: number
}

export interface TabsState {
  rootId: string
  /** Açık child formlar (açılış sırasıyla). */
  entries: Entry[]
  views: View[]
  /** Seçili sekme. */
  active: string
  /** Yeni sekme anahtarları için sayaç. */
  seq: number
}

export type TabsAction =
  /** `size`: dar ekran düzeltmesinden geçmiş panel boyutu. */
  | { type: 'open'; from: string; id: string; size: PanelSize }
  | { type: 'close'; id: string }
  | { type: 'focus'; view: string; id: string }
  | { type: 'swap'; view: string }
  | { type: 'ungroup'; view: string }
  | { type: 'join'; view: string }
  /** Seçili sekmenin sol bölme payı: kesin değer ya da öncekine eklenen. */
  | { type: 'ratio'; value: number }
  | { type: 'nudge'; delta: number }

/** Bölücü sınırları (%) ve tutunma noktaları (üçte bir, yarı, üçte iki). */
export const SPLIT_MIN = 30
export const SPLIT_MAX = 70
const SNAPS = [100 / 3, 50, 200 / 3]

export function clampRatio(v: number) {
  const c = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, v))
  return SNAPS.find((p) => Math.abs(p - c) < 1.5) ?? c
}

/** Child'ın panel boyutuna göre sol bölmenin (açan formun) payı. */
const LEFT_SHARE = { 1: 200 / 3, 2: 100 / 3 } as const

const single = (key: string, id: string): View => ({
  key,
  ids: [id],
  focus: id,
  ratio: 50,
  base: 50,
})

export const initTabs = (rootId: string): TabsState => ({
  rootId,
  entries: [],
  views: [single('root', rootId)],
  active: 'root',
  seq: 0,
})

export const activeView = (s: TabsState) => s.views.find((v) => v.key === s.active) ?? s.views[0]!

/** Bir kaydın kendisi ve tüm alt kayıtları. */
function withDescendants(entries: Entry[], id: string): Set<string> {
  const out = new Set([id])
  let grew = true
  while (grew) {
    grew = false
    for (const e of entries)
      if (out.has(e.parent) && !out.has(e.id)) {
        out.add(e.id)
        grew = true
      }
  }
  return out
}

function openIn(prev: TabsState, from: string, id: string, size: PanelSize): TabsState {
  // Zaten açıksa sekmesine geçilir
  const known = prev.views.find((v) => v.ids.includes(id))
  if (known) return focusIn(prev, known.key, id)
  // Formun tek child'ı olur: açık child'ı kapanır (çıkardığı form yerine döner), yenisi açılır
  const s = prev.entries
    .filter((e) => e.parent === from)
    .reduce((acc, e) => closeIn(acc, e.id), prev)
  const host = s.views.find((v) => v.ids.includes(from))
  if (!host) return prev
  const at = s.views.indexOf(host)
  const views = [...s.views]
  let seq = s.seq

  if (size === 3) {
    // Yeni sekme: açanın (ve onun önceki child'larının) sekmelerinin hemen ardında
    const family = withDescendants(s.entries, from)
    const last = s.views.reduce((n, v, i) => (v.ids.some((x) => family.has(x)) ? i : n), at)
    const key = `v${seq++}`
    views.splice(last + 1, 0, single(key, id))
    return { ...s, entries: [...s.entries, { id, parent: from }], views, active: key, seq }
  }

  // 1 / 2: açan formun yanında. Sekme zaten bölünmüşse yanındaki form kendi sekmesine çıkar
  let undo: Undo | undefined
  if (host.ids.length === 2) {
    const left = host.ids[1] === from
    const out = single(
      `v${seq++}`,
      host.ids.find((x) => x !== from)!,
    )
    views.splice(left ? at : at + 1, 0, out)
    undo = { view: host.key, out: out.key, left, ratio: host.ratio, base: host.base }
  }
  const ratio = LEFT_SHARE[size]
  views[views.indexOf(host)] = { ...host, ids: [from, id], focus: id, ratio, base: ratio }
  return {
    ...s,
    entries: [...s.entries, { id, parent: from, ...(undo && { undo }) }],
    views,
    active: host.key,
    seq,
  }
}

function closeIn(s: TabsState, id: string): TabsState {
  if (id === s.rootId || !s.entries.some((e) => e.id === id)) return s
  const gone = withDescendants(s.entries, id)
  const back = s.entries.find((e) => e.id === id)?.parent ?? s.rootId
  let views = s.views
    .map((v) => {
      const ids = v.ids.filter((x) => !gone.has(x))
      if (ids.length === v.ids.length) return v
      const focus = ids.includes(v.focus) ? v.focus : ids.includes(back) ? back : ids[0]!
      return { ...v, ids, focus }
    })
    .filter((v) => v.ids.length > 0)

  // En yeni açılıştan geriye: child hâlâ açıldığı sekmedeyse ve iki taraf da tek formluysa
  for (const e of [...s.entries].reverse()) {
    const u = e.undo
    if (!u || !gone.has(e.id)) continue
    const host = views.find((v) => v.key === u.view)
    const out = views.find((v) => v.key === u.out)
    const stayed = s.views.find((v) => v.key === u.view)?.ids.includes(e.id)
    if (!host || !out || !stayed || host.ids.length !== 1 || out.ids.length !== 1) continue
    const ids = u.left ? [out.ids[0]!, host.ids[0]!] : [host.ids[0]!, out.ids[0]!]
    views = views
      .filter((v) => v !== out)
      .map((v) => (v === host ? { ...v, ids, ratio: u.ratio, base: u.base } : v))
  }

  // Seçili sekme kapandıysa kapanan formu açanın sekmesine dönülür
  let active = s.active
  if (!views.some((v) => v.key === active)) {
    const home = views.find((v) => v.ids.includes(back)) ?? views[0]!
    active = home.key
    if (home.ids.includes(back)) views = views.map((v) => (v === home ? { ...v, focus: back } : v))
  }
  return { ...s, entries: s.entries.filter((e) => !gone.has(e.id)), views, active }
}

function focusIn(s: TabsState, key: string, id: string): TabsState {
  const v = s.views.find((x) => x.key === key)
  if (!v || !v.ids.includes(id) || (s.active === key && v.focus === id)) return s
  return { ...s, active: key, views: s.views.map((x) => (x === v ? { ...x, focus: id } : x)) }
}

/** Gruplu sekmenin bölmelerinin yerini değiştirir (paylar da yer değiştirir). */
function swapIn(s: TabsState, key: string): TabsState {
  const v = s.views.find((x) => x.key === key)
  if (!v || v.ids.length < 2) return s
  const next = { ...v, ids: [v.ids[1]!, v.ids[0]!], ratio: 100 - v.ratio, base: 100 - v.base }
  return { ...s, views: s.views.map((x) => (x === v ? next : x)) }
}

/** Gruplu sekmeyi iki sekmeye ayırır; odaktaki form seçili kalır. */
function ungroupIn(s: TabsState, key: string): TabsState {
  const i = s.views.findIndex((v) => v.key === key)
  const v = s.views[i]
  if (!v || v.ids.length < 2) return s
  const [a, b] = v.ids as [string, string]
  const other = single(`v${s.seq}`, b)
  const views = [...s.views]
  views.splice(i, 1, { ...v, ids: [a], focus: a, ratio: 50, base: 50 }, other)
  return { ...s, views, active: v.focus === b ? other.key : v.key, seq: s.seq + 1 }
}

/** Tek formlu sekmeyi seçili (tek formlu) sekmenin sağına alır. */
function joinIn(s: TabsState, key: string): TabsState {
  const host = activeView(s)
  const other = s.views.find((v) => v.key === key)
  if (!other || host === other || host.ids.length > 1 || other.ids.length > 1) return s
  const ids = [host.ids[0]!, other.ids[0]!]
  return {
    ...s,
    views: s.views
      .filter((v) => v !== other)
      .map((v) => (v === host ? { ...v, ids, focus: ids[1]!, ratio: 50, base: 50 } : v)),
  }
}

function ratioIn(s: TabsState, value: number): TabsState {
  const v = activeView(s)
  const ratio = clampRatio(value)
  if (v.ids.length < 2 || v.ratio === ratio) return s
  return { ...s, views: s.views.map((x) => (x === v ? { ...x, ratio } : x)) }
}

export function tabsReducer(s: TabsState, a: TabsAction): TabsState {
  switch (a.type) {
    case 'open':
      return openIn(s, a.from, a.id, a.size)
    case 'close':
      return closeIn(s, a.id)
    case 'focus':
      return focusIn(s, a.view, a.id)
    case 'swap':
      return swapIn(s, a.view)
    case 'ungroup':
      return ungroupIn(s, a.view)
    case 'join':
      return joinIn(s, a.view)
    case 'ratio':
      return ratioIn(s, a.value)
    case 'nudge':
      return ratioIn(s, activeView(s).ratio + a.delta)
  }
}
