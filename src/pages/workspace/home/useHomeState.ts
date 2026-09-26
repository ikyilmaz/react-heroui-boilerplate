import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Layout } from 'react-grid-layout'
import { COLS, type Density } from '@/pages/workspace/home/metrics'
import {
  findPreset,
  isPresetId,
  isWidgetId,
  minHOf,
  pickPreset,
  presets,
  resolveMode,
  titleOf,
  widgetDefs,
  widgetIds,
  type GridItem,
  type PresetId,
  type WidgetId,
} from '@/pages/workspace/home/registry'
import { toastUndo } from '@/pages/workspace/home/actions'
import { createStore } from '@/pages/workflows/triage'

/* -------------------------------------------------------------------------------------------------
 * Ana sayfa yerleşim durumu
 *
 * Hazır düzen, görünüm (ızgara / tek sütun), yoğunluk, ızgara konumları, tek sütun sırası,
 * gizli widget'lar, kipler, "boşken gizle" ve birkaç küçük tercih. Kişiye özel olduğu için
 * tarayıcıda (`workspace-home-v2`) saklanır; her okuma / yazma try/catch içinde, depo kapalı ya
 * da bozuksa sayfa varsayılanlarla çizilir. Eski panonun (`workspace-dashboard-v1`) yalnızca
 * anlamı korunabilen parçaları taşınır, sonra eski anahtar silinir.
 *
 * Düzenleme kipi (`editing`) oturumluk arayüz durumu; saklanmaz.
 * ------------------------------------------------------------------------------------------------- */

export type HomeView = 'grid' | 'stack'
export type FollowScope = 'baslattiklarim' | 'devam-eden'

/** "Takip ettikleriniz" sekmeleri (sayı yok). */
export const followScopes: { id: FollowScope; label: string }[] = [
  { id: 'baslattiklarim', label: 'Başlattıklarım' },
  { id: 'devam-eden', label: 'Dahil olduklarım' },
]

export interface HomeState {
  version: 2
  /** Kullanıcı düzeni elle değiştirince `ozel`. */
  preset: PresetId | 'ozel'
  /** "Varsayılana dön"ün döneceği düzen (son uygulanan hazır düzen). */
  basePreset: PresetId
  view: HomeView
  density: Density
  /** Izgara konumları; gizli widget'ların son konumu da burada durur. */
  grid: GridItem[]
  /** Tek sütun sırası; gizli olmayan her widget burada. */
  order: WidgetId[]
  hidden: WidgetId[]
  modes: Partial<Record<WidgetId, string>>
  hideWhenEmpty: Partial<Record<WidgetId, boolean>>
  /** Kuyruğun altındaki Kbd ipucu satırı. */
  shortcutHints: boolean
  followScope: FollowScope
  /** "Tam genişlik"ten önceki genişlik ("Önceki genişlik" için). */
  prevW: Partial<Record<WidgetId, number>>
}

export const STORAGE_KEY = 'workspace-home-v2'
export const V1_STORAGE_KEY = 'workspace-dashboard-v1'
export const KEYS_STORAGE_KEY = 'workspace-home-keys-v1'

const DEFAULT_VIEW: HomeView = 'grid'
const DEFAULT_DENSITY: Density = 'comfortable'

/* ---- Izgara yardımcıları ----------------------------------------------------------------------- */

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const int = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : fallback)

function collides(a: GridItem, b: GridItem) {
  return a.i !== b.i && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

const overlapsCols = (a: GridItem, b: GridItem) => a.x < b.x + b.w && b.x < a.x + a.w
const overlapsRows = (a: GridItem, b: GridItem) => a.y < b.y + b.h && b.y < a.y + a.h

/**
 * react-grid-layout'un dikey sıkıştırmasının aynısı (satır, sütun, dizi sırası; önce yukarı
 * kaydır, çakışırsa alta it). Yalnızca `ids` içindeki öğeler sıkıştırılır; diğerleri (gizli
 * widget'ların kayıtlı konumu) olduğu gibi kalır.
 */
function compact(grid: readonly GridItem[], ids: ReadonlySet<WidgetId>): GridItem[] {
  const moving = grid
    .map((it, idx) => ({ it: { ...it }, idx }))
    .filter(({ it }) => ids.has(it.i))
    .sort((a, b) => a.it.y - b.it.y || a.it.x - b.it.x || a.idx - b.idx)
  const placed: GridItem[] = []
  for (const { it } of moving) {
    const bottom = placed.reduce((m, p) => Math.max(m, p.y + p.h), 0)
    it.y = Math.min(bottom, it.y)
    while (it.y > 0 && !placed.some((p) => collides({ ...it, y: it.y - 1 }, p))) it.y--
    let hit: GridItem | undefined
    while ((hit = placed.find((p) => collides(it, p)))) it.y = hit.y + hit.h
    placed.push(it)
  }
  const byId = new Map(placed.map((p) => [p.i, p]))
  return grid.map((it) => byId.get(it.i) ?? it)
}

/** Görünür (gizli olmayan) widget kimlikleri. */
const visibleSet = (s: Pick<HomeState, 'hidden'>) => new Set(widgetIds.filter((id) => !s.hidden.includes(id)))

/** Düzende yeri olmayan widget'ı en alta, sola, en az yarım genişlikte yerleştirir. */
function ensureItem(grid: readonly GridItem[], id: WidgetId, mode: string): GridItem[] {
  if (grid.some((it) => it.i === id)) return [...grid]
  const bottom = grid.reduce((m, it) => Math.max(m, it.y + it.h), 0)
  const def = widgetDefs[id]
  return [...grid, { i: id, x: 0, y: bottom, w: Math.max(def.minW, 6), h: minHOf(id, mode) }]
}

/** Tek bir ızgara öğesini sınırlar içine alır (x, w, y, h ve kipin en küçük yüksekliği). */
function sanitizeItem(raw: Partial<GridItem> & { i: WidgetId }, mode: string): GridItem {
  const def = widgetDefs[raw.i]
  const x = clamp(int(raw.x, 0), 0, COLS - def.minW)
  const w = clamp(int(raw.w, def.minW), def.minW, COLS - x)
  const y = Math.max(0, int(raw.y, 0))
  const h = Math.max(minHOf(raw.i, mode), int(raw.h, 0))
  return { i: raw.i, x, y, w, h }
}

/* ---- Hazır düzenden durum ---------------------------------------------------------------------- */

/** Tek sütun sırası: verilen sıra, sonra düzenin sırası, sonra kalan görünür widget'lar. */
function completeOrder(order: readonly WidgetId[], hidden: readonly WidgetId[], stackOrder: readonly WidgetId[]): WidgetId[] {
  const out: WidgetId[] = []
  for (const id of [...order, ...stackOrder, ...widgetIds]) {
    if (out.includes(id)) continue
    // Kayıtlı sırada gizli widget kalabilir; eksikleri eklerken yalnızca görünenler eklenir
    if (!order.includes(id) && hidden.includes(id)) continue
    out.push(id)
  }
  return out
}

/** Hazır düzenin tam durumu; görünüm, yoğunluk ve takip kapsamı `keep`'ten korunur. */
export function fromPreset(id: PresetId, keep?: Partial<Pick<HomeState, 'view' | 'density' | 'followScope'>>): HomeState {
  const p = findPreset(id) ?? presets[0]
  const modes: Partial<Record<WidgetId, string>> = {}
  for (const w of widgetIds) {
    const m = p.modes[w]
    if (m !== undefined) modes[w] = resolveMode(w, m)
  }
  let grid = p.grid.map((it) => sanitizeItem(it, resolveMode(it.i, modes[it.i])))
  for (const w of widgetIds) if (!p.hidden.includes(w)) grid = ensureItem(grid, w, resolveMode(w, modes[w]))
  return {
    version: 2,
    preset: p.id,
    basePreset: p.id,
    view: keep?.view ?? DEFAULT_VIEW,
    density: keep?.density ?? DEFAULT_DENSITY,
    grid,
    order: completeOrder(p.stackOrder, p.hidden, p.stackOrder),
    hidden: [...p.hidden],
    modes,
    hideWhenEmpty: { ...p.hideWhenEmpty },
    shortcutHints: p.shortcutHints,
    followScope: p.followScope ?? keep?.followScope ?? 'baslattiklarim',
    prevW: {},
  }
}

/* ---- Doğrulama ve taşıma ----------------------------------------------------------------------- */

type Json = Record<string, unknown>
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Kayıtlı v2 durumunu katalogla karşılaştırıp onarır: bilinmeyen widget / kip / düzen atılır,
 * sınır dışı ızgara değerleri kırpılır, eksik öğeler en alta eklenir. `version !== 2` ise `null`.
 */
export function validate(raw: unknown): HomeState | null {
  if (!isObj(raw) || raw.version !== 2) return null
  const basePreset: PresetId = isPresetId(raw.basePreset) ? raw.basePreset : pickPreset()
  const preset: PresetId | 'ozel' = raw.preset === 'ozel' || isPresetId(raw.preset) ? raw.preset : basePreset
  const base = findPreset(basePreset) ?? presets[0]

  const hidden: WidgetId[] = Array.isArray(raw.hidden) ? [...new Set(raw.hidden.filter(isWidgetId))] : [...base.hidden]

  const modes: Partial<Record<WidgetId, string>> = {}
  if (isObj(raw.modes)) {
    for (const [k, v] of Object.entries(raw.modes)) {
      if (isWidgetId(k) && typeof v === 'string' && widgetDefs[k].modes.some((m) => m.id === v)) modes[k] = v
    }
  }

  let grid: GridItem[] = []
  if (Array.isArray(raw.grid)) {
    for (const it of raw.grid) {
      if (!isObj(it) || !isWidgetId(it.i) || grid.some((g) => g.i === it.i)) continue
      grid.push(sanitizeItem({ ...(it as Partial<GridItem>), i: it.i }, resolveMode(it.i, modes[it.i])))
    }
  }
  for (const w of widgetIds) if (!hidden.includes(w)) grid = ensureItem(grid, w, resolveMode(w, modes[w]))

  const savedOrder: WidgetId[] = Array.isArray(raw.order) ? [...new Set(raw.order.filter(isWidgetId))] : []

  const hideWhenEmpty: Partial<Record<WidgetId, boolean>> = {}
  if (isObj(raw.hideWhenEmpty)) {
    for (const [k, v] of Object.entries(raw.hideWhenEmpty)) if (isWidgetId(k) && typeof v === 'boolean') hideWhenEmpty[k] = v
  } else Object.assign(hideWhenEmpty, base.hideWhenEmpty)

  const prevW: Partial<Record<WidgetId, number>> = {}
  if (isObj(raw.prevW)) {
    for (const [k, v] of Object.entries(raw.prevW)) {
      if (isWidgetId(k) && typeof v === 'number' && Number.isFinite(v)) prevW[k] = clamp(Math.round(v), widgetDefs[k].minW, COLS)
    }
  }

  return {
    version: 2,
    preset,
    basePreset,
    view: raw.view === 'grid' || raw.view === 'stack' ? raw.view : DEFAULT_VIEW,
    density: raw.density === 'comfortable' || raw.density === 'compact' ? raw.density : DEFAULT_DENSITY,
    grid,
    order: completeOrder(savedOrder, hidden, base.stackOrder),
    hidden,
    modes,
    hideWhenEmpty,
    shortcutHints: typeof raw.shortcutHints === 'boolean' ? raw.shortcutHints : base.shortcutHints,
    followScope: raw.followScope === 'baslattiklarim' || raw.followScope === 'devam-eden' ? raw.followScope : 'baslattiklarim',
    prevW,
  }
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? undefined : JSON.parse(raw)
  } catch {
    // Bozuk JSON ya da erişilemeyen depo
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Depolama kapalı: tercih yalnızca bu oturumda kalır
  }
}

/**
 * Açılıştaki durum: (1) v2 anahtarı geçerliyse onarılmış hâli; (2) değilse eski pano (v1)
 * taşınır — "Onaycı" → "Onay masası", diğerleri `pickPreset()`; yalnızca "tek sütun" görünümü
 * korunur, yoğunluk korunmaz (v1 hep "Sıkı" yazıyordu), eski widget'lar taşınmaz; v2 yazılır ve
 * v1 silinir; (3) hiçbiri yoksa `pickPreset()`.
 */
export function loadHomeState(): HomeState {
  const saved = validate(readJson(STORAGE_KEY))
  if (saved) return saved

  const old = readJson(V1_STORAGE_KEY)
  if (old !== undefined) {
    const v1 = isObj(old) ? old : {}
    const base: PresetId = v1.preset === 'onayci' ? 'onay-masasi' : pickPreset()
    const migrated = fromPreset(base, { view: v1.view === 'stack' ? 'stack' : DEFAULT_VIEW, density: DEFAULT_DENSITY })
    writeJson(STORAGE_KEY, migrated)
    try {
      localStorage.removeItem(V1_STORAGE_KEY)
    } catch {
      // Silinemezse bir sonraki açılışta v2 zaten okunur
    }
    return migrated
  }

  return fromPreset(pickPreset())
}

/* ---- Taşıma (… menüsü › Taşı) ------------------------------------------------------------------ */

export type MoveDir = 'up' | 'down' | 'top' | 'left' | 'right'

/** Taşıma duyurusu (`role="status"`), ör. "“Takip ettikleriniz” yukarı taşındı". */
export function moveAnnouncement(id: WidgetId, mode: string, dir: MoveDir) {
  const words: Record<MoveDir, string> = { up: 'yukarı taşındı', down: 'aşağı taşındı', top: 'en üste taşındı', left: 'sola taşındı', right: 'sağa taşındı' }
  return `“${titleOf(id, mode)}” ${words[dir]}`
}

/**
 * Izgarada taşıma. Yukarı: sütunları çakışan en yakın üstteki öğenin yerine geçer, o öğe hemen
 * altına iner. Aşağı: alttaki en yakın öğeye "yukarı" uygulanır. En üste: y = 0. Sola / sağa:
 * aynı satır bandındaki komşuyla x değiş tokuşu (12 sütuna kırpılır). Çakışmaları sıkıştırma çözer.
 */
function moveInGrid(s: HomeState, id: WidgetId, dir: MoveDir): GridItem[] {
  const vis = visibleSet(s)
  const grid = s.grid.map((it) => ({ ...it }))
  const a = grid.find((it) => it.i === id)
  if (!a || !vis.has(id)) return s.grid
  const others = grid.filter((it) => it.i !== id && vis.has(it.i))

  /** `item`'ı `target`'ın satırına koyar; o satırdan itibaren diğer her şeyi `item.h` kadar iter. */
  const lift = (item: GridItem, targetY: number) => {
    for (const o of grid) if (o.i !== item.i && vis.has(o.i) && o.y >= targetY) o.y += item.h
    item.y = targetY
  }

  switch (dir) {
    case 'up': {
      const above = others.filter((o) => overlapsCols(o, a) && o.y < a.y).sort((p, q) => q.y - p.y)[0]
      if (!above) return s.grid
      lift(a, above.y)
      break
    }
    case 'down': {
      const below = others.filter((o) => overlapsCols(o, a) && o.y > a.y).sort((p, q) => p.y - q.y)[0]
      if (!below) return s.grid
      lift(below, a.y)
      break
    }
    case 'top': {
      if (a.y === 0 && !others.some((o) => overlapsCols(o, a) && o.y === 0 && o.x < a.x)) return s.grid
      lift(a, 0)
      break
    }
    case 'left': {
      const band = others.filter((o) => overlapsRows(o, a) && o.x + o.w <= a.x).sort((p, q) => q.x + q.w - (p.x + p.w))
      const b = band[0]
      if (b) {
        const ax = b.x
        b.x = clamp(ax + a.w, 0, COLS - b.w)
        a.x = ax
      } else if (a.x > 0) a.x = 0
      else return s.grid
      break
    }
    case 'right': {
      const band = others.filter((o) => overlapsRows(o, a) && o.x >= a.x + a.w).sort((p, q) => p.x - q.x)
      const c = band[0]
      if (c) {
        const cx = a.x
        a.x = clamp(cx + c.w, 0, COLS - a.w)
        c.x = cx
      } else if (a.x < COLS - a.w) a.x = COLS - a.w
      else return s.grid
      break
    }
  }
  return compact(grid, vis)
}

/** Tek sütunda taşıma: gizli olmayan komşusuyla yer değiştirir. Sola / sağa yok. */
function moveInStack(s: HomeState, id: WidgetId, dir: MoveDir): WidgetId[] {
  const vis = visibleSet(s)
  const order = [...s.order]
  const idx = order.indexOf(id)
  if (idx < 0 || !vis.has(id)) return s.order
  const visIdx = order.map((w, i) => (vis.has(w) ? i : -1)).filter((i) => i >= 0)
  const pos = visIdx.indexOf(idx)
  if (dir === 'top') {
    if (pos === 0) return s.order
    order.splice(idx, 1)
    order.splice(visIdx[0], 0, id)
    return order
  }
  const swapWith = dir === 'up' ? visIdx[pos - 1] : dir === 'down' ? visIdx[pos + 1] : undefined
  if (swapWith === undefined) return s.order
  ;[order[idx], order[swapWith]] = [order[swapWith], order[idx]]
  return order
}

const sameGrid = (a: readonly GridItem[], b: readonly GridItem[]) =>
  a.length === b.length && a.every((it) => b.some((o) => o.i === it.i && o.x === it.x && o.y === it.y && o.w === it.w && o.h === it.h))

/** Taşınmış durum (saf); bir şey değişmediyse aynı nesne döner. Düzen "Özel düzen" olur. */
export function applyMove(s: HomeState, id: WidgetId, dir: MoveDir, stacked: boolean): HomeState {
  if (stacked) {
    const order = moveInStack(s, id, dir)
    return order === s.order ? s : { ...s, preset: 'ozel', order }
  }
  const grid = moveInGrid(s, id, dir)
  return grid === s.grid || sameGrid(grid, s.grid) ? s : { ...s, preset: 'ozel', grid }
}

/** Taşıma bir şey değiştirir mi ("…" menüsünde olanaksız taşımalar devre dışı). */
export function canMove(s: HomeState, id: WidgetId, dir: MoveDir, stacked: boolean) {
  return applyMove(s, id, dir, stacked) !== s
}

/* ---- Tek tuş kısayolları tercihi (WCAG 2.1.4) -------------------------------------------------- */

let keysInitial: boolean | undefined

/** Depodaki tercih (bir kez okunur); yoksa açık. */
function readKeysPref() {
  if (keysInitial === undefined) {
    const v = readJson(KEYS_STORAGE_KEY)
    keysInitial = typeof v === 'boolean' ? v : true
  }
  return keysInitial
}

const keysStore = createStore<boolean | null>(null)

/** Tek tuş kısayolları açık mı (varsayılan açık); `workspace-home-keys-v1`'de saklanır. */
export function useKeysPref(): [boolean, (on: boolean) => void] {
  const stored = keysStore.use()
  const on = stored ?? readKeysPref()
  const set = useCallback((next: boolean) => {
    keysStore.set(next)
    writeJson(KEYS_STORAGE_KEY, next)
  }, [])
  return [on, set]
}

/* ---- Kanca ------------------------------------------------------------------------------------- */

export interface HomeActions {
  /** Hazır düzeni uygular (görünüm ve yoğunluk korunur); "Geri al"lı bildirim gösterir. */
  applyPreset(id: PresetId): void
  /** Son uygulanan hazır düzene döner; "Düzen varsayılana döndü" + "Geri al". */
  resetToBase(): void
  /** Önceki bir anlık görüntüyü geri yükler (bildirimlerdeki "Geri al"). */
  restore(snapshot: HomeState): void
  /** Kipi değiştirir; kipin en küçük yüksekliği fazlaysa `h` yükseltilir. */
  setMode(id: WidgetId, mode: string): void
  hide(id: WidgetId): void
  /** Gizli widget'ı geri ekler: kayıtlı konumu yoksa en alta; tek sütunda sona. */
  show(id: WidgetId): void
  toggleHideWhenEmpty(id: WidgetId): void
  setView(view: HomeView): void
  setDensity(density: Density): void
  /** react-grid-layout `onLayoutChange`; yalnızca düzenleme kipinde kaydedilir. */
  setGridFromRGL(layout: Layout): void
  /** Sürükleme / boyutlandırma bitti: düzen artık "Özel düzen". */
  markCustom(): void
  /** Taşır; bir şey değiştiyse `true` döner. `stacked`: tek sütun görünümünde sırayı değiştirir. */
  move(id: WidgetId, dir: MoveDir, stacked: boolean): boolean
  /** Tam genişlik ↔ önceki genişlik (yalnızca ızgara). */
  toggleWide(id: WidgetId): void
  setFollowScope(scope: FollowScope): void
  setShortcutHints(on: boolean): void
}

export interface HomeStateApi {
  state: HomeState
  /** Düzenleme kipi (oturumluk). */
  editing: boolean
  setEditing(on: boolean): void
  actions: HomeActions
}

export function useHomeState(): HomeStateApi {
  const [state, setState] = useState(loadHomeState)
  const [editing, setEditing] = useState(false)

  useEffect(() => writeJson(STORAGE_KEY, state), [state])

  const actions = useMemo<HomeActions>(() => {
    const custom = (s: HomeState): HomeState => (s.preset === 'ozel' ? s : { ...s, preset: 'ozel' })
    const restore = (snapshot: HomeState) => setState(validate(snapshot) ?? snapshot)

    return {
      applyPreset(id) {
        const prev = state
        const p = findPreset(id)
        if (!p) return
        setState(fromPreset(id, { view: prev.view, density: prev.density, followScope: prev.followScope }))
        toastUndo(`“${p.name}” düzeni uygulandı`, { onUndo: () => restore(prev) })
      },
      resetToBase() {
        const prev = state
        setState(fromPreset(prev.basePreset, { view: prev.view, density: prev.density, followScope: prev.followScope }))
        toastUndo('Düzen varsayılana döndü', { onUndo: () => restore(prev) })
      },
      restore,
      setMode(id, mode) {
        if (!widgetDefs[id].modes.some((m) => m.id === mode)) return
        setState((s) => {
          if (resolveMode(id, s.modes[id]) === mode) return s
          const minH = minHOf(id, mode)
          const raised = s.grid.map((it) => (it.i === id && it.h < minH ? { ...it, h: minH } : it))
          return custom({ ...s, modes: { ...s.modes, [id]: mode }, grid: compact(raised, visibleSet(s)) })
        })
      },
      hide(id) {
        setState((s) => (s.hidden.includes(id) ? s : custom({ ...s, hidden: [...s.hidden, id] })))
      },
      show(id) {
        setState((s) => {
          if (!s.hidden.includes(id)) return s
          const hidden = s.hidden.filter((h) => h !== id)
          const grid = ensureItem(s.grid, id, resolveMode(id, s.modes[id]))
          const order = [...s.order.filter((w) => w !== id), id]
          return custom({ ...s, hidden, grid: compact(grid, visibleSet({ hidden })), order })
        })
      },
      toggleHideWhenEmpty(id) {
        setState((s) => custom({ ...s, hideWhenEmpty: { ...s.hideWhenEmpty, [id]: !s.hideWhenEmpty[id] } }))
      },
      setView(view) {
        setState((s) => (s.view === view ? s : { ...s, view }))
      },
      setDensity(density) {
        setState((s) => (s.density === density ? s : { ...s, density }))
      },
      setGridFromRGL(layout) {
        // Kullanım kipinde react-grid-layout "boşken gizli" widget'ların çevresini sıkıştırır;
        // bu geçici görünüm kayıtlı düzeni ezmesin
        if (!editing) return
        setState((s) => {
          const byId = new Map(layout.filter((it) => isWidgetId(it.i)).map((it) => [it.i as WidgetId, it]))
          const merged = s.grid.map((it) => {
            const n = byId.get(it.i)
            return n ? sanitizeItem({ i: it.i, x: n.x, y: n.y, w: n.w, h: n.h }, resolveMode(it.i, s.modes[it.i])) : it
          })
          return sameGrid(merged, s.grid) ? s : { ...s, grid: merged }
        })
      },
      markCustom() {
        setState(custom)
      },
      move(id, dir, stacked) {
        if (!canMove(state, id, dir, stacked)) return false
        setState((s) => applyMove(s, id, dir, stacked))
        return true
      },
      toggleWide(id) {
        setState((s) => {
          const it = s.grid.find((g) => g.i === id)
          if (!it) return s
          const def = widgetDefs[id]
          const wide = it.w === COLS
          const w = wide ? clamp(s.prevW[id] ?? Math.max(def.minW * 2, 6), def.minW, COLS) : COLS
          const prevW = { ...s.prevW }
          if (wide) delete prevW[id]
          else prevW[id] = it.w
          const grid = s.grid.map((g) => (g.i === id ? { ...g, x: wide ? Math.min(g.x, COLS - w) : 0, w } : g))
          return custom({ ...s, grid: compact(grid, visibleSet(s)), prevW })
        })
      },
      setFollowScope(followScope) {
        setState((s) => (s.followScope === followScope ? s : { ...s, followScope }))
      },
      setShortcutHints(shortcutHints) {
        setState((s) => (s.shortcutHints === shortcutHints ? s : { ...s, shortcutHints }))
      },
    }
  }, [state, editing])

  return { state, editing, setEditing, actions }
}
