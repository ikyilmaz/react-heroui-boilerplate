import {
  createContext,
  Fragment,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react'
import { ArrowLeftRight, Columns2, Ungroup, X } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Button, Divider, Flex, Typography } from 'antd'
import { findRequest, panelSizeOf, processOf, type PanelSize } from '@/synergy/shared/workflowData'
import { useMediaQuery } from '@/synergy/shared/hooks'
import { useTransition } from '@/synergy/motion'
import { cn, IC, MotionFlex, Scroll, Tip } from '@/synergy/ant/ui'

/* -------------------------------------------------------------------------------------------------
 * Form sekmeleri (parent → child → child child)
 *
 * Formdaki bir düğmeyle açılan child talep, detay sayfasının aynısıyla açılır. Nerede açılacağını
 * child formun panel boyutu (orijinaldeki `panelSize`) belirler; ekran üç birimlik bir şerittir:
 * - 1 / 2: ekran bölünür; child sağda üçte bir / üçte iki, açan form solda kalan yerde. Bölünmüş
 *   ekranda yine 1 / 2 açılırsa şerit kayar: açan form ile yeni child yan yana kalır, sığmayan form
 *   (orijinalde sola kayıp gizlenen) kendi sekmesine çıkar; child kapanınca yerine döner.
 * - 3: yeni sekmede tam genişlik. Ekran bölünmüşse yan yana duran iki form tek sekmede gruplanır.
 * Bir formun aynı anda tek child'ı açık olur (orijinaldeki gibi): formdan başka bir child açılınca
 * önceki child (açtıklarıyla birlikte) kapanır, yenisi onun yerine açılır.
 * Dar ekranda yer yok: 1024px altında hepsi, 1200px altında 2'ler de 3 gibi açılır (orijinaldeki gibi).
 *
 * Sekmeler ajanda sekmeleri gibi: açık form, açık renkli bir sayfa kabının içinde; seçili sekme o
 * kabın renginde ve içbükey kavislerle kaba kaynaşır, diğerleri kısa ve gri. Gruplu sekme iki formun
 * adını yan yana taşır; başındaki küçük şema bölmelerin payını ve odaktaki bölmeyi gösterir. Ada
 * basınca o bölme odaklanır (dar ekranda yalnızca o görünür). Bölücü sürüklenir (üçte bir, yarı ve
 * üçte ikide tutunur; çift tıkla panel boyutuna döner); şeridin ucunda yer değiştirme (⇄) ve
 * sekmelere ayırma var. Tek formlu bir sekme "Yan yana aç" ile açık sekmenin yanına alınır.
 *
 * Sekmeler açıkken sayfa değil formun içi kayar (üst çubuk ve sekmeler hep görünür); her form kendi
 * kaydırma kabıdır (`useTabScroller`; yapışkan başlık şeridi onu izler) ve kaldığı yeri hatırlar.
 * Formlar DOM'da hiç yer değiştirmez (yoksa yeniden takılıp yazılanlar kaybolurdu): hepsi aynı
 * kapta takılı kalır, görünenler CSS `order` ve genişlikle bölmelere yerleşir. Açık formlar
 * kapat düğmesiyle ya da açan form başka bir child açınca kapanır, açtığı child'larla birlikte.
 * ------------------------------------------------------------------------------------------------- */

/**
 * Açılışta bölmeden çıkarılan form: child kapanınca (düzen o arada değişmediyse) kendi sekmesinden
 * yine child'ın yerine, yan bölmeye döner.
 */
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
interface View {
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

interface TabsState {
  entries: Entry[]
  views: View[]
  /** Seçili sekme. */
  active: string
  /** Yeni sekme anahtarları için sayaç. */
  seq: number
}

const FormTabsContext = createContext<((from: string, id: string) => void) | null>(null)

/** Formun içinden child açma (sekmelerin içindeyse; değilse `null`). */
export const useOpenChild = () => useContext(FormTabsContext)

/** Sekmeler açıkken formun kaydırma kabı (değilse `null`: sayfa kayar). */
const PaneContext = createContext<HTMLElement | null>(null)

/** Formun kaydırma kabı (sekmeler açıkken; değilse `null`). */
export const useTabScroller = () => useContext(PaneContext)

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

/** Bölücü sınırları (%) ve tutunma noktaları (üçte bir, yarı, üçte iki). */
const SPLIT_MIN = 30
const SPLIT_MAX = 70
const SNAPS = [100 / 3, 50, 200 / 3]

function clampRatio(v: number) {
  const c = Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, v))
  return SNAPS.find((p) => Math.abs(p - c) < 1.5) ?? c
}

/** Child'ın panel boyutuna göre sol bölmenin (açan formun) payı. */
const LEFT_SHARE = { 1: 200 / 3, 2: 100 / 3 } as const

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

/** Sekmede yazan ad: formun adı. */
function nameOf(id: string) {
  const r = findRequest(id)
  return r ? processOf(r).form : id
}

const single = (key: string, id: string): View => ({
  key,
  ids: [id],
  focus: id,
  ratio: 50,
  base: 50,
})

/** Formdan child açma; `size` dar ekran düzeltmesinden geçmiş panel boyutu. */
function openIn(
  prev: TabsState,
  from: string,
  id: string,
  size: PanelSize,
  rootId: string,
): TabsState {
  // Zaten açıksa sekmesine geçilir
  const known = prev.views.find((v) => v.ids.includes(id))
  if (known)
    return {
      ...prev,
      active: known.key,
      views: prev.views.map((v) => (v === known ? { ...v, focus: id } : v)),
    }
  // Formun tek child'ı olur: açık child'ı kapanır (çıkardığı form yerine döner), yenisi açılır
  const s = prev.entries
    .filter((e) => e.parent === from)
    .reduce((acc, e) => closeIn(acc, e.id, rootId), prev)
  const host = s.views.find((v) => v.ids.includes(from))!
  const at = s.views.indexOf(host)
  const views = [...s.views]
  let seq = s.seq

  if (size === 3) {
    // Yeni sekme: açanın (ve onun önceki child'larının) sekmelerinin hemen ardında
    const family = withDescendants(s.entries, from)
    const last = s.views.reduce((n, v, i) => (v.ids.some((x) => family.has(x)) ? i : n), at)
    const key = `v${seq++}`
    views.splice(last + 1, 0, single(key, id))
    return { entries: [...s.entries, { id, parent: from }], views, active: key, seq }
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
    entries: [...s.entries, { id, parent: from, ...(undo && { undo }) }],
    views,
    active: host.key,
    seq,
  }
}

/** Formu (ve açtığı child'ları) kapatır; açılışta bölmeden çıkan formlar yerine döner. */
function closeIn(s: TabsState, id: string, rootId: string): TabsState {
  const gone = withDescendants(s.entries, id)
  const back = s.entries.find((e) => e.id === id)?.parent ?? rootId
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

/** Sekmenin odaktaki formu (değişmiyorsa aynı durum: yeniden çizim yok). */
function focusIn(s: TabsState, key: string, id: string): TabsState {
  const v = s.views.find((x) => x.key === key)
  if (!v || !v.ids.includes(id) || (s.active === key && v.focus === id)) return s
  return { ...s, active: key, views: s.views.map((x) => (x === v ? { ...x, focus: id } : x)) }
}

export function FormTabs({
  rootId,
  root,
  renderTab,
}: {
  rootId: string
  /** Ana formun görünümü. */
  root: ReactNode
  /** Child sekmesinin görünümü; `close` formu (ve child'larını) kapatır. */
  renderTab: (id: string, close: () => void) => ReactNode
}) {
  const [st, setSt] = useState<TabsState>({
    entries: [],
    views: [single('root', rootId)],
    active: 'root',
    seq: 0,
  })
  const { entries } = st
  const hasTabs = entries.length > 0
  const grow = useTransition({ duration: 0.32, ease: [0.22, 1, 0.36, 1] })
  // Yan yana yalnızca geniş ekranda; daralınca bölünmüş sekmenin odaktaki formu tek başına kalır
  const wide = useMediaQuery('(min-width: 1024px)')
  const roomy = useMediaQuery('(min-width: 1200px)')
  const view = st.views.find((v) => v.key === st.active) ?? st.views[0]!
  const split = wide && view.ids.length === 2
  const shown = split ? view.ids : [view.focus]

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

  /** Formdan child açma: yeri child'ın panel boyutundan (dar ekranda hep yeni sekme). */
  const open = (from: string, id: string) => {
    // İlk child açılırken sayfa başa döner ki sekme alanı ekranın kalanına otursun
    if (!hasTabs) window.scrollTo({ top: 0 })
    const asked = panelSizeOf(id)
    const size: PanelSize = !wide || (asked === 2 && !roomy) ? 3 : asked
    setSt((s) => openIn(s, from, id, size, rootId))
  }
  const close = (id: string) => setSt((s) => closeIn(s, id, rootId))
  const select = (key: string, id: string) => setSt((s) => focusIn(s, key, id))

  /** Gruplu sekmenin bölmelerinin yerini değiştirir. */
  const swap = (key: string) =>
    setSt((s) => ({
      ...s,
      views: s.views.map((v) =>
        v.key === key && v.ids.length === 2
          ? { ...v, ids: [v.ids[1]!, v.ids[0]!], ratio: 100 - v.ratio, base: 100 - v.base }
          : v,
      ),
    }))

  /** Gruplu sekmeyi iki sekmeye ayırır; odaktaki form seçili kalır. */
  const ungroup = (key: string) =>
    setSt((s) => {
      const i = s.views.findIndex((v) => v.key === key)
      const v = s.views[i]
      if (!v || v.ids.length < 2) return s
      const [a, b] = v.ids as [string, string]
      const other = single(`v${s.seq}`, b)
      const views = [...s.views]
      views.splice(i, 1, { ...v, ids: [a], focus: a, ratio: 50, base: 50 }, other)
      return { ...s, views, active: v.focus === b ? other.key : v.key, seq: s.seq + 1 }
    })

  /** Tek formlu sekmeyi seçili (tek formlu) sekmenin sağına alır. */
  const join = (key: string) =>
    setSt((s) => {
      const host = s.views.find((v) => v.key === s.active)
      const other = s.views.find((v) => v.key === key)
      if (!host || !other || host === other || host.ids.length > 1 || other.ids.length > 1) return s
      const ids = [host.ids[0]!, other.ids[0]!]
      return {
        ...s,
        views: s.views
          .filter((v) => v !== other)
          .map((v) => (v === host ? { ...v, ids, focus: ids[1]!, ratio: 50, base: 50 } : v)),
      }
    })

  // Bölücü: seçili sekmenin sol bölme payı (%); sürüklenir, ok tuşlarıyla kayar
  const [dragging, setDragging] = useState(false)
  /** Yeni pay (ya da öncekinden hesaplayan işlev; basılı tutulan tuşta da doğru birikir). */
  const setRatio = (r: number | ((prev: number) => number)) =>
    setSt((s) => ({
      ...s,
      views: s.views.map((v) =>
        v.key === s.active
          ? { ...v, ratio: clampRatio(typeof r === 'function' ? r(v.ratio) : r) }
          : v,
      ),
    }))
  const onDividerDown = (e: PointerEvent<HTMLElement>) => {
    const host = e.currentTarget.parentElement
    if (!host || e.button !== 0) return
    e.preventDefault()
    const rect = host.getBoundingClientRect()
    setDragging(true)
    const move = (ev: globalThis.PointerEvent) =>
      setRatio(((ev.clientX - rect.left) / rect.width) * 100)
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
    setRatio((r) => r + (e.key === 'ArrowLeft' ? -2 : 2))
  }

  const ease = !dragging && PANE_EASE
  // Seçili sekme tek formluysa diğer tek formlu sekmeler onun yanına alınabilir
  const canJoin = wide && view.ids.length === 1

  return (
    <FormTabsContext value={open}>
      {/* Yapı sabit: sekmeler gelip gidince ana form yeniden takılmaz */}
      <Flex
        ref={outer}
        style={
          {
            '--split': `${view.ratio}%`,
            ...(hasTabs && { height: `calc(100dvh - ${top}px - 1.5rem)` }),
          } as CSSProperties
        }
        className={cn('flex flex-col', PAGE)}
      >
        {/* Şerit: ilk açılışta yüksekliği büyüyüp formu aşağı iter, son form kapanınca kapanır */}
        <AnimatePresence initial={false}>
          {hasTabs && (
            <MotionFlex
              key="strip"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={grow}
              // Yükseklik büyürken sekmeler şeridin altından yükselir
              className="flex shrink-0 overflow-hidden"
            >
              <TabRow
                views={st.views}
                active={view.key}
                rootId={rootId}
                onSelect={select}
                onClose={close}
                onJoin={canJoin ? join : undefined}
              />
              {split && (
                <Flex
                  key={view.key}
                  role="group"
                  aria-label="Yan yana"
                  className="flex shrink-0 animate-[fade-in_calc(0.3s*var(--motion-time,1))_ease-out] items-center gap-0.5 ps-1 pe-3 pt-3"
                >
                  <Tip label="Yer değiştir">
                    <Button
                      type="text"
                      size="small"
                      aria-label="Bölmelerin yerini değiştir"
                      icon={<ArrowLeftRight {...IC} size={14} />}
                      onClick={() => swap(view.key)}
                      className="text-muted"
                    />
                  </Tip>
                  <Tip label="Ayrı sekmelere ayır">
                    <Button
                      type="text"
                      size="small"
                      aria-label="Ayrı sekmelere ayır"
                      icon={<Ungroup {...IC} size={14} />}
                      onClick={() => ungroup(view.key)}
                      className="text-muted"
                    />
                  </Tip>
                </Flex>
              )}
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
                // Bölmede tıklanan / odaklanılan form sekmede vurgulanır
                onFocus={split ? () => select(view.key, id) : undefined}
                className={cn(slot < 0 ? '' : split ? BASIS[slot as 0 | 1] : BASIS.single, ease)}
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
              aria-valuenow={Math.round(view.ratio)}
              tabIndex={0}
              onPointerDown={onDividerDown}
              onKeyDown={onDividerKey}
              // Çift tık: panel boyutunun payına döner
              onDoubleClick={() => setRatio(view.base)}
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

/** Sekme şeridi: sekmeler ve seçili sekmenin kayan zemini. */
function TabRow({
  views,
  active,
  rootId,
  onSelect,
  onClose,
  onJoin,
}: {
  views: View[]
  active: string
  rootId: string
  onSelect: (key: string, id: string) => void
  onClose: (id: string) => void
  onJoin?: (key: string) => void
}) {
  // Seçim zemininin yeri: seçili sekmenin şerit içindeki konumu; ilk ölçümde kaymadan yerleşir
  const [rowEl, setRowEl] = useState<HTMLElement | null>(null)
  const [bar, setBar] = useState<Bar | null>(null)
  const key = views.map((v) => `${v.key}:${v.ids.join(',')}`).join('|')
  // Çıkan sekme animasyonu bitene kadar yer kaplar; bitince (DOM'dan kalkınca) yeniden ölçülür
  const [settled, setSettled] = useState(0)
  useLayoutEffect(() => {
    if (!rowEl) return
    const measure = () => {
      const el = rowEl.querySelector<HTMLElement>(`[data-tab="${CSS.escape(active)}"]`)
      setBar((b) => {
        if (!el) return null
        const next = { left: el.offsetLeft, width: el.offsetWidth, slide: b !== null }
        return b && b.left === next.left && b.width === next.width ? b : next
      })
    }
    measure()
    // Şerit ya da tek tek sekmelerin boyutu değişince (gruplanma, yazı tipi) de yeniden ölçülür
    const ro = new ResizeObserver(measure)
    ro.observe(rowEl)
    rowEl.querySelectorAll('[data-tab]').forEach((t) => ro.observe(t))
    return () => ro.disconnect()
  }, [rowEl, active, key, settled])

  return (
    <Scroll horizontal className="min-w-0 flex-1 [scrollbar-width:none]">
      <Flex
        ref={setRowEl}
        role="group"
        aria-label="Açık formlar"
        className="relative flex min-w-max items-end gap-1 px-8 pt-1"
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
          {views.map((v) => (
            <ViewTab
              key={v.key}
              view={v}
              selected={v.key === active}
              rootId={rootId}
              onSelect={(id) => onSelect(v.key, id)}
              onClose={onClose}
              onJoin={
                onJoin && v.key !== active && v.ids.length === 1 ? () => onJoin(v.key) : undefined
              }
            />
          ))}
        </AnimatePresence>
      </Flex>
    </Scroll>
  )
}

/**
 * Sekme: tek formun adı ya da gruplu sekmede iki formun adı (aralarında ince çizgi, başta şema).
 * Kapatma her formun yanında; ana form kapanmaz.
 */
function ViewTab({
  view,
  selected,
  rootId,
  onSelect,
  onClose,
  onJoin,
}: {
  view: View
  selected: boolean
  rootId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  /** Yan yana aç: bu sekmeyi seçili sekmenin yanına alır. */
  onJoin?: () => void
}) {
  const grouped = view.ids.length > 1
  const transition = useTransition({ type: 'spring', stiffness: 420, damping: 36 })
  return (
    // Yeni sekme aşağıdan süzülür. Seçili olmayanın zemini kısa ve gri, seçili olanın zemini
    // şeritteki kayan parça (onun üstünde durur)
    <MotionFlex
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      transition={transition}
      data-tab={view.key}
      role={grouped ? 'group' : undefined}
      aria-label={grouped ? `Yan yana: ${view.ids.map(nameOf).join(', ')}` : undefined}
      className={cn('group/tab relative flex h-12 shrink-0 items-stretch', selected && 'z-2')}
    >
      {!selected && (
        <Flex
          aria-hidden
          className="absolute inset-x-0 top-2 bottom-0 z-0 block rounded-t-2xl bg-surface-tertiary"
        />
      )}
      <Flex className={cn('relative z-2 flex items-center pt-2 pe-2', grouped && 'ps-4')}>
        {grouped && (
          <SplitGlyph
            ratio={view.ratio}
            focus={view.ids.indexOf(view.focus)}
            className={selected ? 'text-accent-soft-foreground' : 'text-muted'}
          />
        )}
        {view.ids.map((id, i) => (
          <Fragment key={id}>
            {i > 0 && <Divider orientation="vertical" className="mx-0.5 h-4" />}
            <TabLabel
              id={id}
              grouped={grouped}
              current={selected && (!grouped || id === view.focus)}
              onSelect={() => onSelect(id)}
              onClose={id === rootId ? undefined : () => onClose(id)}
            />
          </Fragment>
        ))}
        {onJoin && (
          <Tip label="Yan yana aç">
            <Button
              type="text"
              size="small"
              aria-label={`Yan yana aç: ${nameOf(view.ids[0]!)}`}
              icon={<Columns2 {...IC} size={14} />}
              onClick={onJoin}
              className="text-muted opacity-0 transition-opacity group-hover/tab:opacity-100 focus-visible:opacity-100"
            />
          </Tip>
        )}
      </Flex>
    </MotionFlex>
  )
}

/** Gruplu sekmenin şeması: iki bölme, payları ekrandaki gibi; odaktaki dolu. */
function SplitGlyph({
  ratio,
  focus,
  className,
}: {
  ratio: number
  focus: number
  className?: string
}) {
  return (
    <Flex aria-hidden gap={2} className={cn('me-1.5 h-3 w-5 shrink-0', className)}>
      {[ratio, 100 - ratio].map((share, i) => (
        <Flex
          key={i}
          // Pay sürüklemeyle değişir: genişlik oranı satır içi
          style={{ flexGrow: share }}
          className={cn(
            'block basis-0 rounded-[3px] border-[1.5px] border-current transition-[flex-grow,background-color] duration-[calc(260ms*var(--motion-time,1))]',
            i === focus && 'bg-current',
          )}
        />
      ))}
    </Flex>
  )
}

/** Sekmedeki form adı (ipucunda talep numarası) ve kapatma düğmesi. */
function TabLabel({
  id,
  grouped,
  current,
  onSelect,
  onClose,
}: {
  id: string
  grouped: boolean
  current: boolean
  onSelect: () => void
  onClose?: () => void
}) {
  const name = nameOf(id)
  // Aynı adlı formlar (ör. iki teklif) ipucundaki talep numarasıyla ayrılır; sekmede yalnızca ad
  const hint = findRequest(id)?.no
  return (
    <Flex className="flex h-full min-w-0 animate-[fade-in_calc(0.3s*var(--motion-time,1))_ease-out] items-center">
      <Tip label={hint ? `${name} · ${hint}` : name}>
        <Button
          type="text"
          aria-current={current || undefined}
          onClick={onSelect}
          className={cn(
            'h-full rounded-none px-3 hover:bg-transparent!',
            grouped ? 'max-w-[15rem]' : 'max-w-[24rem] ps-5',
            current ? 'text-accent-soft-foreground' : 'text-foreground/70 hover:text-foreground',
          )}
        >
          <Typography.Text
            ellipsis
            className={cn(
              'min-w-0 text-sm text-current',
              current ? 'font-semibold' : 'font-medium',
            )}
          >
            {name}
          </Typography.Text>
        </Button>
      </Tip>
      {onClose && (
        <Tip label="Kapat">
          <Button
            type="text"
            size="small"
            aria-label={`Kapat: ${name}`}
            icon={<X {...IC} size={14} />}
            onClick={onClose}
            className="-ms-1.5 text-muted"
          />
        </Tip>
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
  onFocus,
  className,
  children,
}: {
  slot: -1 | 0 | 1
  split: boolean
  scroll: boolean
  /** Bölmeye tıklanınca / odaklanılınca (yan yanayken). */
  onFocus?: () => void
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
      onPointerDownCapture={visible ? onFocus : undefined}
      onFocusCapture={visible ? onFocus : undefined}
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
      <PaneContext value={scroll && visible ? scroller : null}>{children}</PaneContext>
    </Flex>
  )
}
