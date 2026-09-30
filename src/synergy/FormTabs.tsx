import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { ArrowLeftRight, Columns2, X } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Button, Divider, Flex, Typography } from 'antd'
import { findRequest, processOf } from '@/synergy/shared/workflowData'
import { useMediaQuery } from '@/synergy/shared/hooks'
import { useTransition } from '@/synergy/motion'
import { cn, IC, MotionFlex, Scroll, Tip } from '@/synergy/ant/ui'

/* -------------------------------------------------------------------------------------------------
 * Form sekmeleri (parent → child → child child)
 *
 * Formdaki bir düğmeyle açılan child talep yeni bir sekmede, detay sayfasının aynısıyla açılır.
 * Sekmeler ajanda sekmeleri gibi: açık form, açık renkli bir sayfa kabının içinde; seçili sekme o
 * kabın renginde ve içbükey kavislerle kaba kaynaşır, diğerleri kısa ve gri. Sekmeler açıkken
 * sayfa değil formun içi kayar (üst çubuk ve sekmeler hep görünür); her form kendi kaydırma kabıdır
 * (`useTabScroller`; yapışkan başlık şeridi onu izler) ve kaldığı yeri hatırlar.
 *
 * Yan yana: sekmeler iki gruba ayrılabilir (VS Code grupları gibi). "Yan yana aç" bir sekmeyi
 * öbür gruba taşır; sağ grup doluyken ekran ikiye bölünür, şerit de ikiye ayrılır ve her grubun
 * sekmeleri kendi bölmesinin üstünde durur. Formdan açılan child o formun grubuna eklenir. Grup
 * şeridinin ucunda yer değiştirme (⇄) ve bölmeyi kapatma (✕; sekmeleri öbür gruba katılır) var.
 * Bölmeler arasındaki bölücü sürüklenir.
 *
 * Formlar DOM'da hiç yer değiştirmez (yoksa yeniden takılıp yazılanlar kaybolurdu): hepsi aynı
 * kapta takılı kalır, görünenler CSS `order` ve genişlikle bölmelere yerleşir. Açık sekmeler
 * yalnızca kapat düğmesiyle kapanır, açtığı child'larla birlikte.
 * ------------------------------------------------------------------------------------------------- */

interface Entry {
  id: string
  /** Açan form (ana form ya da başka bir child). */
  parent: string
}

type Group = 0 | 1

const FormTabsContext = createContext<((from: string, id: string) => void) | null>(null)

/** Formun içinden child açma (sekmelerin içindeyse; değilse `null`). */
export const useOpenChild = () => useContext(FormTabsContext)

interface PaneInfo {
  /** Sekmeler açıkken formun kaydırma kabı (değilse `null`: sayfa kayar). */
  scroller: HTMLElement | null
  /** Form yan yana bölmede (dar): yan panel katlı, alanlar tek sütun. */
  narrow: boolean
}

const PaneContext = createContext<PaneInfo>({ scroller: null, narrow: false })

/** Formun kaydırma kabı (sekmeler açıkken; değilse `null`). */
export const useTabScroller = () => useContext(PaneContext).scroller

/** Form yan yana bölmede mi. */
export const usePaneNarrow = () => useContext(PaneContext).narrow

/** Sayfa kabı ve seçili sekmenin rengi: birincil rengin zemine karışmış çok açık tonu. */
const PAGE = '[--tab-bg:color-mix(in_oklab,var(--accent)_9%,var(--background))]'

/**
 * Geçiş işareti: gizli form görünür olunca (display değişince) animasyon baştan oynar; başlık
 * kartındaki süreç adı ve durum çipi (`data-tab-cue`) sayaçlardaki gibi aşağıdan kısa kayar.
 */
const CUE =
  '[&_[data-tab-cue]]:animate-[tick-up_calc(0.18s*var(--motion-time,1))_cubic-bezier(0.22,1,0.36,1)_both]'

/** Seçili sekmenin kaba bağlandığı alt köşelerdeki içbükey kavisler (zeminden oyulmuş çeyrek daire). */
const FLARES =
  "before:absolute before:bottom-0 before:-start-4 before:size-4 before:bg-[radial-gradient(circle_at_0_0,transparent_1rem,var(--tab-bg)_1rem)] before:content-[''] after:absolute after:bottom-0 after:-end-4 after:size-4 after:bg-[radial-gradient(circle_at_100%_0,transparent_1rem,var(--tab-bg)_1rem)] after:content-['']"

/** Bölme genişliği geçişi (açılış / kapanış). */
const PANE_EASE =
  'transition-[flex-basis] duration-[calc(300ms*var(--motion-time,1))] ease-[cubic-bezier(0.22,1,0.36,1)]'

/** Bölme genişlikleri: tek, sol, sağ (aradaki bölücü 0.75rem). */
const BASIS = {
  single: 'basis-full',
  0: 'basis-[calc(var(--split)-0.375rem)]',
  1: 'basis-[calc(100%-var(--split)-0.375rem)]',
} as const

/** Bölücü sınırları (%) ve saklama anahtarı. */
const SPLIT_KEY = 'synergy-form-split-v1'
const SPLIT_MIN = 30
const SPLIT_MAX = 70

function loadSplit() {
  try {
    const v = Number(localStorage.getItem(SPLIT_KEY))
    return v >= SPLIT_MIN && v <= SPLIT_MAX ? v : 50
  } catch {
    return 50
  }
}

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

/** Ağaç sırası: her kaydın hemen ardından kendi child'ları. */
function treeOrder(entries: Entry[], parent: string): string[] {
  return entries
    .filter((e) => e.parent === parent)
    .flatMap((e) => [e.id, ...treeOrder(entries, e.id)])
}

/** Sekmede yazan ad: formun adı. */
function nameOf(id: string) {
  const r = findRequest(id)
  return r ? processOf(r).form : id
}

interface TabsState {
  entries: Entry[]
  /** Sağ gruptaki sekmeler (geri kalanı sol grupta). */
  right: string[]
  /** Grupların seçili sekmesi; sağ grup boşsa `null`. */
  active: [string, string | null]
  /** Son etkileşilen grup (dar ekranda tek grup gösterilirken hangisi). */
  last: Group
}

export function FormTabs({
  rootId,
  root,
  renderTab,
}: {
  rootId: string
  /** Ana formun görünümü. */
  root: ReactNode
  /** Child sekmesinin görünümü; `close` sekmeyi (ve child'larını) kapatır. */
  renderTab: (id: string, close: () => void) => ReactNode
}) {
  const [st, setSt] = useState<TabsState>({
    entries: [],
    right: [],
    active: [rootId, null],
    last: 0,
  })
  const { entries } = st
  const hasTabs = entries.length > 0
  const order = [rootId, ...treeOrder(entries, rootId)]
  const groupOf = (id: string, s: TabsState = st): Group => (s.right.includes(id) ? 1 : 0)
  const grow = useTransition({ duration: 0.32, ease: [0.22, 1, 0.36, 1] })
  // Yan yana yalnızca geniş ekranda; daralınca son etkileşilen grubun formu tek başına kalır
  const wide = useMediaQuery('(min-width: 1024px)')
  const split = wide && st.right.length > 0
  const left = order.filter((id) => !st.right.includes(id))
  const right = order.filter((id) => st.right.includes(id))
  const shown: (string | null)[] = split ? st.active : [st.active[st.right.length ? st.last : 0]]

  // Alan ekranın kalanını doldurur: yüksekliği, alanın sayfadaki yerinden ölçülür
  const outer = useRef<HTMLElement | null>(null)
  const [top, setTop] = useState(0)
  useLayoutEffect(() => {
    if (!hasTabs) return
    const measure = () => setTop((outer.current?.getBoundingClientRect().top ?? 0) + window.scrollY)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [hasTabs])

  /** Sekmeyi kendi grubunda seçer. */
  const select = (id: string) =>
    setSt((s) => {
      const g = groupOf(id, s)
      const active = [...s.active] as TabsState['active']
      active[g] = id
      return { ...s, active, last: g }
    })

  /** Formdan child açma: child, açan formun grubuna eklenir ve orada seçilir. */
  const open = (from: string, id: string) => {
    // İlk child açılırken sayfa başa döner ki sekme alanı ekranın kalanına otursun
    if (!hasTabs) window.scrollTo({ top: 0 })
    setSt((s) => {
      const known = s.entries.some((e) => e.id === id)
      const g = known ? groupOf(id, s) : groupOf(from, s)
      const active = [...s.active] as TabsState['active']
      active[g] = id
      return {
        entries: known ? s.entries : [...s.entries, { id, parent: from }],
        right: !known && g === 1 ? [...s.right, id] : s.right,
        active,
        last: g,
      }
    })
  }

  /** Sekmeyi öbür gruba taşır (ilk taşımada ekran ikiye bölünür); kaynak grupta en az bir sekme kalır. */
  const moveToOther = (id: string) =>
    setSt((s) => {
      const from = groupOf(id, s)
      const to = (1 - from) as Group
      const right = to === 1 ? [...s.right, id] : s.right.filter((x) => x !== id)
      const inFrom = [rootId, ...treeOrder(s.entries, rootId)].filter(
        (x) => x !== id && (from === 1) === right.includes(x),
      )
      const active = [...s.active] as TabsState['active']
      active[to] = id
      if (active[from] === id) active[from] = inFrom[0] ?? null
      return { ...s, right, active, last: to }
    })

  /** Grubu kapatır: sekmeleri öbür gruba katılır, ekran tek bölmeye döner. */
  const closeGroup = (g: Group) =>
    setSt((s) => ({ ...s, right: [], active: [s.active[1 - g] ?? s.active[0], null], last: 0 }))

  /** Grupları yer değiştirir (sol ↔ sağ). */
  const swap = () =>
    setSt((s) => {
      const all = [rootId, ...treeOrder(s.entries, rootId)]
      return {
        ...s,
        right: all.filter((x) => !s.right.includes(x)),
        active: [s.active[1] ?? s.active[0], s.active[0]],
        last: (1 - s.last) as Group,
      }
    })

  const close = (id: string) =>
    setSt((s) => {
      const gone = withDescendants(s.entries, id)
      const back = s.entries.find((e) => e.id === id)?.parent ?? rootId
      const entries = s.entries.filter((e) => !gone.has(e.id))
      const all = [rootId, ...treeOrder(entries, rootId)]
      let rightIds = s.right.filter((x) => !gone.has(x))
      // Sol grup boşaldıysa sağ grup sola geçer
      if (all.every((x) => rightIds.includes(x))) rightIds = []
      const inGroup = (g: Group) => all.filter((x) => (g === 1) === rightIds.includes(x))
      // Kapanan sekme seçiliyse grubunda onu açan forma (yoksa grubun ilk sekmesine) dönülür
      const pick = (g: Group, current: string | null) => {
        const list = inGroup(g)
        if (!list.length) return null
        if (current && list.includes(current)) return current
        return list.includes(back) ? back : list[0]!
      }
      const a0 = pick(
        0,
        s.right.length && !rightIds.length
          ? s.active[0] && !gone.has(s.active[0])
            ? s.active[0]
            : s.active[1]
          : s.active[0],
      )
      return {
        entries,
        right: rightIds,
        active: [a0 ?? rootId, pick(1, s.active[1])],
        last: rightIds.length ? s.last : 0,
      }
    })

  // Bölücü: sol bölmenin payı (%), sürüklenir ya da ok tuşlarıyla kaydırılır; saklanır
  const [ratio, setRatio] = useState(loadSplit)
  const [dragging, setDragging] = useState(false)
  /** Yeni pay (ya da öncekinden hesaplayan işlev; basılı tutulan tuşta da doğru birikir). */
  const setSplitRatio = (v: number | ((prev: number) => number)) =>
    setRatio((prev) => {
      const next = Math.round(
        Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, typeof v === 'function' ? v(prev) : v)),
      )
      try {
        localStorage.setItem(SPLIT_KEY, String(next))
      } catch {
        // Depolama kapalıysa yalnızca bu oturumda
      }
      return next
    })
  const onDividerDown = (e: PointerEvent<HTMLElement>) => {
    const host = e.currentTarget.parentElement
    if (!host) return
    e.preventDefault()
    const rect = host.getBoundingClientRect()
    setDragging(true)
    const move = (ev: globalThis.PointerEvent) =>
      setSplitRatio(((ev.clientX - rect.left) / rect.width) * 100)
    const up = () => {
      setDragging(false)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }
  const onDividerKey = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    setSplitRatio((r) => r + (e.key === 'ArrowLeft' ? -2 : 2))
  }

  const ease = !dragging && PANE_EASE
  const row = (g: Group, ids: string[]) => (
    <TabRow
      key={g}
      ids={ids}
      active={split ? st.active[g] : shown[0]!}
      rootId={rootId}
      split={split}
      onSelect={select}
      onClose={close}
      // Taşıma yalnızca geniş ekranda ve kaynak grupta başka sekme varken
      onMove={wide && ids.length > 1 ? moveToOther : undefined}
      moveLabel={split ? 'Diğer bölmeye taşı' : 'Yan yana aç'}
      onSwap={split ? swap : undefined}
      onCloseGroup={split ? () => closeGroup(g) : undefined}
      className={cn(split ? BASIS[g] : BASIS.single, ease)}
    />
  )

  return (
    <FormTabsContext value={open}>
      {/* Yapı sabit: sekmeler gelip gidince ana form yeniden takılmaz */}
      <Flex
        ref={outer}
        style={
          {
            '--split': `${ratio}%`,
            ...(hasTabs && { height: `calc(100dvh - ${top}px - 1.5rem)` }),
          } as CSSProperties
        }
        className={cn('flex flex-col', PAGE)}
      >
        {/* Şerit: ilk açılışta yüksekliği büyüyüp formu aşağı iter, son sekme kapanınca kapanır */}
        <AnimatePresence initial={false}>
          {hasTabs && (
            <MotionFlex
              key="strip"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={grow}
              // Yükseklik büyürken sekmeler şeridin altından yükselir; bölününce iki grup yan yana
              className="flex shrink-0 gap-3 overflow-hidden"
            >
              {row(0, split ? left : order)}
              {split && row(1, right)}
            </MotionFlex>
          )}
        </AnimatePresence>
        {/*
         * Formların kabı: sekmeler açıkken ekranın kalanını doldurur, formlar içinde kayar. Tüm
         * formlar burada takılı; görünenler `order` ile sıralanır (sol 0, bölücü 1, sağ 2).
         */}
        <Flex
          className={cn(
            'flex min-w-0 rounded-3xl transition-[padding,background-color] duration-300',
            hasTabs
              ? cn('min-h-0 flex-1 overflow-hidden bg-(--tab-bg) p-3', CUE)
              : 'bg-transparent p-0',
          )}
        >
          {[
            { id: rootId, node: root },
            ...entries.map((e) => ({ id: e.id, node: renderTab(e.id, () => close(e.id)) })),
          ].map(({ id, node }) => {
            const slot = shown.indexOf(id) as -1 | 0 | 1
            return (
              <Pane
                key={id}
                slot={slot}
                split={split}
                scroll={hasTabs}
                className={cn(slot < 0 ? '' : split ? BASIS[slot as Group] : BASIS.single, ease)}
              >
                {node}
              </Pane>
            )
          })}
          {split && (
            <Flex
              role="separator"
              aria-orientation="vertical"
              aria-label="Bölücü"
              aria-valuemin={SPLIT_MIN}
              aria-valuemax={SPLIT_MAX}
              aria-valuenow={ratio}
              tabIndex={0}
              onPointerDown={onDividerDown}
              onKeyDown={onDividerKey}
              className="order-1 flex w-3 shrink-0 animate-[fade-in_calc(0.3s*var(--motion-time,1))_ease-out] cursor-col-resize justify-center py-6 outline-none focus-visible:rounded-full focus-visible:bg-accent-soft"
            >
              <Divider orientation="vertical" className="m-0 h-full" />
            </Flex>
          )}
        </Flex>
      </Flex>
    </FormTabsContext>
  )
}

interface Bar {
  left: number
  width: number
  slide: boolean
}

/**
 * Bir grubun sekme şeridi: sekmeler ve seçili sekmenin kayan zemini; bölünmüşken sağ uçta yer
 * değiştirme ve bölmeyi kapatma.
 */
function TabRow({
  ids,
  active,
  rootId,
  split,
  onSelect,
  onClose,
  onMove,
  moveLabel,
  onSwap,
  onCloseGroup,
  className,
}: {
  ids: string[]
  active: string | null
  rootId: string
  split: boolean
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onMove?: (id: string) => void
  moveLabel: string
  onSwap?: () => void
  onCloseGroup?: () => void
  className?: string
}) {
  // Seçim zemininin yeri: seçili sekmenin şerit içindeki konumu; ilk ölçümde kaymadan yerleşir
  const [rowEl, setRowEl] = useState<HTMLElement | null>(null)
  const [bar, setBar] = useState<Bar | null>(null)
  const key = ids.join('|')
  // Çıkan sekme animasyonu bitene kadar yer kaplar; bitince (DOM'dan kalkınca) yeniden ölçülür
  const [settled, setSettled] = useState(0)
  useLayoutEffect(() => {
    if (!rowEl) return
    const measure = () => {
      const el = active
        ? rowEl.querySelector<HTMLElement>(`[data-tab="${CSS.escape(active)}"]`)
        : null
      setBar((b) => {
        if (!el) return null
        const next = { left: el.offsetLeft, width: el.offsetWidth, slide: b !== null }
        return b && b.left === next.left && b.width === next.width ? b : next
      })
    }
    measure()
    // Şerit ya da tek tek sekmelerin boyutu değişince (yazı tipi, kapat düğmesi) de yeniden ölçülür
    const ro = new ResizeObserver(measure)
    ro.observe(rowEl)
    rowEl.querySelectorAll('[data-tab]').forEach((t) => ro.observe(t))
    return () => ro.disconnect()
  }, [rowEl, active, key, settled])

  return (
    <Flex className={cn('flex min-w-0 shrink-0 items-end', split && 'animate-slide-in', className)}>
      <Scroll horizontal className="min-w-0 flex-1 [scrollbar-width:none]">
        <Flex
          ref={setRowEl}
          role="group"
          aria-label="Açık formlar"
          className={cn('relative flex min-w-max items-end gap-1 pt-1', split ? 'px-5' : 'px-8')}
        >
          {bar && (
            <Flex
              aria-hidden
              style={{ left: bar.left, width: bar.width }}
              className={cn(
                'pointer-events-none absolute bottom-0 z-1 block h-12 rounded-t-2xl bg-(--tab-bg)',
                FLARES,
                bar.slide &&
                  'transition-[left,width] duration-[calc(260ms*var(--motion-time,1))] ease-[cubic-bezier(0.22,1,0.36,1)]',
              )}
            />
          )}
          <AnimatePresence initial={false} onExitComplete={() => setSettled((n) => n + 1)}>
            {ids.map((id) => (
              <FormTab
                key={id}
                id={id}
                selected={id === active}
                onSelect={() => onSelect(id)}
                onMove={onMove && (() => onMove(id))}
                moveLabel={moveLabel}
                onClose={id === rootId ? undefined : () => onClose(id)}
              />
            ))}
          </AnimatePresence>
        </Flex>
      </Scroll>
      {(onSwap || onCloseGroup) && (
        <Flex className="flex shrink-0 items-center gap-0.5 pb-2 ps-1">
          {onSwap && (
            <Tip label="Yer değiştir">
              <Button
                type="text"
                size="small"
                aria-label="Bölmelerin yerini değiştir"
                icon={<ArrowLeftRight {...IC} size={14} />}
                onClick={onSwap}
                className="text-muted"
              />
            </Tip>
          )}
          {onCloseGroup && (
            <Tip label="Bölmeyi kapat">
              <Button
                type="text"
                size="small"
                aria-label="Bölmeyi kapat"
                icon={<X {...IC} size={14} />}
                onClick={onCloseGroup}
                className="text-muted"
              />
            </Tip>
          )}
        </Flex>
      )}
    </Flex>
  )
}

/**
 * Bir formun bölmesi. Her zaman aynı yerde takılı; `slot` -1 gizli, 0 sol (ya da tek), 1 sağ.
 * Sekmeler açıkken kendi kaydırma kabıdır; gizlenince kaydırma yeri saklanır, görününce döner.
 */
function Pane({
  slot,
  split,
  scroll,
  className,
  children,
}: {
  slot: -1 | 0 | 1
  split: boolean
  scroll: boolean
  className?: string
  children: ReactNode
}) {
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const saved = useRef(0)
  const wasVisible = useRef(false)
  const visible = slot >= 0
  // Gizlenirken tarayıcı kaydırmayı sıfırlar: gizlenmeden önce (DOM henüz değişmemişken) saklanır,
  // görününce oraya dönülür. Kaydırma olaylarına dayanmaz.
  if (wasVisible.current && !visible && scroller) saved.current = scroller.scrollTop
  wasVisible.current = visible
  useLayoutEffect(() => {
    if (visible && scroller) scroller.scrollTop = saved.current
  }, [visible, scroller])

  return (
    <Flex
      ref={setScroller}
      className={cn(
        '@container min-w-0 shrink-0',
        visible ? 'block' : 'hidden',
        slot === 1 ? 'order-2' : 'order-0',
        // Bölme kendi içinde kayar; yapışkan öğeler kabuğun değil bölmenin tepesine yapışsın
        scroll && 'min-h-0 overflow-y-auto overscroll-contain [--chrome-top:0px]',
        // Sağ bölme açılırken kayarak belirir
        split && slot === 1 && 'animate-slide-in',
        className,
      )}
    >
      <PaneContext
        value={{ scroller: scroll && visible ? scroller : null, narrow: split && visible }}
      >
        {children}
      </PaneContext>
    </Flex>
  )
}

function FormTab({
  id,
  selected,
  onSelect,
  onMove,
  moveLabel,
  onClose,
}: {
  id: string
  selected: boolean
  onSelect: () => void
  /** Öbür gruba taşı / yan yana aç. */
  onMove?: () => void
  moveLabel: string
  onClose?: () => void
}) {
  const name = nameOf(id)
  // Aynı adlı formlar (ör. iki teklif) ipucundaki talep numarasıyla ayrılır; sekmede yalnızca ad
  const hint = findRequest(id)?.no
  const transition = useTransition({ type: 'spring', stiffness: 420, damping: 36 })
  return (
    // Yeni sekme aşağıdan süzülür. Tüm sekmeler aynı boyda (geçişte yazılar oynamasın); seçili
    // olmayanın zemini kısa ve gri, seçili olanın zemini şeritteki kayan parça (onun üstünde durur)
    <MotionFlex
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={transition}
      data-tab={id}
      className={cn('group/tab relative flex h-12 shrink-0 items-center', selected && 'z-2')}
    >
      {!selected && (
        <Flex
          aria-hidden
          className="absolute inset-x-0 top-2 bottom-0 z-0 block rounded-t-2xl bg-surface-tertiary"
        />
      )}
      <Tip label={hint ? `${name} · ${hint}` : name}>
        <Button
          type="text"
          aria-current={selected || undefined}
          onClick={onSelect}
          className={cn(
            'relative z-2 h-full max-w-[26rem] rounded-t-2xl rounded-b-none px-5 pt-2 hover:bg-transparent!',
            onClose && onMove ? 'pe-17' : onClose || onMove ? 'pe-10' : undefined,
            selected ? 'text-accent-soft-foreground' : 'text-foreground/70 hover:text-foreground',
          )}
        >
          <Typography.Text
            ellipsis
            className={cn(
              'min-w-0 text-sm text-current',
              selected ? 'font-semibold' : 'font-medium',
            )}
          >
            {name}
          </Typography.Text>
        </Button>
      </Tip>
      <Flex className="absolute end-2 z-2 mt-2 flex items-center">
        {onMove && (
          <Tip label={moveLabel}>
            <Button
              type="text"
              size="small"
              aria-label={`${moveLabel}: ${name}`}
              icon={<Columns2 {...IC} size={14} />}
              onClick={onMove}
              className="text-muted opacity-0 transition-opacity group-hover/tab:opacity-100 focus-visible:opacity-100"
            />
          </Tip>
        )}
        {onClose && (
          <Tip label="Kapat">
            <Button
              type="text"
              size="small"
              aria-label={`Kapat: ${name}`}
              icon={<X {...IC} size={14} />}
              onClick={onClose}
              className="text-muted"
            />
          </Tip>
        )}
      </Flex>
    </MotionFlex>
  )
}
