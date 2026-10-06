import {
  createContext,
  Fragment,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
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
  useDragControls,
  useMotionValue,
  usePresence,
  useTransform,
  type Box,
  type PanInfo,
  type Transition,
} from 'framer-motion'
import { Button, Dropdown, Flex, Typography, type MenuProps } from 'antd'
import { findRequest, panelSizeOf, processOf, type PanelSize } from '@/synergy/shared/workflowData'
import {
  activeView,
  clampRatio,
  SPLIT_MAX,
  SPLIT_MIN,
  type TabsAction,
  type View,
} from '@/synergy/shared/formTabs'
import {
  activeGroup,
  type Group,
  type GroupsAction,
  type GroupsState,
} from '@/synergy/shared/formGroups'
import { useMediaQuery, useRadiusPx } from '@/synergy/shared/hooks'
import { useLook } from '@/synergy/shared/themeSettings'
import { useTransition } from '@/synergy/motion'
import { cn, IC, MotionFlex, Tip } from '@/synergy/ant/ui'
import { FLARES } from '@/synergy/AgendaTabs'

/* -------------------------------------------------------------------------------------------------
 * Form sekmeleri (parent → child → child child)
 *
 * Formdaki bir düğmeyle açılan child talep, detay sayfasının aynısıyla açılır. Nerede açılacağını
 * child formun panel boyutu belirler (mantık `shared/formTabs.ts`): 1 / 2 sekmeyi böler, 3 yeni
 * sekmede açılır; bölünmüş iki form tek sekmede yan yana durur. Dar ekranda yer yok: 1024px
 * altında hepsi, 1200px altında 2'ler de 3 gibi açılır (orijinaldeki gibi).
 *
 * Form grupları (açık istek üzerine; mantık `shared/formGroups.ts`): her açılan talep kendi grubu,
 * grubun child'ları onun sekmeleri. Yalnızca etkin grup açık, diğerleri tek sekmeye daralır;
 * birden çok grup varken her grup kendi yumuşak renginde (Chrome gibi alt çizgi, seçili sekmenin
 * çerçevesi ve grubun noktası). Sekmeler ve gruplar
 * sürükleyerek ya da sağ tık menüsüyle sıralanır.
 *
 * Sekmeler ajanda sekmeleri gibi (AgendaTabs.tsx): açık formlar, açık renkli bir sayfa kabının
 * içinde birer yaprak; seçili sekme o kabın renginde ve içbükey kavislerle kaba kaynaşır, seçim
 * zemini sekmeden sekmeye kayar; diğerleri aynı boyda, gri (renkli grupta zeminsiz). Her
 * formun önünde süreç ikonu; yan yana sekme iki formun ikonu ve adıyla, odaktaki formun ikonu ve adı
 * birincil renkte. Ada basınca o bölme odaklanır (dar ekranda yalnızca o görünür). Şeridin ucunda
 * yer değiştirme (⇄) ve sekmelere ayırma; tek formlu sekme "Yan yana aç" ile seçili sekmenin yanına
 * alınır. Klavye: oklar sekmeler arasında gezer, Delete formu kapatır (kökün sekmesinde grubu).
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

type MenuItem = NonNullable<MenuProps['items']>[number]

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

/** Bölmenin (ve sekmesinin) anahtarı: grup ve form; aynı form iki grupta birden açık olabilir. */
const paneKey = (group: string, id: string) => `${group}:${id}`
/** Bölme anahtarının grubu ve formu. */
const splitPaneKey = (key: string) => {
  const i = key.indexOf(':')
  return [key.slice(0, i), key.slice(i + 1)] as const
}
const formOf = (key: string) => splitPaneKey(key)[1]

/** Sekmedeki ad ve ikon, ipucundaki talep numarası. */
function formMeta(id: string) {
  const r = findRequest(id)
  const p = r && processOf(r)
  return { name: p?.form ?? id, icon: p?.icon ?? FileText, no: r?.no }
}

/** Düzen adımı: görünen formlar ve pay her değişince bir artar. */
interface Step {
  layout: string
  /** Etkin grup, sırası ve kökü (grup geçişinin ve Geri / İleri'nin yönü için). */
  group: string
  groupIndex: number
  root: string
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
  state: st,
  dispatch,
  renderRoot,
  renderTab,
  placeholder,
  onCloseGroup,
}: {
  /** Form grupları (`shared/formGroups.ts`; sayfa tutar: adres ve konum çubuğu da ondan). */
  state: GroupsState
  dispatch: Dispatch<GroupsAction>
  /** Grubun kök formunun görünümü. */
  renderRoot: (group: Group) => ReactNode
  /** Form gelene kadar (`LOAD_MS`) bölmede duran iskelet. */
  placeholder: ReactNode
  /** Child sekmesinin görünümü; `close` formu (ve child'larını) kapatır. Sabit bir işlev olmalı. */
  renderTab: (id: string, close: () => void) => ReactNode
  /** Grubu kapatır (kökün sekmesi); son grupsa sayfa listeye döner. */
  onCloseGroup: (key: string) => void
}) {
  const group = activeGroup(st)
  const groupIndex = st.groups.indexOf(group)
  const root = group.tabs.rootId
  // Sekme kipi: birden çok grup ya da grubun açık child'ı var (yoksa kök form sayfa gibi)
  const hasTabs = st.groups.length > 1 || group.tabs.entries.length > 0
  // Son child kapanırken sekme kipinden çıkılır ama çıkan bölme hâlâ kayıyor: bitene kadar kırpılır
  const [hadTabs, setHadTabs] = useState(hasTabs)
  const [leaving, setLeaving] = useState(false)
  if (hadTabs !== hasTabs) {
    setHadTabs(hasTabs)
    setLeaving(!hasTabs)
  }
  // Yan yana yalnızca geniş ekranda; daralınca bölünmüş sekmenin odaktaki formu tek başına kalır
  const wide = useMediaQuery('(min-width: 1024px)')
  const roomy = useMediaQuery('(min-width: 1200px)')
  const view = activeView(group.tabs)
  const split = wide && view.ids.length === 2
  // Bölmeler grup başına anahtarlı: aynı child (aynı şablon) iki grupta birden açık olabilir
  const shown = (split ? view.ids : [view.focus]).map((id) => paneKey(group.key, id))
  const tabs = (action: TabsAction) => dispatch({ type: 'tabs', key: group.key, action })
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

  /** Formdan child açma (grubun içinde): yeri child'ın panel boyutundan (dar ekranda hep yeni sekme). */
  const groupKeys = st.groups.map((g) => g.key).join('|')
  const openers = useMemo(() => {
    const make =
      (key: string): OpenChild =>
      (from, id) => {
        // İlk child açılırken sayfa başa döner ki sekme alanı ekranın kalanına otursun
        if (!hasTabs) window.scrollTo({ top: 0 })
        const asked = panelSizeOf(id)
        const size: PanelSize = !wide || (asked === 2 && !roomy) ? 3 : asked
        dispatch({ type: 'tabs', key, action: { type: 'open', from, id, size } })
      }
    return new Map(groupKeys.split('|').map((key) => [key, make(key)]))
  }, [groupKeys, hasTabs, wide, roomy, dispatch])
  const close = useCallback(
    (key: string, id: string) => dispatch({ type: 'tabs', key, action: { type: 'close', id } }),
    [dispatch],
  )

  // Child formlar kimlik başına bir kez kurulur: sekme seçmek, bölmeye tıklamak ya da bölücüyü
  // sürüklemek formları yeniden çizmez (`renderTab` sabit bir işlev olmalı)
  const childKeys = st.groups
    .flatMap((g) => g.tabs.entries.map((e) => paneKey(g.key, e.id)))
    .join('|')
  const children = useMemo(
    () =>
      (childKeys ? childKeys.split('|') : []).map((key) => {
        const [g, id] = splitPaneKey(key)
        return { key, group: g, id, node: renderTab(id, () => close(g, id)) }
      }),
    [childKeys, renderTab, close],
  )
  // Bütün grupların formları takılı kalır (girilen alanlar kaybolmasın); yalnızca etkin grubunkiler görünür
  const panes = [
    ...st.groups.map((g) => ({
      key: paneKey(g.key, g.tabs.rootId),
      group: g.key,
      id: g.tabs.rootId,
      node: renderRoot(g),
    })),
    ...children,
  ]

  // Düzen değişimi çizimde yakalanır (görünen formlar, pay). Hem önce hem şimdi görünen bölme bu
  // adımda ölçülür (Motion eski yerinden götürür); yeni görünen yönden kayarak gelir. Gizlenen
  // bölmenin adımı değişmez: gizliyken ölçülmez, görününce de boş kutusundan hareket başlamaz.
  // Yön: grup değiştiyse grupların sırası, kök değiştiyse (Geri / İleri) listedeki sıra, sekme
  // değiştiyse sekmelerin, bölme değiştiyse bölmelerin sırası.
  const layout = `${group.key}|${view.key}|${shown.join(',')}|${split ? view.ratio : ''}`
  const index = group.tabs.views.indexOf(view)
  const [step, setStep] = useState<Step>(() => ({
    layout,
    group: group.key,
    groupIndex,
    root,
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
    const sameView = step.group === group.key && step.key === view.key
    for (const key of shown) {
      if (step.shown.includes(key)) moved[key] = n
      else entered[key] = { n, push: split && sameView && shown.indexOf(key) === 1 }
    }
    const order = group.nav?.ids ?? []
    const forward =
      step.group !== group.key
        ? groupIndex >= step.groupIndex
        : step.root !== root
          ? order.indexOf(root) >= order.indexOf(step.root)
          : step.key !== view.key
            ? index >= step.index
            : view.ids.indexOf(formOf(shown[0]!)) >= view.ids.indexOf(formOf(step.shown[0]!))
    setStep({
      layout,
      group: group.key,
      groupIndex,
      root,
      key: view.key,
      index,
      shown,
      n,
      dir: forward ? 1 : -1,
      moved,
      entered,
    })
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
    tabs({ type: 'ratio', value: d.ratio })
  }
  // Oklar küçük adım, Home / End uçlar, Enter panel boyutunun payı (bölmeler yeni paya kayar)
  const onDividerKey = (e: KeyboardEvent<HTMLElement>) => {
    const by = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
      tabs({ type: 'nudge', delta: e.key === 'ArrowLeft' ? -by : by })
    else if (e.key === 'Home') tabs({ type: 'ratio', value: SPLIT_MIN })
    else if (e.key === 'End') tabs({ type: 'ratio', value: SPLIT_MAX })
    else if (e.key === 'Enter') tabs({ type: 'ratio', value: view.base })
    else return
    e.preventDefault()
  }

  const focusPane = (id: string) => tabs({ type: 'focus', view: view.key, id })
  // Seçili sekme tek formluysa diğer tek formlu sekmeler onun yanına alınabilir
  const canPair = wide && view.ids.length === 1

  return (
    <>
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
                groups={st.groups}
                active={group.key}
                split={split}
                // Etkin grupta sekme seçilir; başka grupta o gruba geçilip form gösterilir
                onSelect={(g, view, id) =>
                  g === group.key
                    ? tabs({ type: 'focus', view, id })
                    : dispatch({ type: 'reveal', key: g, form: id })
                }
                onClose={close}
                onCloseGroup={onCloseGroup}
                onPair={canPair ? (key) => tabs({ type: 'pair', view: key }) : undefined}
                onMoveTab={(g, view, to) => dispatch({ type: 'moveTab', key: g, view, to })}
                onMoveGroup={(key, to) => dispatch({ type: 'moveGroup', key, to })}
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
                    className="flex h-10 shrink-0 items-center gap-0.5 self-end ps-1 pe-3"
                  >
                    <Tip label="Yer değiştir">
                      <Button
                        type="text"
                        size="small"
                        aria-label="Bölmelerin yerini değiştir"
                        icon={<ArrowLeftRight {...IC} size={15} />}
                        onClick={() => tabs({ type: 'swap', view: view.key })}
                        className="text-muted hover:text-foreground!"
                      />
                    </Tip>
                    <Tip label="Ayrı sekmelere ayır">
                      <Button
                        type="text"
                        size="small"
                        aria-label="Ayrı sekmelere ayır"
                        icon={<Ungroup {...IC} size={15} />}
                        onClick={() => tabs({ type: 'unpair', view: view.key })}
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
         * `relative`: kapanan form (`popLayout`) burada mutlak konumlanır. Sekme alanında kenardan
         * giren / çıkan form kabın kenarında kırpılır (`overflow-clip`: kaydırma kabı değil). Tek
         * formda (sayfa kipi) kırpılmaz, kenardaki kartların konturu / gölgesi kesilmez; yalnızca
         * son child çıkarken.
         */}
        <Flex
          className={cn(
            'relative flex min-w-0',
            (hasTabs || leaving) && 'overflow-clip',
            hasTabs ? cn('min-h-0 flex-1 rounded-3xl bg-(--tab-bg) p-3', CUE) : 'p-0',
            resizing && 'cursor-col-resize select-none',
          )}
        >
          <AnimatePresence
            initial={false}
            mode="popLayout"
            onExitComplete={() => setLeaving(false)}
          >
            {panes.map(({ key, group: g, id, node }) => {
              const slot = shown.indexOf(key) as -1 | 0 | 1
              return (
                <Pane
                  key={key}
                  id={key}
                  slot={slot}
                  sheet={hasTabs}
                  moved={step.moved[key] ?? 0}
                  entered={step.entered[key]}
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
                  {/* Formun içinden açılan child kendi grubunda açılır */}
                  <FormTabsContext value={openers.get(g) ?? null}>{node}</FormTabsContext>
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
              onDoubleClick={() => tabs({ type: 'ratio', value: view.base })}
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
    </>
  )
}

/* --- Sürükleyerek sıralama ------------------------------------------------------------------- */

/**
 * Motion `Reorder`'ın mantığı, öğeler antd `Flex` (MotionFlex) kalsın diye elle: her öğe ölçüsünü
 * `onLayoutMeasure` ile bildirir; sürüklenen öğe, gittiği yöndeki komşusunun ortasını geçince yer
 * değiştirir (`onMove`). Yeni sıra çizilene kadar ikinci kez taşınmaz. `min`: bu sıranın önüne
 * geçilmez (grubun kök sekmesi).
 */
function useReorder(values: string[], onMove: (value: string, to: number) => void, min = 0) {
  const boxes = useRef(new Map<string, { min: number; max: number }>())
  const busy = useRef(false)
  const order = values.join('|')
  useEffect(() => {
    busy.current = false
  }, [order])
  return {
    register: (value: string, box: Box) => boxes.current.set(value, box.x),
    update: (value: string, offset: number, velocity: number) => {
      if (busy.current || !velocity) return
      const i = values.indexOf(value)
      const step = velocity > 0 ? 1 : -1
      const to = i + step
      if (i < 0 || to < min || to >= values.length) return
      const me = boxes.current.get(value)
      const next = boxes.current.get(values[to]!)
      if (!me || !next) return
      const center = (next.min + next.max) / 2
      if ((step === 1 && me.max + offset > center) || (step === -1 && me.min + offset < center)) {
        busy.current = true
        onMove(value, to)
      }
    },
  }
}

type Reorderer = ReturnType<typeof useReorder>

/**
 * Sürüklenebilir öğenin Motion özellikleri: yatay sürüklenir, bırakınca yeni yerine akar
 * (`dragSnapToOrigin` + düzen animasyonu); sürüklenirken üstte. Sürükleme bittikten sonraki tıklama
 * yutulur (sekme seçilmesin). Şerit kaydırılabiliyorsa kenara yaklaşınca kayar.
 */
function useDragItem(value: string, reorder: Reorderer, scroller: HTMLElement | null) {
  const x = useMotionValue(0)
  const zIndex = useTransform(x, (v) => (v ? 30 : 'auto'))
  const dragged = useRef(false)
  return {
    drag: 'x' as const,
    dragSnapToOrigin: true,
    dragMomentum: false,
    style: { x, zIndex },
    onDragStart: () => {
      dragged.current = true
    },
    onDrag: (_: unknown, info: PanInfo) => {
      reorder.update(value, x.get(), info.velocity.x)
      // Kenara 48px kala şerit o yöne kayar
      if (!scroller) return
      const r = scroller.getBoundingClientRect()
      const edge = info.point.x < r.left + 48 ? -1 : info.point.x > r.right - 48 ? 1 : 0
      if (edge) scroller.scrollBy({ left: edge * 12 })
    },
    onDragEnd: () => {
      // Bırakınca gelen tıklama geçsin diye bir sonraki görev
      setTimeout(() => {
        dragged.current = false
      })
    },
    onLayoutMeasure: (box: Box) => reorder.register(value, box),
    onClickCapture: (e: { stopPropagation: () => void; preventDefault: () => void }) => {
      if (!dragged.current) return
      e.stopPropagation()
      e.preventDefault()
    },
  }
}

/* --- Şerit ------------------------------------------------------------------------------------- */

/** Sekmenin anahtarı (seçim, ölçüm): grup ve sekme. */
const tabKey = (group: string, view: string) => `${group}:${view}`

/**
 * Sekme şeridi: gruplar soldan sağa, her grubun bütün sekmeleri görünür (kökün sekmesi başta, sonra
 * child sekmeleri). Birden çok grup varken her grup kendi renginde: altında çizgi, başında nokta,
 * seçili sekmesi çerçeveli (Chrome'daki gibi). Başka grubun sekmesine basınca o grup etkin olur.
 * Seçili sekmenin zemini sekmeden sekmeye (gruplar arasında da) kayar (`layoutId`). Sıralama
 * sürükleyerek: child sekmesi grubun içinde, kökün sekmesi bütün grubu taşır; sağ tık menüsünde de
 * (klavyede menü tuşu).
 */
function TabStrip({
  groups,
  active,
  split,
  onSelect,
  onClose,
  onCloseGroup,
  onPair,
  onMoveTab,
  onMoveGroup,
}: {
  groups: Group[]
  active: string
  split: boolean
  /** Sekmeyi seçer (başka gruptaysa o gruba geçer). */
  onSelect: (group: string, view: string, id: string) => void
  onClose: (group: string, id: string) => void
  onCloseGroup: (group: string) => void
  /** Yan yana aç (yalnızca etkin grupta). */
  onPair?: (view: string) => void
  onMoveTab: (group: string, view: string, to: number) => void
  onMoveGroup: (group: string, to: number) => void
}) {
  const { motion: level } = useLook()
  const group = groups.find((g) => g.key === active)!
  const selected = tabKey(group.key, group.tabs.active)
  const [row, setRow] = useState<HTMLElement | null>(null)
  const scroller = row?.parentElement ?? null
  const groupOrder = useReorder(
    groups.map((g) => g.key),
    onMoveGroup,
  )
  // Renkler grupları birbirinden ayırır: yalnızca birden çok grup varken
  const colored = groups.length > 1

  // Seçili sekme şeridin dışında kaldıysa görünür yere kayar
  useEffect(() => {
    row?.querySelector(`[data-tab="${CSS.escape(selected)}"]`)?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
      behavior: level === 'full' ? 'smooth' : 'auto',
    })
  }, [row, selected, level])

  // Klavye (WAI-ARIA sekmeleri): oklar / Home / End bütün sekmeler arasında gezer, Delete formu
  // kapatır (kökün sekmesinde grubu)
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
      const { form, group: g, root } = tabs[i]?.dataset ?? {}
      if (!form || !g) return
      e.preventDefault()
      // Kapanınca odak şeritte kalsın: soldaki sekmeye
      tabs[i - 1]?.focus()
      if (root) onCloseGroup(g)
      else onClose(g, form)
    }
  }

  return (
    // Kayan şerit Motion öğesi (`layoutScroll`): şerit kaydırılmışken de düzen animasyonları ve
    // sürüklemede yer değiştirme eşikleri kaymaz
    <MotionFlex
      layoutScroll
      className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none]"
    >
      <Flex
        ref={setRow}
        role="tablist"
        aria-label="Açık formlar"
        aria-multiselectable={split || undefined}
        onKeyDown={onKeyDown}
        // Soldan içeri girme payı = kabın köşesi (`rounded-3xl`, yarıçap × 3) + sekme kavisi
        // (yarıçap × 2): seçili sekmenin kavisi kabın düz üst kenarına oturur
        className="relative flex min-w-max items-end gap-3 ps-[calc(var(--radius)*5)] pe-8 pt-1"
      >
        {groups.map((g, i) => (
          <GroupBlock
            key={g.key}
            group={g}
            colored={colored}
            index={i}
            count={groups.length}
            selected={selected}
            split={split}
            order={groupOrder}
            scroller={scroller}
            onSelect={(view, id) => onSelect(g.key, view, id)}
            onClose={(id) => onClose(g.key, id)}
            onCloseGroup={() => onCloseGroup(g.key)}
            onPair={g.key === active ? onPair : undefined}
            onMoveTab={(view, to) => onMoveTab(g.key, view, to)}
            onMoveGroup={(to) => onMoveGroup(g.key, to)}
          />
        ))}
      </Flex>
    </MotionFlex>
  )
}

/** Grubun rengi `--g` (tema dosyası `--group-1` … `--group-6`); sabit metin, Tailwind görsün. */
const GROUP_TONE = [
  '[--g:var(--group-1)]',
  '[--g:var(--group-2)]',
  '[--g:var(--group-3)]',
  '[--g:var(--group-4)]',
  '[--g:var(--group-5)]',
  '[--g:var(--group-6)]',
] as const

/**
 * Renkli grubun çizgisi (Chrome'daki gibi): grubun sekmelerinin altında grubun renginde 2px çizgi;
 * seçili sekmede çizgi sekmenin yanlarından ve üstünden dolaşır (`TAB_RING`).
 */
const GROUP_LINE =
  'pointer-events-none absolute inset-x-1 bottom-0 block h-[2px] rounded-full bg-(--g)'

/**
 * Renkli grubun seçili sekmesi: yanlarda ve üstte grubun çizgisi; alt köşelerdeki içbükey kavisler
 * boyunca çizgi grubun alt çizgisine kesintisiz iner (Başlangıç'taki seçili kategori sekmesiyle aynı
 * yol, StartPage.tsx): kavis halkasının orta çizgisi sekmenin köşesiyle aynı yarıçapta, bir ucu
 * sekmenin kenar çizgisinin, öbür ucu grubun alt çizgisinin üstünde. Halkanın dışı kabın rengi
 * (sekme kaba kaynaşır), içi saydam. Temelde radial-gradient; `corner-shape` destekleyen tarayıcıda
 * köşesi içbükey kutu, halka gölgeyle. Sabit metin (Tailwind görsün).
 */
const TAB_RING =
  "border-x-2 border-t-2 border-(--g) [--flare:calc(var(--radius)*2)] [--fa:calc(var(--flare)_-_1px)] [--fb:calc(var(--flare)_+_1px)] before:absolute before:bottom-0 before:start-[calc(1px_-_var(--flare)_-_2px)] before:size-(--fb) before:bg-[radial-gradient(circle_at_0_0,transparent_var(--fa),var(--g)_var(--fa),var(--g)_var(--fb),var(--tab-bg)_var(--fb))] before:content-[''] supports-[corner-shape:scoop]:before:bg-none supports-[corner-shape:scoop]:before:bg-(--tab-bg) supports-[corner-shape:scoop]:before:rounded-tl-[100%] supports-[corner-shape:scoop]:before:[corner-shape:var(--corner-concave,scoop)] supports-[corner-shape:scoop]:before:shadow-[0_0_0_2px_var(--g)] supports-[corner-shape:scoop]:before:[clip-path:inset(0)] after:absolute after:bottom-0 after:end-[calc(1px_-_var(--flare)_-_2px)] after:size-(--fb) after:bg-[radial-gradient(circle_at_100%_0,transparent_var(--fa),var(--g)_var(--fa),var(--g)_var(--fb),var(--tab-bg)_var(--fb))] after:content-[''] supports-[corner-shape:scoop]:after:bg-none supports-[corner-shape:scoop]:after:bg-(--tab-bg) supports-[corner-shape:scoop]:after:rounded-tr-[100%] supports-[corner-shape:scoop]:after:[corner-shape:var(--corner-concave,scoop)] supports-[corner-shape:scoop]:after:shadow-[0_0_0_2px_var(--g)] supports-[corner-shape:scoop]:after:[clip-path:inset(0)]"

/** Grubun noktası: açık grubun başında ve daralmış grupta grubun rengi. */
const GROUP_DOT = 'relative z-2 block size-2 shrink-0 self-center rounded-full bg-(--g)'

/**
 * Bir grup: kökün sekmesi ve child sekmeleri. Renkliyken (birden çok grup) altında grubun renginde
 * çizgi, başında grubun noktası. Blok bütün olarak sürüklenir (gruplar arası sıralama): kökün
 * sekmesinden tutulur; genişliği sekmeler açılıp kapanınca Motion'la değişir.
 */
function GroupBlock({
  group,
  colored,
  index,
  count,
  selected,
  split,
  order,
  scroller,
  onSelect,
  onClose,
  onCloseGroup,
  onPair,
  onMoveTab,
  onMoveGroup,
}: {
  group: Group
  /** Birden çok grup var: grup kendi renginde. */
  colored: boolean
  index: number
  count: number
  /** Seçili sekmenin anahtarı (etkin grubun seçili sekmesi). */
  selected: string
  split: boolean
  order: Reorderer
  scroller: HTMLElement | null
  onSelect: (view: string, id: string) => void
  onClose: (id: string) => void
  onCloseGroup: () => void
  onPair?: (view: string) => void
  onMoveTab: (view: string, to: number) => void
  onMoveGroup: (to: number) => void
}) {
  const spring = useTransition()
  const controls = useDragControls()
  const drag = useDragItem(group.key, order, scroller)
  const [rootView, ...rest] = group.tabs.views
  const tabOrder = useReorder(
    group.tabs.views.map((v) => v.key),
    onMoveTab,
    1,
  )
  const rootSelected = selected === tabKey(group.key, rootView!.key)
  const close = (id: string) => (id === group.tabs.rootId ? onCloseGroup() : onClose(id))
  const groupMenu: MenuItem[] = [
    {
      key: 'group-left',
      label: 'Grubu sola taşı',
      disabled: index === 0,
      onClick: () => onMoveGroup(index - 1),
    },
    {
      key: 'group-right',
      label: 'Grubu sağa taşı',
      disabled: index === count - 1,
      onClick: () => onMoveGroup(index + 1),
    },
    { type: 'divider' },
    { key: 'group-close', label: 'Grubu kapat', onClick: onCloseGroup },
  ]

  return (
    <MotionFlex
      {...drag}
      // Kökün sekmesinden tutulur
      dragListener={false}
      dragControls={controls}
      layout
      transition={{ layout: spring }}
      role="presentation"
      className={cn(
        'relative flex h-10 shrink-0 items-stretch gap-1',
        GROUP_TONE[group.color % GROUP_TONE.length],
      )}
    >
      {/* Grubun alt çizgisi */}
      {colored && <Flex aria-hidden className={GROUP_LINE} />}
      <TabMenu items={groupMenu}>
        <MotionFlex
          layout="position"
          transition={{ layout: spring }}
          data-tab={tabKey(group.key, rootView!.key)}
          onPointerDown={(e) => controls.start(e)}
          className={cn('group/tab relative flex h-10 shrink-0 items-stretch', rootSelected && 'z-2')}
        >
          {/* Grubun başında grubun rengi: seçili sekme çizgiyi örtse de grup belli olur */}
          {colored && <Flex aria-hidden className={cn(GROUP_DOT, 'ms-3.5 -me-1.5')} />}
          <TabBody
            group={group.key}
            view={rootView!}
            selected={rootSelected}
            split={split}
            tinted={colored}
            rootId={group.tabs.rootId}
            onSelect={(id) => onSelect(rootView!.key, id)}
            onClose={close}
          />
        </MotionFlex>
      </TabMenu>
      {/* Yeni sekme kökün yanından açılır, kapanan solarak çıkar */}
      <AnimatePresence initial={false} mode="popLayout">
        {rest.map((v, i) => (
          <ChildTab
            key={tabKey(group.key, v.key)}
            group={group.key}
            view={v}
            index={i + 1}
            count={group.tabs.views.length}
            selected={selected === tabKey(group.key, v.key)}
            split={split}
            tinted={colored}
            rootId={group.tabs.rootId}
            order={tabOrder}
            scroller={scroller}
            onSelect={(id) => onSelect(v.key, id)}
            onClose={close}
            onPair={onPair && v.ids.length === 1 ? () => onPair(v.key) : undefined}
            onMove={(to) => onMoveTab(v.key, to)}
          />
        ))}
      </AnimatePresence>
    </MotionFlex>
  )
}

/** Grubun child sekmesi: grubun içinde sürüklenir; sağ tık menüsünde de taşınır. */
function ChildTab({
  group,
  view,
  index,
  count,
  selected,
  split,
  tinted,
  rootId,
  order,
  scroller,
  onSelect,
  onClose,
  onPair,
  onMove,
}: {
  group: string
  view: View
  index: number
  count: number
  selected: boolean
  split: boolean
  tinted: boolean
  rootId: string
  order: Reorderer
  scroller: HTMLElement | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onPair?: () => void
  onMove: (to: number) => void
}) {
  const spring = useTransition()
  const fadeT = useTransition({ duration: 0.2, ease: EASE })
  const exitT = useTransition({ duration: 0.16, ease: [0.4, 0, 1, 1] })
  const drag = useDragItem(view.key, order, scroller)
  const menu: MenuItem[] = [
    { key: 'left', label: 'Sola taşı', disabled: index <= 1, onClick: () => onMove(index - 1) },
    {
      key: 'right',
      label: 'Sağa taşı',
      disabled: index >= count - 1,
      onClick: () => onMove(index + 1),
    },
    { type: 'divider' },
    { key: 'close', label: 'Kapat', onClick: () => onClose(view.focus) },
  ]
  return (
    <TabMenu items={menu}>
      <MotionFlex
        {...drag}
        layout="position"
        data-tab={tabKey(group, view.key)}
        // Yeni sekme soldan kısa kayarak belirir; kapanan solarak çıkar
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -16, pointerEvents: 'none', transition: exitT }}
        transition={{ layout: spring, x: spring, opacity: fadeT }}
        // Seçili sekme seçim zemininin üstünde; kayarken de yazısı örtülmez
        className={cn('group/tab relative flex h-10 shrink-0 items-stretch', selected && 'z-2')}
      >
        <TabBody
          group={group}
          view={view}
          selected={selected}
          split={split}
          tinted={tinted}
          rootId={rootId}
          onSelect={onSelect}
          onClose={onClose}
          onPair={selected ? undefined : onPair}
        />
      </MotionFlex>
    </TabMenu>
  )
}

/** Sağ tık menüsü (klavyede menü tuşu / Shift+F10 da açar): sekmeyi ya da grubu taşır, kapatır. */
function TabMenu({ items, children }: { items: MenuItem[]; children: ReactNode }) {
  return (
    <Dropdown trigger={['contextMenu']} menu={{ items }}>
      {children}
    </Dropdown>
  )
}

/**
 * Sekmenin içi: gri zemin (renkli grupta yok; seçilince solar, seçim zemini altından gelir; renkli
 * grupta seçim zemini grubun renginde çerçeveli) ve formlar. Yan yana
 * sekmede iki form, aralarında ince çizgi. Kapatma her formun yanında; kökünki bütün grubu kapatır.
 * Seçili sekmenin zemini (`layoutId`) sekmenin içinde: sekmeyle birlikte sürüklenir, sekmeden sekmeye
 * kayar.
 */
function TabBody({
  group,
  view,
  selected,
  split,
  tinted = false,
  rootId,
  onSelect,
  onClose,
  onPair,
}: {
  group: string
  view: View
  selected: boolean
  split: boolean
  /** Renkli grupta: gri zemin yok (üzerine gelince grubun açık tonu), seçiliyse grubun çerçevesi. */
  tinted?: boolean
  rootId: string
  onSelect: (id: string) => void
  onClose: (id: string) => void
  /** Yan yana aç: bu sekmeyi seçili sekmenin yanına alır. */
  onPair?: () => void
}) {
  const spring = useTransition()
  const paired = view.ids.length > 1
  return (
    <>
      <Flex
        aria-hidden
        className={cn(
          'absolute inset-0 block rounded-t-2xl transition-[opacity,background-color] duration-[calc(200ms*var(--motion-time,1))]',
          selected
            ? 'opacity-0'
            : tinted
              ? 'group-hover/tab:bg-[color-mix(in_oklab,var(--g)_12%,transparent)]'
              : 'bg-surface-tertiary group-hover/tab:bg-[color-mix(in_oklab,var(--foreground)_6%,var(--surface-tertiary))]',
        )}
      />
      {selected && (
        <MotionFlex
          aria-hidden
          layoutId="form-tab-selection"
          transition={spring}
          className={cn(
            'pointer-events-none absolute inset-0 z-1 block rounded-t-2xl bg-(--tab-bg)',
            tinted ? TAB_RING : FLARES,
          )}
        />
      )}
      <Flex className="relative z-2 flex min-w-0 items-center pe-1.5">
        {view.ids.map((id, i) => (
          <Fragment key={id}>
            {i > 0 && <Flex aria-hidden className="mx-0.5 block h-4 w-px shrink-0 bg-border" />}
            <TabLabel
              id={id}
              group={group}
              pane={paneKey(group, id)}
              lead={i === 0}
              paired={paired}
              current={selected && (!paired || id === view.focus)}
              // Bölünmüşken iki form birden görünür
              visible={selected && (split || !paired || id === view.focus)}
              root={id === rootId}
              onSelect={() => onSelect(id)}
              onClose={() => onClose(id)}
            />
          </Fragment>
        ))}
        {onPair && (
          <Tip label="Yan yana aç">
            <Button
              type="text"
              size="small"
              aria-label={`Yan yana aç: ${formMeta(view.ids[0]!).name}`}
              icon={<Columns2 {...IC} size={14} />}
              onClick={onPair}
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
  group,
  pane,
  lead,
  paired,
  current,
  visible,
  root,
  onSelect,
  onClose,
}: {
  id: string
  /** Formun grubu (Delete kapatırken). */
  group: string
  /** Formun bölmesinin anahtarı (`aria-controls`). */
  pane: string
  /** Sekmenin ilk formu (solda daha geniş boşluk). */
  lead: boolean
  paired: boolean
  /** Odaktaki form: birincil renkte, klavyeyle sekmeye gelince odak buraya. */
  current: boolean
  /** Formu ekranda (`aria-selected`). */
  visible: boolean
  /** Grubun kökü: kapatma bütün grubu kapatır. */
  root: boolean
  onSelect: () => void
  onClose: () => void
}) {
  const { name, icon: Icon, no } = formMeta(id)
  return (
    <Flex className="flex h-full min-w-0 items-center">
      {/* Aynı adlı formlar (ör. iki teklif) ipucundaki talep numarasıyla ayrılır */}
      <Tip label={no ? `${name} · ${no}` : name}>
        <Button
          type="text"
          role="tab"
          id={`form-tab-${pane}`}
          data-form={id}
          data-group={group}
          data-root={root || undefined}
          aria-selected={visible}
          aria-controls={`form-pane-${pane}`}
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
            paired ? 'max-w-[15rem]' : 'max-w-[22rem]',
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
      <Tip label={root ? 'Grubu kapat' : 'Kapat'}>
        <Button
          type="text"
          size="small"
          aria-label={`${root ? 'Grubu kapat' : 'Kapat'}: ${name}`}
          icon={<X {...IC} size={14} />}
          // Kapatma sekmeyi sürüklemeye başlatmasın
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          className="-ms-1 rounded-full text-muted hover:text-foreground!"
        />
      </Tip>
    </Flex>
  )
}

/**
 * Bir formun bölmesi. Her zaman aynı yerde takılı; `slot` -1 gizli, 0 sol (ya da tek), 1 sağ.
 * Sekmeler açıkken bir yaprak (şeffaf, köşeli) ve kendi kaydırma kabıdır: gizlenince tarayıcı
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
        // yapışkan öğeler kabuğun değil yaprağın tepesine yapışsın. Zemini şeffaf: kartların
        // arasında sayfa kabının rengi görünür
        sheet && 'min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain [--chrome-top:0px]',
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
