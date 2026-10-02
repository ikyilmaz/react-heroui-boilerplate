import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { ArrowLeftRight, Columns2, FileText, Ungroup, X } from 'lucide-react'
import {
  AnimatePresence,
  animate,
  frame,
  useMotionValue,
  usePresence,
  type Transition,
} from 'framer-motion'
import { Button, Flex, Typography } from 'antd'
import { findRequest, panelSizeOf, processOf, type PanelSize } from '@/synergy/shared/workflowData'
import {
  activeView,
  clampRatio,
  initTabs,
  SPLIT_MAX,
  SPLIT_MIN,
  tabsReducer,
  type View,
} from '@/synergy/shared/formTabs'
import { useMediaQuery, useRadiusPx } from '@/synergy/shared/hooks'
import { useLook } from '@/synergy/shared/themeSettings'
import { useTransition } from '@/synergy/motion'
import { cn, IC, MotionFlex, Scroll, Tip } from '@/synergy/ant/ui'

/* -------------------------------------------------------------------------------------------------
 * Form sekmeleri (parent → child → child child)
 *
 * Formdaki bir düğmeyle açılan child talep, detay sayfasının aynısıyla açılır. Nerede açılacağını
 * child formun panel boyutu belirler (mantık `shared/formTabs.ts`): 1 / 2 sekmeyi böler, 3 yeni
 * sekmede açılır; bölünmüş iki form tek sekmede gruplanır. Dar ekranda yer yok: 1024px altında
 * hepsi, 1200px altında 2'ler de 3 gibi açılır (orijinaldeki gibi).
 *
 * Sekmeler ajanda sekmeleri gibi (AgendaTabs.tsx ile aynı görünüş): açık formlar, açık renkli bir
 * sayfa kabının içinde birer yaprak; seçili sekme o kabın renginde ve içbükey kavislerle kaba
 * kaynaşır, seçim zemini sekmeden sekmeye kayar; diğerleri kısa ve gri. Her formun önünde süreç
 * ikonu; gruplu sekme iki formun ikonu ve adıyla, odaktaki formun ikonu ve adı birincil renkte. Ada
 * basınca o bölme odaklanır (dar ekranda yalnızca o görünür). Şeridin ucunda yer değiştirme (⇄) ve
 * sekmelere ayırma; tek formlu sekme "Yan yana aç" ile seçili sekmenin yanına alınır. Klavye: oklar
 * sekmeler arasında gezer, Delete formu kapatır.
 *
 * Hareket Motion'ın düzen animasyonuyla (`layout`, FLIP): düzen değişince her form son yerine bir
 * kez dizilir; Motion yaprağı eski yerinden yenisine yalnızca dönüşümle (kayma + ölçek) götürür,
 * içerik her karede yeniden dizilmez. Yaprağın içi `layout="position"`: Motion ölçeği onda geri alır
 * (yazı basıklaşmaz), içerik son boyunda yaprağın köşesine bağlı durur, yaprak onu kırpar. Köşe
 * yarıçapı px olarak verilir (Motion köşeyi yalnızca öyle düzeltir).
 * - Bölme açılınca açan form daralır, yeni form kabın sağ kenarından iterek girer (kenarları aynı
 *   eğride, birlikte ilerler); kapanınca kendi kenarına itilerek çıkar (`popLayout`: akıştan hemen
 *   çıkar, beklemez), kalan form genişler. Tek başına görünen form kapanınca yerinde söner. Yer
 *   değiştirme, şerit kayması, ayırma / yan yana alma, pay (çift tık, Home / End / Enter, oklar) ve
 *   şeridin gelip gidişi aynı yolla.
 * - Bölme yalnızca hem önce hem sonra görünüyorsa ölçülür (`layoutDependency`); gizli formun
 *   (display: none) boş kutusundan hareket başlamaz. Yeni görünen form değişimin yönünden kayarak
 *   gelir (sekme geçişi), ekrandan çıkan form (sekme geçişi, ayırma) hemen gizlenir.
 * - Bölücü sürüklenirken React çizmez, Motion da devreye girmez (`--split` doğrudan yazılır).
 * Azaltılmış animasyonda yalnızca solma (Motion yer değişimini anında yapar), kapalıyken anında.
 *
 * Sekmeler açıkken sayfa değil formun içi kayar (üst çubuk ve sekmeler hep görünür); her form kendi
 * kaydırma kabıdır (`useTabScroller`; yapışkan başlık şeridi onu izler) ve kaldığı yeri hatırlar.
 * Formlar DOM'da hiç yer değiştirmez ve bir kez çizilir (sekme seçmek formları yeniden çizmez): hepsi
 * aynı kapta takılı kalır, görünenler CSS `order` ve genişlikle bölmelere yerleşir.
 * ------------------------------------------------------------------------------------------------- */

/** Child açma: açan form ve açılacak talep. */
type OpenChild = (from: string, id: string) => void

const FormTabsContext = createContext<OpenChild | null>(null)

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

/** Bütün geçişlerin eğrisi (ease-out-quint): şerit, sekmeler, bölmeler aynı ritimde. */
const EASE = [0.22, 1, 0.36, 1] as const

/** Bölme genişlikleri: tek, sol, sağ (aradaki bölücü 0.75rem). */
const BASIS = {
  single: 'basis-full',
  0: 'basis-[calc(var(--split)-0.375rem)]',
  1: 'basis-[calc(100%-var(--split)-0.375rem)]',
} as const

/** Formun sunucudan gelişi (maket): yeni giren form bu süre iskelet olarak görünür. */
const LOAD_MS = 1000

/** Yaprağın köşesi (`rounded-2xl`). */
const SHEET_RADIUS = 'calc(var(--radius) * 2)'

/** Sekmedeki ad ve ikon, ipucundaki talep numarası. */
function formMeta(id: string) {
  const r = findRequest(id)
  const p = r && processOf(r)
  return { name: p?.form ?? id, icon: p?.icon ?? FileText, no: r?.no }
}

/** Düzen adımı: görünen formlar ve pay her değişince bir artar. */
interface Step {
  layout: string
  key: string
  index: number
  shown: string[]
  n: number
  /** Değişimin yönü: 1 ileri (sağdan gelir), -1 geri. */
  dir: 1 | -1
  /** Bölmenin son ölçüldüğü adım (Motion bu değişince eski yerinden götürür). */
  moved: Record<string, number>
  /** Bölmenin son göründüğü adım ve nasıl geldiği. */
  entered: Record<string, Entered>
}

/**
 * Yeni görünen bölmenin gelişi: `push` aynı sekmede açılan yan bölme (kabın kenarından iterek
 * girer, açan form aynı anda daralır), değilse sekme geçişi (yönden kısa kayarak belirir).
 */
interface Entered {
  n: number
  push: boolean
}

export function FormTabs({
  rootId,
  root,
  renderTab,
  placeholder,
}: {
  rootId: string
  /** Ana formun görünümü. */
  root: ReactNode
  /** Form gelene kadar (`LOAD_MS`) bölmede duran iskelet. */
  placeholder: ReactNode
  /** Child sekmesinin görünümü; `close` formu (ve child'larını) kapatır. Sabit bir işlev olmalı. */
  renderTab: (id: string, close: () => void) => ReactNode
}) {
  const [st, dispatch] = useReducer(tabsReducer, rootId, initTabs)
  const hasTabs = st.entries.length > 0
  // Yan yana yalnızca geniş ekranda; daralınca bölünmüş sekmenin odaktaki formu tek başına kalır
  const wide = useMediaQuery('(min-width: 1024px)')
  const roomy = useMediaQuery('(min-width: 1200px)')
  const view = activeView(st)
  const split = wide && view.ids.length === 2
  const shown = split ? view.ids : [view.focus]
  const fadeT = useTransition({ duration: 0.16, ease: EASE })
  const enterT = useTransition({ duration: 0.34, ease: EASE })
  const moveT = useTransition({ duration: 0.42, ease: EASE })
  const radius = useRadiusPx(SHEET_RADIUS)

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
  const open = useCallback<OpenChild>(
    (from, id) => {
      // İlk child açılırken sayfa başa döner ki sekme alanı ekranın kalanına otursun
      if (!hasTabs) window.scrollTo({ top: 0 })
      const asked = panelSizeOf(id)
      const size: PanelSize = !wide || (asked === 2 && !roomy) ? 3 : asked
      dispatch({ type: 'open', from, id, size })
    },
    [hasTabs, wide, roomy],
  )
  const close = useCallback((id: string) => dispatch({ type: 'close', id }), [])

  // Child formlar kimlik başına bir kez kurulur: sekme seçmek, bölmeye tıklamak ya da bölücüyü
  // sürüklemek formları yeniden çizmez (`renderTab` sabit bir işlev olmalı)
  const idsKey = st.entries.map((e) => e.id).join('|')
  const children = useMemo(
    () =>
      (idsKey ? idsKey.split('|') : []).map((id) => ({ id, node: renderTab(id, () => close(id)) })),
    [idsKey, renderTab, close],
  )

  // Düzen değişimi çizimde yakalanır (görünen formlar, pay). Hem önce hem şimdi görünen bölme bu
  // adımda ölçülür (Motion eski yerinden götürür); yeni görünen yönden kayarak gelir. Gizlenen
  // bölmenin adımı değişmez: gizliyken ölçülmez, görününce de boş kutusundan hareket başlamaz.
  const layout = `${view.key}|${shown.join(',')}|${split ? view.ratio : ''}`
  const index = st.views.indexOf(view)
  const [step, setStep] = useState<Step>(() => ({
    layout,
    key: view.key,
    index,
    shown,
    n: 0,
    dir: 1,
    moved: {},
    entered: {},
  }))
  if (step.layout !== layout) {
    const n = step.n + 1
    const moved = { ...step.moved }
    const entered = { ...step.entered }
    for (const id of shown) {
      if (step.shown.includes(id)) moved[id] = n
      else entered[id] = { n, push: split && step.key === view.key && shown.indexOf(id) === 1 }
    }
    const forward =
      step.key !== view.key
        ? index >= step.index
        : view.ids.indexOf(shown[0]!) >= view.ids.indexOf(step.shown[0]!)
    setStep({ layout, key: view.key, index, shown, n, dir: forward ? 1 : -1, moved, entered })
  }

  /* --- Bölücü: sürüklerken pay doğrudan `--split`e yazılır (React çizmez), bırakınca kaydedilir -- */
  const sep = useRef<HTMLElement | null>(null)
  const drag = useRef<{ left: number; width: number; ratio: number } | null>(null)
  const [resizing, setResizing] = useState(false)
  const onDividerDown = (e: PointerEvent<HTMLElement>) => {
    const host = e.currentTarget.parentElement
    if (!host || e.button !== 0) return
    e.preventDefault()
    // Pay, kabın iç genişliğine göre (dolgu hariç): imleç bölücünün ortasında kalır
    const rect = host.getBoundingClientRect()
    const cs = getComputedStyle(host)
    const pl = parseFloat(cs.paddingLeft) || 0
    const pr = parseFloat(cs.paddingRight) || 0
    drag.current = { left: rect.left + pl, width: rect.width - pl - pr, ratio: view.ratio }
    e.currentTarget.setPointerCapture(e.pointerId)
    setResizing(true)
  }
  const onDividerMove = (e: PointerEvent<HTMLElement>) => {
    const d = drag.current
    if (!d) return
    d.ratio = clampRatio(((e.clientX - d.left) / d.width) * 100)
    outer.current?.style.setProperty('--split', `${d.ratio}%`)
    sep.current?.setAttribute('aria-valuenow', String(Math.round(d.ratio)))
  }
  const onDividerUp = () => {
    const d = drag.current
    if (!d) return
    drag.current = null
    setResizing(false)
    dispatch({ type: 'ratio', value: d.ratio })
  }
  // Oklar küçük adım, Home / End uçlar, Enter panel boyutunun payı (bölmeler yeni paya kayar)
  const onDividerKey = (e: KeyboardEvent<HTMLElement>) => {
    const by = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      dispatch({ type: 'nudge', delta: e.key === 'ArrowLeft' ? -by : by })
    else if (e.key === 'Home') dispatch({ type: 'ratio', value: SPLIT_MIN })
    else if (e.key === 'End') dispatch({ type: 'ratio', value: SPLIT_MAX })
    else if (e.key === 'Enter') dispatch({ type: 'ratio', value: view.base })
    else return
    e.preventDefault()
  }

  const focusPane = (id: string) => dispatch({ type: 'focus', view: view.key, id })
  // Seçili sekme tek formluysa diğer tek formlu sekmeler onun yanına alınabilir
  const canJoin = wide && view.ids.length === 1

  return (
    <FormTabsContext value={open}>
      {/* Yapı sabit: sekmeler gelip gidince ana form yeniden takılmaz. `relative`: çıkan şerit
          (`popLayout`) burada mutlak konumlanır */}
      <Flex
        ref={outer}
        style={
          {
            '--split': `${view.ratio}%`,
            ...(hasTabs && { height: `calc(100dvh - ${top}px - 1.5rem)` }),
          } as CSSProperties
        }
        className={cn('relative flex flex-col', PAGE)}
      >
        {/* Şerit: sekmeler kabın içinden kısa yükselir; formlar yeni yerlerine Motion'la kayar */}
        <AnimatePresence initial={false} mode="popLayout">
          {hasTabs && (
            <MotionFlex
              key="strip"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: fadeT }}
              transition={enterT}
              className="flex shrink-0"
            >
              <TabStrip
                views={st.views}
                active={view.key}
                rootId={rootId}
                split={split}
                onSelect={(key, id) => dispatch({ type: 'focus', view: key, id })}
                onClose={close}
                onJoin={canJoin ? (key) => dispatch({ type: 'join', view: key }) : undefined}
              />
              <AnimatePresence initial={false}>
                {split && (
                  <MotionFlex
                    key="split-actions"
                    role="group"
                    aria-label="Yan yana"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    transition={fadeT}
                    className="flex shrink-0 items-center gap-0.5 ps-1 pe-3 pt-3"
                  >
                    <Tip label="Yer değiştir">
                      <Button
                        type="text"
                        size="small"
                        aria-label="Bölmelerin yerini değiştir"
                        icon={<ArrowLeftRight {...IC} size={15} />}
                        onClick={() => dispatch({ type: 'swap', view: view.key })}
                        className="text-muted hover:text-foreground!"
                      />
                    </Tip>
                    <Tip label="Ayrı sekmelere ayır">
                      <Button
                        type="text"
                        size="small"
                        aria-label="Ayrı sekmelere ayır"
                        icon={<Ungroup {...IC} size={15} />}
                        onClick={() => dispatch({ type: 'ungroup', view: view.key })}
                        className="text-muted hover:text-foreground!"
                      />
                    </Tip>
                  </MotionFlex>
                )}
              </AnimatePresence>
            </MotionFlex>
          )}
        </AnimatePresence>

        {/*
         * Formların kabı: sekmeler açıkken ekranın kalanını doldurur, formlar içinde kayar. Tüm
         * formlar burada takılı; görünenler `order` ile sıralanır (sol 0, bölücü 1, sağ 2).
         * `relative`: kapanan form (`popLayout`) burada mutlak konumlanır. Kenardan giren / çıkan
         * form kabın kenarında kırpılır (`overflow-clip`: kaydırma kabı değil, sayfa kipinde yapışkan
         * başlık sayfaya yapışmaya devam eder).
         */}
        <Flex
          className={cn(
            'relative flex min-w-0 overflow-clip',
            hasTabs ? cn('min-h-0 flex-1 rounded-3xl bg-(--tab-bg) p-3', CUE) : 'p-0',
            resizing && 'cursor-col-resize select-none',
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {[{ id: rootId, node: root }, ...children].map(({ id, node }) => {
              const slot = shown.indexOf(id) as -1 | 0 | 1
              return (
                <Pane
                  key={id}
                  id={id}
                  slot={slot}
                  sheet={hasTabs}
                  moved={step.moved[id] ?? 0}
                  entered={step.entered[id]}
                  dir={step.dir}
                  paired={split && slot >= 0}
                  slide={wide}
                  radius={radius}
                  moveT={moveT}
                  enterT={enterT}
                  fadeT={fadeT}
                  placeholder={placeholder}
                  // Bölmede tıklanan / odaklanılan form sekmede vurgulanır
                  onFocus={split ? () => focusPane(id) : undefined}
                  className={cn(
                    slot < 0 ? '' : split ? BASIS[slot as 0 | 1] : BASIS.single,
                    // Sürüklerken formlar imleci almaz (üstüne gelme efektleri, metin seçimi)
                    resizing && 'pointer-events-none',
                  )}
                >
                  {node}
                </Pane>
              )
            })}
          </AnimatePresence>
          {split && (
            <MotionFlex
              ref={sep}
              role="separator"
              aria-orientation="vertical"
              aria-label="Bölücü"
              aria-valuemin={SPLIT_MIN}
              aria-valuemax={SPLIT_MAX}
              aria-valuenow={Math.round(view.ratio)}
              tabIndex={0}
              // Pay değişince bölmelerle birlikte yeni yerine kayar
              layout="position"
              layoutDependency={step.n}
              transition={{ layout: moveT }}
              onPointerDown={onDividerDown}
              onPointerMove={onDividerMove}
              onPointerUp={onDividerUp}
              onPointerCancel={onDividerUp}
              onKeyDown={onDividerKey}
              // Çift tık: panel boyutunun payına döner
              onDoubleClick={() => dispatch({ type: 'ratio', value: view.base })}
              className="group/divider order-1 flex w-3 shrink-0 animate-[fade-in_calc(0.3s*var(--motion-time,1))_ease-out] cursor-col-resize touch-none justify-center py-6 outline-none"
            >
              {/* İnce çizgi; üstüne gelince, sürüklerken ve klavye odağında kalınlaşıp renklenir */}
              <Flex
                aria-hidden
                className={cn(
                  'block w-px rounded-full bg-border transition-[width,background-color] duration-[calc(150ms*var(--motion-time,1))]',
                  'group-hover/divider:w-[3px] group-hover/divider:bg-accent/40 group-focus-visible/divider:w-[3px] group-focus-visible/divider:bg-accent',
                  resizing && 'w-[3px] bg-accent!',
                )}
              />
            </MotionFlex>
          )}
        </Flex>
      </Flex>
    </FormTabsContext>
  )
}

/**
 * Sekme şeridi: sekmeler ve seçili sekmenin kayan zemini. Sekme eklenip çıkınca diğerleri yerine
 * kayar; seçim zemini aynı yayla yeni yerine gider.
 */
function TabStrip({
  views,
  active,
  rootId,
  split,
  onSelect,
  onClose,
  onJoin,
}: {
  views: View[]
  active: string
  rootId: string
  split: boolean
  onSelect: (key: string, id: string) => void
  onClose: (id: string) => void
  onJoin?: (key: string) => void
}) {
  const { motion: level } = useLook()
  // Ortak yay: sekmelerin yer değiştirmesi ve seçim zemini aynı anda, aynı biçimde
  const spring = useTransition()
  const fadeT = useTransition({ duration: 0.2, ease: EASE })
  const exitT = useTransition({ duration: 0.14, ease: [0.4, 0, 1, 1] })

  // Seçim zemininin yeri: seçili sekmenin şerit içindeki konumu (dönüşümden bağımsız: kayan
  // sekmenin varacağı yer). İlk ölçümde kaymadan yerleşir.
  const [row, setRow] = useState<HTMLElement | null>(null)
  const [bar, setBar] = useState<{ left: number; width: number } | null>(null)
  const layout = views.map((v) => `${v.key}:${v.ids.join(',')}`).join('|')
  useLayoutEffect(() => {
    if (!row) return
    const measure = () => {
      const el = row.querySelector<HTMLElement>(`[data-tab="${CSS.escape(active)}"]`)
      setBar((b) => {
        if (!el) return null
        const next = { left: el.offsetLeft, width: el.offsetWidth }
        return b && b.left === next.left && b.width === next.width ? b : next
      })
    }
    measure()
    // Şerit ya da tek tek sekmelerin boyutu değişince (gruplanma, yazı tipi) de yeniden ölçülür
    const ro = new ResizeObserver(measure)
    ro.observe(row)
    row.querySelectorAll('[data-tab]').forEach((t) => ro.observe(t))
    return () => ro.disconnect()
  }, [row, active, layout])

  // Seçili sekme şeridin dışında kaldıysa görünür yere kayar
  useEffect(() => {
    row?.querySelector(`[data-tab="${CSS.escape(active)}"]`)?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: level === 'full' ? 'smooth' : 'auto',
    })
  }, [row, active, level])

  // Klavye (WAI-ARIA sekmeleri): oklar / Home / End sekmeler arasında gezer, Delete formu kapatır
  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const tabs = [...e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')]
    const i = tabs.indexOf(document.activeElement as HTMLElement)
    if (i < 0) return
    const go = (n: number) => {
      e.preventDefault()
      tabs[(n + tabs.length) % tabs.length]?.focus()
    }
    if (e.key === 'ArrowRight') go(i + 1)
    else if (e.key === 'ArrowLeft') go(i - 1)
    else if (e.key === 'Home') go(0)
    else if (e.key === 'End') go(tabs.length - 1)
    else if (e.key === 'Delete') {
      const id = tabs[i]?.dataset.form
      if (!id || id === rootId) return
      e.preventDefault()
      // Kapanınca odak şeritte kalsın: soldaki sekmeye
      tabs[i - 1]?.focus()
      onClose(id)
    }
  }

  return (
    <Scroll horizontal className="min-w-0 flex-1 [scrollbar-width:none]">
      <Flex
        ref={setRow}
        role="tablist"
        aria-label="Açık formlar"
        aria-multiselectable={split || undefined}
        onKeyDown={onKeyDown}
        className="relative flex min-w-max items-end gap-1 px-8 pt-1"
      >
        {bar && (
          <MotionFlex
            aria-hidden
            initial={false}
            animate={{ left: bar.left, width: bar.width }}
            transition={spring}
            className={cn(
              'pointer-events-none absolute bottom-0 z-1 block h-12 rounded-t-2xl bg-(--tab-bg)',
              FLARES,
            )}
          />
        )}
        {/* Çıkan sekme akıştan hemen çıkar (`popLayout`): diğerleri beklemeden yerine kayar */}
        <AnimatePresence initial={false} mode="popLayout">
          {views.map((v) => {
            const selected = v.key === active
            return (
              <MotionFlex
                key={v.key}
                layout="position"
                data-tab={v.key}
                // Yeni sekme kabın içinden kısa yükselir; çıkan solarak iner
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10, pointerEvents: 'none', transition: exitT }}
                transition={{ layout: spring, y: spring, opacity: fadeT }}
                // Seçili sekme seçim zemininin (z-1) üstünde; kayarken de yazısı örtülmez
                className={cn(
                  'group/tab relative flex h-12 shrink-0 items-stretch',
                  selected && 'z-2',
                )}
              >
                <TabBody
                  view={v}
                  selected={selected}
                  split={split}
                  rootId={rootId}
                  onSelect={(id) => onSelect(v.key, id)}
                  onClose={onClose}
                  onJoin={
                    onJoin && !selected && v.ids.length === 1 ? () => onJoin(v.key) : undefined
                  }
                />
              </MotionFlex>
            )
          })}
        </AnimatePresence>
      </Flex>
    </Scroll>
  )
}

/**
 * Sekmenin içi: kısa gri zemin (seçilince solar; seçim zemini altından gelir) ve formlar. Gruplu
 * sekmede iki form, aralarında ince çizgi. Kapatma her formun yanında; ana form kapanmaz.
 */
function TabBody({
  view,
  selected,
  split,
  rootId,
  onSelect,
  onClose,
  onJoin,
}: {
  view: View
  selected: boolean
  split: boolean
  rootId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  /** Yan yana aç: bu sekmeyi seçili sekmenin yanına alır. */
  onJoin?: () => void
}) {
  const grouped = view.ids.length > 1
  return (
    <>
      <Flex
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-2 bottom-0 block rounded-t-2xl bg-surface-tertiary transition-[opacity,background-color] duration-[calc(200ms*var(--motion-time,1))]',
          selected
            ? 'opacity-0'
            : 'group-hover/tab:bg-[color-mix(in_oklab,var(--foreground)_6%,var(--surface-tertiary))]',
        )}
      />
      <Flex className="relative flex min-w-0 items-center pt-2 pe-1.5">
        {view.ids.map((id, i) => (
          <Fragment key={id}>
            {i > 0 && <Flex aria-hidden className="mx-0.5 block h-4 w-px shrink-0 bg-border" />}
            <TabLabel
              id={id}
              lead={i === 0}
              grouped={grouped}
              current={selected && (!grouped || id === view.focus)}
              // Bölünmüşken iki form birden görünür
              visible={selected && (split || !grouped || id === view.focus)}
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
              aria-label={`Yan yana aç: ${formMeta(view.ids[0]!).name}`}
              icon={<Columns2 {...IC} size={14} />}
              onClick={onJoin}
              className="ms-0.5 rounded-full text-muted opacity-0 transition-opacity group-hover/tab:opacity-100 hover:text-foreground! focus-visible:opacity-100"
            />
          </Tip>
        )}
      </Flex>
    </>
  )
}

/** Sekmedeki form: süreç ikonu ve adı (ipucunda talep numarası), yanında kapatma. */
function TabLabel({
  id,
  lead,
  grouped,
  current,
  visible,
  onSelect,
  onClose,
}: {
  id: string
  /** Sekmenin ilk formu (solda daha geniş boşluk). */
  lead: boolean
  grouped: boolean
  /** Odaktaki form: birincil renkte, klavyeyle sekmeye gelince odak buraya. */
  current: boolean
  /** Formu ekranda (`aria-selected`). */
  visible: boolean
  onSelect: () => void
  onClose?: () => void
}) {
  const { name, icon: Icon, no } = formMeta(id)
  return (
    <Flex className="flex h-full min-w-0 items-center">
      {/* Aynı adlı formlar (ör. iki teklif) ipucundaki talep numarasıyla ayrılır */}
      <Tip label={no ? `${name} · ${no}` : name}>
        <Button
          type="text"
          role="tab"
          id={`form-tab-${id}`}
          data-form={id}
          aria-selected={visible}
          aria-controls={`form-pane-${id}`}
          tabIndex={current ? 0 : -1}
          onClick={onSelect}
          icon={
            <Icon
              {...IC}
              className={cn(
                'shrink-0 transition-colors duration-200',
                current ? 'text-accent-soft-foreground' : 'text-muted',
              )}
            />
          }
          className={cn(
            // Klavye odağı sekmenin içinde ince çizgi (dışa taşan halka yerine)
            'h-full min-w-0 gap-2 rounded-t-xl rounded-b-none px-3 outline-none hover:bg-transparent! focus-visible:outline-none! focus-visible:[box-shadow:inset_0_0_0_2px_var(--focus)]',
            lead && 'ps-4',
            grouped ? 'max-w-[15rem]' : 'max-w-[22rem]',
            current ? 'text-accent-soft-foreground' : 'text-foreground/70 hover:text-foreground!',
          )}
        >
          <Typography.Text
            ellipsis
            className={cn(
              'min-w-0 text-sm text-current transition-colors duration-200',
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
            className="-ms-1 rounded-full text-muted hover:text-foreground!"
          />
        </Tip>
      )}
    </Flex>
  )
}

/**
 * Bir formun bölmesi. Her zaman aynı yerde takılı; `slot` -1 gizli, 0 sol (ya da tek), 1 sağ.
 * Sekmeler açıkken bir yaprak (zemin + köşe) ve kendi kaydırma kabıdır: gizlenince tarayıcı
 * kaydırmayı sıfırlar; son kaydırma yeri tutulur, görününce oraya dönülür.
 *
 * Hareket: yaprak Motion `layout` ile eski yerinden yenisine gider (yalnızca dönüşüm); içi
 * `layout="position"` (ölçek geri alınır, içerik son boyunda yaprağın köşesine bağlı). İkisi de
 * yalnızca `moved` değişince ölçülür. `entered` değişince gelir: yan bölme kabın kenarından iterek,
 * sekme geçişinde yönden kısa kayıp solarak. Kapanınca (`AnimatePresence`) yan yanaysa kendi kenarına
 * itilerek çıkar, değilse yerinde söner.
 */
function Pane({
  ref,
  id,
  slot,
  sheet,
  moved,
  entered,
  dir,
  paired,
  slide,
  radius,
  moveT,
  enterT,
  fadeT,
  placeholder,
  onFocus,
  className,
  children,
}: {
  /** `AnimatePresence` (`popLayout`) çıkan bölmeyi ölçmek için verir. */
  ref?: Ref<HTMLElement>
  id: string
  slot: -1 | 0 | 1
  /** Sekmeler açık: bölme bir yaprak ve kendi kaydırma kabı, sekme paneli olarak etiketli. */
  sheet: boolean
  /** Bölmenin son ölçüldüğü adım. */
  moved: number
  /** Bölmenin son göründüğü adım ve gelişi (yoksa ilk çizimden beri görünür). */
  entered?: Entered
  /** Değişimin yönü: 1 sağdan, -1 soldan gelir. */
  dir: 1 | -1
  /** Yan yana iki bölmeden biri: kapanınca kendi kenarına itilerek çıkar. */
  paired: boolean
  /** Kayarak gelir (geniş ekran; telefonda sabit olay şeridi yüzünden yalnızca solma). */
  slide: boolean
  /** Yaprağın köşesi (px; Motion ölçeğe göre düzeltir). */
  radius?: number
  moveT: Transition
  enterT: Transition
  fadeT: Transition
  /** Form gelene kadar duran iskelet. */
  placeholder: ReactNode
  /** Bölmeye tıklanınca / odaklanılınca (yan yanayken). */
  onFocus?: () => void
  className?: string
  children: ReactNode
}) {
  // Kaydırma kabı bağlama (yapışkan şerit) için durumda, kaydırma yerini yazmak için ref'te
  const [scroller, setScroller] = useState<HTMLElement | null>(null)
  const node = useRef<HTMLElement | null>(null)
  const attach = useCallback(
    (el: HTMLElement | null) => {
      node.current = el
      setScroller(el)
      if (typeof ref === 'function') ref(el)
      else if (ref) ref.current = el
    },
    [ref],
  )
  const saved = useRef(0)
  const visible = slot >= 0
  useLayoutEffect(() => {
    if (visible && node.current) node.current.scrollTop = saved.current
  }, [visible])

  // Gelir ve gider: yalnızca dönüşüm ve solma (MotionValue, React çizmez). Yan bölme kabın kenarından
  // iterek girer / kendi kenarına itilerek çıkar; hareket Motion'ın kare döngüsünde (`frame.update`)
  // başlar, düzen animasyonuyla aynı karede: kenarı, daralan / genişleyen formun kenarıyla birlikte.
  const { motion: level } = useLook()
  const x = useMotionValue(0)
  const opacity = useMotionValue(1)
  const played = useRef<number | undefined>(undefined)
  useLayoutEffect(() => {
    const el = node.current
    if (!entered || !el || played.current === entered.n) return
    played.current = entered.n
    if (level === 'off') return
    if (entered.push && level === 'full') {
      const box = el.offsetParent as HTMLElement | null
      x.jump((box?.clientWidth ?? el.offsetLeft) - el.offsetLeft)
      frame.update(() => void animate(x, 0, moveT))
      return
    }
    x.jump(slide && level === 'full' ? dir * 32 : 0)
    opacity.jump(0)
    void animate(x, 0, enterT)
    void animate(opacity, 1, enterT)
  }, [entered, dir, slide, level, moveT, enterT, x, opacity])

  // Kapanınca (`AnimatePresence`, `popLayout`: akıştan çıkmış, aynı yerde): yan yanaysa kendi
  // kenarına itilir, değilse söner; bitince kaldırılır. Çıkış bir kez başlar: çıkan bölme yeniden
  // çizilse de (AnimatePresence, geçiş nesneleri) yeniden başlamaz, kaldırma eşzamanlı zincir kurmaz.
  const [present, safeToRemove] = usePresence()
  const remove = useRef(safeToRemove)
  const leaving = useRef(false)
  useLayoutEffect(() => {
    remove.current = safeToRemove
    if (present) {
      leaving.current = false
      return
    }
    if (leaving.current) return
    leaving.current = true
    const done = () => remove.current?.()
    const el = node.current
    if (!el || level === 'off') {
      frame.postRender(done)
      return
    }
    if (paired && level === 'full') {
      const box = el.offsetParent as HTMLElement | null
      const to =
        slot === 1 ? (box?.clientWidth ?? 0) - el.offsetLeft : -el.offsetLeft - el.offsetWidth
      frame.update(() => void animate(x, to, moveT).then(done))
    } else void animate(opacity, 0, fadeT).then(done)
  }, [present, safeToRemove, paired, slot, level, moveT, fadeT, x, opacity])

  // Form sunucudan gelene kadar iskelet (bölme gizliyken de sürer); gelince iskelet solarken form belirir
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), LOAD_MS)
    return () => clearTimeout(t)
  }, [])
  const revealT = useTransition({ duration: 0.32, ease: EASE })

  return (
    <MotionFlex
      ref={attach}
      id={`form-pane-${id}`}
      role={sheet ? 'tabpanel' : undefined}
      aria-labelledby={sheet ? `form-tab-${id}` : undefined}
      layout
      layoutScroll={sheet}
      layoutDependency={moved}
      transition={{ layout: moveT }}
      style={{ x, opacity, ...(radius !== undefined && { borderRadius: radius }) }}
      // Gizliyken kaydırma olayı gelmez: son görünen yer saklı kalır
      onScroll={(e) => {
        if (visible) saved.current = e.currentTarget.scrollTop
      }}
      onPointerDownCapture={visible ? onFocus : undefined}
      onFocusCapture={visible ? onFocus : undefined}
      aria-busy={!loaded || undefined}
      className={cn(
        '@container min-w-0 shrink-0 rounded-2xl',
        visible ? 'block' : 'hidden',
        slot === 1 ? 'order-2' : 'order-0',
        // Yaprak kendi içinde kayar (yan kaydırma yok: hareket boyunca içerik yaprağı taşar);
        // yapışkan öğeler kabuğun değil yaprağın tepesine yapışsın
        sheet &&
          'min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain bg-background [--chrome-top:0px]',
        className,
      )}
    >
      <PaneContext value={sheet && visible ? scroller : null}>
        {/* `relative`: iskelet solarken formun üstünde durur (`popLayout`) */}
        <MotionFlex
          layout="position"
          layoutDependency={moved}
          transition={{ layout: moveT }}
          className={cn('relative block', sheet && 'p-3')}
        >
          {level === 'off' ? (
            // Animasyon kapalı: iskelet doğrudan forma döner (çıkış karesi beklenmez)
            loaded ? (
              children
            ) : (
              placeholder
            )
          ) : (
            <AnimatePresence initial={false} mode="popLayout">
              {loaded ? (
                <MotionFlex
                  key="form"
                  initial={{ opacity: 0, y: level === 'full' ? 8 : 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={revealT}
                  className="block"
                >
                  {children}
                </MotionFlex>
              ) : (
                <MotionFlex
                  key="placeholder"
                  exit={{ opacity: 0, transition: revealT }}
                  className="block"
                >
                  {placeholder}
                </MotionFlex>
              )}
            </AnimatePresence>
          )}
        </MotionFlex>
      </PaneContext>
    </MotionFlex>
  )
}
