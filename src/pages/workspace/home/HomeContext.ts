import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { LayoutItem } from 'react-grid-layout'
import { markRead } from '@/pages/workflows/triage'
import { restoreFocusSoon } from '@/pages/workspace/home/actions'
import { STACK_MAX_PX, W, contentBudget, hClass, padX, px, type Density } from '@/pages/workspace/home/metrics'
import { minHOf, resolveMode, titleOf, widgetDefs, widgetIds, type WidgetId } from '@/pages/workspace/home/registry'
import type { WidgetBodyProps } from '@/pages/workspace/home/types'
import { useKeysPref, type HomeActions, type HomeState, type HomeStateApi } from '@/pages/workspace/home/useHomeState'
import {
  queueSections,
  skip as skipRequest,
  useDecided,
  useDrafts,
  useFollowing,
  useFyi,
  useSkipped,
  useTriage,
  type PeekContext,
} from '@/pages/workspace/home/useTriage'

/* -------------------------------------------------------------------------------------------------
 * Ana sayfa bağlamı
 *
 * Sayfa (`WorkspacePage`) `useHomeState()` + `useHomeValue()` ile değeri kurar ve
 * `<HomeContext.Provider>` ile verir; pano, çerçeve, widget'lar, önizleme ve pencereler
 * `useHome()` ile okur. Hangi widget'ın çizildiği, sıradaki iş kartının kuyruktan ilk talebi
 * düşürüp düşürmediği ve "tümü bitti" durumunu kimin gösterdiği tek yerde, `useBoardModel`'de.
 * ------------------------------------------------------------------------------------------------- */

export type { PeekContext }

export interface PeekState {
  id: string
  context: PeekContext
  /** "Sırayla ilerle": karardan / ertelemeden / atladıktan sonra sıradaki talep yüklenir. */
  sequence: boolean
  /** Kapanınca odağın döneceği satır (`data-row-id`); varsayılan talebin kendisi. */
  returnFocusId: string | null
}

export interface StartState {
  /** Verilirse pencere o sürecin özet adımında açılır; yoksa katalogda. */
  processId?: string
}

export interface BoardModel {
  /**
   * Şu an çizilen widget'lar, DOM sırasıyla: ızgarada kayıtlı konuma göre (y, sonra x), tek
   * sütunda `state.order`. Gizli, "boşken gizle" ve boş (düzenleme dışında), bastırılmış olanlar yok.
   */
  rendered: WidgetId[]
  /** react-grid-layout'a verilecek düzen: yalnızca çizilenler, `minW` / `minH` ekli. */
  layout: LayoutItem[]
  isShown(id: WidgetId): boolean
  modeOf(id: WidgetId): string
  /** Widget'ın gösterecek içeriği yok (kuyrukta `excludeHead` sonrası). */
  empty: Record<WidgetId, boolean>
  /** Sıradaki iş kartı (seçili talep kipinde kuyruk boşken ya da tek sütunda) çizilmiyor. */
  nextSuppressed: boolean
  /** Kuyruk ilk talebi (`triage.head`) göstermesin; kart zaten gösteriyor. */
  excludeHead: boolean
  /**
   * Kuyruk boşalınca "tümü bitti" ekranını kim gösterir: `next` (kart görünür, seçili kip
   * değil), yoksa `queue` (çiziliyorsa), yoksa kimse. Kuyruk `next` iken yalnızca soluk
   * "Onay bekleyen başka iş yok." satırını gösterir.
   */
  allDoneOwner: 'next' | 'queue' | null
  /**
   * "Yeni talep" siyah mı (`variant="primary"`): yalnızca ekranda siyah bir "Onayla" yokken
   * (kart gizli / bastırılmış / tümü bitti gösteriyor). Aksi hâlde `secondary`.
   */
  newRequestPrimary: boolean
}

/** Hangi widget'lar çizilir, kim neyi gösterir (bkz. `BoardModel`). */
export function useBoardModel(state: HomeState, opts: { editing: boolean; stacked: boolean }): BoardModel {
  const { editing, stacked } = opts
  const triage = useTriage()
  const following = useFollowing(state.followScope)
  const drafts = useDrafts()
  const fyi = useFyi()
  const decided = useDecided()

  return useMemo(() => {
    const modeOf = (id: WidgetId) => resolveMode(id, state.modes[id])
    const hidden = new Set(state.hidden)
    const nextMode = modeOf('next')
    const nextSuppressed = nextMode === 'secili' && (triage.isEmpty || stacked)
    const nextRendered = !hidden.has('next') && !nextSuppressed
    const excludeHead = nextRendered && nextMode !== 'secili'
    const queueRows = queueSections(triage, modeOf('queue'), excludeHead)

    const empty: Record<WidgetId, boolean> = {
      next: triage.isEmpty,
      queue: queueRows.length === 0,
      following: following.length === 0,
      drafts: drafts.length === 0,
      start: false,
      fyi: fyi.length === 0,
      decided: decided.length === 0,
    }

    const shown = new Set<WidgetId>(
      widgetIds.filter((id) => {
        if (hidden.has(id)) return false
        if (id === 'next') return nextRendered
        const hideEmpty = widgetDefs[id].listKind === 'rows' && !!state.hideWhenEmpty[id]
        return !(hideEmpty && empty[id] && !editing)
      }),
    )

    const gridOrder = [...state.grid].sort((a, b) => a.y - b.y || a.x - b.x).map((it) => it.i)
    const rendered = (stacked ? state.order : gridOrder).filter((id, i, arr) => shown.has(id) && arr.indexOf(id) === i)

    const layout: LayoutItem[] = state.grid
      .filter((it) => shown.has(it.i))
      .map((it) => ({ ...it, minW: widgetDefs[it.i].minW, minH: minHOf(it.i, modeOf(it.i)) }))

    const allDoneOwner: BoardModel['allDoneOwner'] = nextRendered && nextMode !== 'secili' ? 'next' : shown.has('queue') ? 'queue' : null

    return {
      rendered,
      layout,
      isShown: (id: WidgetId) => shown.has(id),
      modeOf,
      empty,
      nextSuppressed,
      excludeHead,
      allDoneOwner,
      newRequestPrimary: !(nextRendered && !triage.isEmpty),
    }
  }, [state, editing, stacked, triage, following, drafts, fyi, decided])
}

export interface HomeContextValue {
  /** Kalıcı yerleşim durumu (salt okunur; değiştirmek için `actions`). */
  state: HomeState
  actions: HomeActions
  board: BoardModel
  editing: boolean
  setEditing(on: boolean): void
  density: Density
  stacked: boolean

  /** Kuyrukta odaktaki satır; seçili talep kipindeki kartı yönetir. `null` → ilk talep. */
  focusedId: string | null
  setFocusedId(id: string | null): void

  /** Bu oturumda atlananlar (kuyruğun sonuna gider). */
  skipped: readonly string[]
  skip(id: string): void

  /** Açık önizleme (sağdan açılan Drawer). */
  peek: PeekState | null
  /** Önizlemeyi açar ve talebi okundu işaretler. */
  openPeek(id: string, context: PeekContext, opts?: { sequence?: boolean; returnFocusId?: string | null }): void
  /** Önizlemeyi kapatır; odak boşa düşerse `returnFocusId` satırına döner. */
  closePeek(): void

  /** "Yeni talep" penceresi; `null` kapalı. */
  start: StartState | null
  openStart(processId?: string): void
  closeStart(): void

  /** "Klavye kısayolları" penceresi. */
  shortcutsOpen: boolean
  openShortcuts(): void
  closeShortcuts(): void

  /** Tek tuş kısayolları açık mı (`workspace-home-keys-v1`). */
  keysOn: boolean
  setKeysOn(on: boolean): void

  /** `board.isShown` / `board.modeOf` kısayolları. */
  isShown(id: WidgetId): boolean
  modeOf(id: WidgetId): string

  /** Ekran okuyucu duyurusu (taşıma vb.); sayfa `announcement`'ı `role="status"` içinde çizer. */
  announce(message: string): void
  announcement: string
}

export const HomeContext = createContext<HomeContextValue | null>(null)

/** Ana sayfa bağlamını okur; sağlayıcı dışında hata verir. */
export function useHome(): HomeContextValue {
  const v = useContext(HomeContext)
  if (!v) throw new Error('useHome: HomeContext.Provider bulunamadı')
  return v
}

/**
 * Sağlayıcı değerini kurar. `stacked`: `state.view === 'stack'` ya da pano genişliği
 * `STACK_BELOW`'un altında (genişlik react-grid-layout `useContainerWidth`'ten).
 */
export function useHomeValue(api: HomeStateApi, opts: { stacked: boolean }): HomeContextValue {
  const { state, actions, editing, setEditing } = api
  const { stacked } = opts
  const board = useBoardModel(state, { editing, stacked })
  const [keysOn, setKeysOn] = useKeysPref()
  const skipped = useSkipped()

  const [focusedId, setFocusedId] = useState<string | null>(null)
  const [peek, setPeek] = useState<PeekState | null>(null)
  const [start, setStart] = useState<StartState | null>(null)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [announcement, setAnnouncement] = useState('')

  const openPeek = useCallback<HomeContextValue['openPeek']>((id, context, o) => {
    markRead(id)
    setPeek({ id, context, sequence: !!o?.sequence, returnFocusId: o?.returnFocusId === undefined ? id : o.returnFocusId })
  }, [])

  const closePeek = useCallback(() => {
    setPeek(null)
    restoreFocusSoon(peek?.returnFocusId)
  }, [peek])

  const announce = useCallback((message: string) => {
    // Aynı cümle art arda duyurulabilsin diye sonuna görünmez boşluk eklenip çıkarılır
    setAnnouncement((prev) => (prev === message ? `${message} ` : message))
  }, [])

  return useMemo(
    () => ({
      state,
      actions,
      board,
      editing,
      setEditing,
      density: state.density,
      stacked,
      focusedId,
      setFocusedId,
      skipped,
      skip: skipRequest,
      peek,
      openPeek,
      closePeek,
      start,
      openStart: (processId?: string) => setStart(processId ? { processId } : {}),
      closeStart: () => setStart(null),
      shortcutsOpen,
      openShortcuts: () => setShortcutsOpen(true),
      closeShortcuts: () => setShortcutsOpen(false),
      keysOn,
      setKeysOn,
      isShown: board.isShown,
      modeOf: board.modeOf,
      announce,
      announcement,
    }),
    [state, actions, board, editing, setEditing, stacked, focusedId, skipped, peek, openPeek, closePeek, start, shortcutsOpen, keysOn, setKeysOn, announce, announcement],
  )
}

/**
 * Widget gövdesinin özellikleri (bkz. `WidgetBodyProps`). `containerWidth`: panonun genişliği
 * (px; `useContainerWidth`). Izgarada genişlik ve yükseklik kayıtlı öğeden hesaplanır.
 */
export function bodyPropsOf(id: WidgetId, home: Pick<HomeContextValue, 'state' | 'density' | 'stacked' | 'editing' | 'modeOf'>, containerWidth: number): WidgetBodyProps {
  const def = widgetDefs[id]
  const mode = home.modeOf(id)
  const d = home.density
  const item = home.state.grid.find((g) => g.i === id)
  const h = home.stacked ? null : (item?.h ?? minHOf(id, mode))
  const widthPx = home.stacked ? Math.min(containerWidth, STACK_MAX_PX) : W(item?.w ?? def.minW, containerWidth, d)
  return {
    id,
    def,
    mode,
    title: titleOf(id, mode),
    density: d,
    stacked: home.stacked,
    editing: home.editing,
    h,
    budgetPx: h === null ? Number.POSITIVE_INFINITY : contentBudget(h, d),
    cap: home.stacked ? (def.stackCap ?? Number.POSITIVE_INFINITY) : Number.POSITIVE_INFINITY,
    widthPx,
    innerWidthPx: Math.max(0, widthPx - 2 * padX[d]),
    m: px[d],
    hc: hClass[d],
  }
}
