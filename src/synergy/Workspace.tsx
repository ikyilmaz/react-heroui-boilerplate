import {
  Fragment,
  memo,
  startTransition,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import {
  UNSAFE_NavigationContext,
  createPath,
  useLocation,
  useNavigate,
  useNavigationType,
  type Location,
  type To,
} from 'react-router'
import { ArrowLeftRight, Columns2, SquareArrowOutUpRight, Ungroup } from 'lucide-react'
import { AnimatePresence, LayoutGroup } from 'framer-motion'
import { Button, Dropdown, Flex, type MenuProps } from 'antd'
import { panelSizeOf, type PanelSize } from '@/synergy/shared/workflowData'
import {
  START,
  activeScreen,
  activeTab,
  identityOf,
  listUnder,
  normalizePath,
  screenOf,
  tabOf,
  type Group,
  type Screen,
  type Tab as TabState,
  type Where,
  type WorkspaceAction,
  type WorkspaceState,
} from '@/synergy/shared/workspace'
import { useMediaQuery, useRadiusPx } from '@/synergy/shared/hooks'
import { cn, IC, MotionFlex, Tip } from '@/synergy/ant/ui'
import { useNotify } from '@/synergy/ant/hr'
import { FormSkeleton } from '@/synergy/DetailTiles'
import {
  OpenChildContext,
  ScreenContext,
  type OpenChild,
  type ScreenApi,
} from '@/synergy/tabs/context'
import { useTabMotion } from '@/synergy/tabs/motion'
import { Divider, Pane, type Entered, type PaneSlot } from '@/synergy/tabs/Panes'
import { GROUP_TONE, SHEET, SHEET_RING, TAB_BG } from '@/synergy/tabs/shape'
import { Tab, TabButton, TabClose, TabGroup, TabStrip } from '@/synergy/tabs/TabStrip'
import { encodeWorkspace } from '@/synergy/shared/workspaceUrl'
import { ScreenRoutes, isFormPath, isValidPath, screenMeta } from '@/synergy/screens'

/* -------------------------------------------------------------------------------------------------
 * Çalışma alanı: uygulama genelindeki sekmeler (durum `shared/workspace.ts`, adres
 * `shared/workspaceUrl.ts`; kabuk tutar). Şerit hep görünür; Başlangıç sabit ilk sekme (yalnız o
 * açıkken de), her ekran gibi kendi bölmesinde kayar.
 *
 * Her ekran (sekme ya da yan yana sekmenin bir yarısı) bir bölme (`Pane`) ve kendi adresiyle
 * sayfanın rotalarını çizer (`screens.tsx`). Ekrana kendi gezgini verilir (react-router'ın
 * `NavigationContext`'i): sayfadaki `Link` / `useNavigate` / `Navigate` kendi ekranında gezer
 * (Başlangıç'ta gezinme yeni sekme açar; reducer). Formdaki düğmeyle child (`OpenChildContext`),
 * kapatma ve açma (`ScreenContext`) da ekran başına sabit işlevler.
 *
 * Şerit ortak sekme sisteminden (`tabs/`): Başlangıç ikonla sabit, gruplar renkli (nokta, alt
 * çizgi, seçili sekmenin çerçevesi; kullanıcının grubu adıyla), grupsuz sekmeler tek başına bir
 * sıra. Sıralar sürüklenir (grubun ilk sekmesinden tutulur), grubun öbür sekmeleri grubun içinde.
 * Yan yana sekmede iki ekranın adı, odaktaki birincil renkte; şeridin ucunda yer değiştirme ve
 * ayırma; tek ekranlı sekme "Yan yana aç" ile seçili sekmenin yanına alınır. Klavye: oklar sekmeler
 * arasında gezer, Delete sekmeyi (yan yana sekmede o ekranı) kapatır.
 *
 * Açılış (ekrandaki bağlantılar ve `data-open-path`'li satırlar / kartlar; `ScreenEvents`): sağ tıkta
 * menü (Aç, Yeni sekmede aç, Yan yana aç; Başlangıç'ta yok, oradan her şey yeni sekmede açılır),
 * Ctrl / Cmd ya da orta tıkta yeni sekmede, geçmeden. Bu ikisi listede de yeni sekme açar (aynı liste
 * açıksa bile); talep ve uygulama yine tek.
 *
 * Çizim yalıtımı: ekranlar bölme başına bir kez kurulur, yalnızca kendi durumları değişince yeniden
 * çizilir; bağlamlar sekme geçişinde değişmez, şerit ve bölmeler `memo`.
 * ------------------------------------------------------------------------------------------------- */

/** Çalışma alanı işlemi (kabuk verir; sınırda uyarır). `push`: ekranın içinde gezinme (tarayıcı geçmişine kayıt). */
export type Act = (a: WorkspaceAction, opts?: { push?: boolean }) => void

type MenuItem = NonNullable<MenuProps['items']>[number]

/** Yaprağın köşesi (`rounded-2xl`). */
const SHEET_RADIUS = 'calc(var(--radius) * 2)'

/** Form gelene kadar bölmede duran iskelet (sabit öğe: bölmeler yeniden çizilmesin). */
const SKELETON = <FormSkeleton />

/** Başlangıç'ın sabit sekmesi: yalnızca ikon. */
const PINNED = 'flex-none w-11 min-w-11 max-w-11'

/** Şeridin bir sırası: Başlangıç, bir grup ya da grupsuz bir sekme. */
interface Unit {
  key: string
  group?: Group
  tabs: TabState[]
}

function unitsOf(tabs: TabState[], groups: Group[]) {
  const out: Unit[] = []
  for (const t of tabs) {
    const last = out.at(-1)
    if (t.group && last?.group?.key === t.group) last.tabs.push(t)
    else
      out.push({
        key: t.group ?? t.key,
        group: t.group ? groups.find((g) => g.key === t.group) : undefined,
        tabs: [t],
      })
  }
  return out
}

/** Düzen adımı: görünen ekranlar ve pay her değişince bir artar. */
interface Step {
  layout: string
  tab: string
  index: number
  shown: string[]
  /** İlk görünen ekranın altındaki liste (form kapanınca liste geriden gelir). */
  under: string | undefined
  n: number
  /** Değişimin yönü: 1 ileri (sağdan gelir), -1 geri. */
  dir: 1 | -1
  /** Bölmenin son ölçüldüğü adım (Motion bu değişince eski yerinden götürür). */
  moved: Record<string, number>
  /** Bölmenin son göründüğü adım ve nasıl geldiği. */
  entered: Record<string, Entered>
}

/** Şeridin işlemleri (sabit; son durumu okur). */
interface Actions {
  select: (tab: string, screen: string) => void
  closeTab: (tab: string) => void
  /** Yan yana sekmenin bir ekranı (altındaki listeyle). */
  closeSide: (screen: string) => void
  closeGroup: (group: string) => void
  moveUnit: (key: string, to: number) => void
  moveTab: (tab: string, to: number, group: string) => void
  pair: (tab: string) => void
  unpair: (tab: string) => void
  copyLink: (path: string) => void
  /** Delete tuşu (şerit): odaktaki sekmenin ekranı. */
  remove: (el: HTMLElement) => void
}

/** Ekranın sabit araçları: işlemleri, gezgini ve child açma. */
interface Tools {
  api: ScreenApi
  nav: React.ContextType<typeof UNSAFE_NavigationContext>
  openChild: OpenChild
}

/** Adresler kaçırma farkıyla (tarayıcı bazı karakterleri kendisi kaçırır) aynı mı. */
function sameUrl(a: string, b: string) {
  if (a === b) return true
  try {
    return decodeURI(a) === decodeURI(b)
  } catch {
    return false
  }
}

/**
 * Adres ile çalışma alanı (kabuk kullanır). Durum her değişince adres yazılır (`encodeWorkspace`):
 * ekranın içinde gezinme (`push`) tarayıcı geçmişine eklenir, gerisi (sekme geçişi, açma, kapama,
 * düzen) yerinde değişir. Adres dışarıdan değişince durum ona uyar:
 * - tarayıcının geri / ileri tuşu: seçili ekranın geçmişinde bir adım (listenin üstündeki form
 *   kapanır ya da yeniden açılır); geçmişte değilse o yer açılır (açıksa ona geçilir);
 * - kabuktaki bağlantı (raf dışı: başlat kutusu, tüm uygulamalar, arama): o yer açılır (açıksa ona
 *   geçilir). Geçersiz adres açılmaz, adres duruma döner.
 */
export function useWorkspaceUrl(state: WorkspaceState, act: Act, pushNext: RefObject<boolean>) {
  const location = useLocation()
  const navType = useNavigationType()
  const navigate = useNavigate()
  const here = location.pathname + location.search
  // Durumun karşılığı olan son adres (yazılan ya da kabul edilen)
  const accepted = useRef(here)
  const latest = useRef(state)
  useLayoutEffect(() => {
    latest.current = state
  })
  const [tick, setTick] = useState(0)
  const popped = useRef(false)

  // Adres dışarıdan değişti
  useLayoutEffect(() => {
    if (sameUrl(here, accepted.current)) return
    accepted.current = here
    const s = latest.current
    const path = normalizePath(location.pathname)
    const state = (location.state as unknown) ?? undefined
    if (isValidPath(path)) {
      const x = activeScreen(s)
      const under = x.under ? screenOf(s, x.under) : undefined
      if (navType !== 'POP') act({ type: 'open', path, state, where: 'tab' })
      else {
        popped.current = true
        if (x.back.at(-1)?.path === path || (!x.back.length && under?.path === path))
          act({ type: 'back', screen: x.key })
        else if (x.forward.at(-1)?.path === path) act({ type: 'forward', screen: x.key })
        else if (listUnder(path) === x.path) act({ type: 'go', screen: x.key, path, state })
        else act({ type: 'open', path, state, where: 'tab' })
      }
    }
    // Durum değişmese de adres ona döner (aşağıda)
    setTick((t) => t + 1)
    // Yalnızca adres değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [here])

  // Durum → adres
  useEffect(() => {
    const url = encodeWorkspace(state)
    const push = pushNext.current && !popped.current
    pushNext.current = false
    popped.current = false
    if (sameUrl(url, accepted.current)) return
    accepted.current = url
    void navigate(url, { replace: !push, state: activeScreen(state).state ?? null })
  }, [state, tick, navigate, pushNext])
}

/** Ekranın sayfası: kendi adresiyle (yalnızca ekranın durumu değişince çizilir). */
const ScreenView = memo(function ScreenView({ screen }: { screen: Screen }) {
  const location = useMemo<Partial<Location>>(
    () => ({
      pathname: screen.path,
      search: '',
      hash: '',
      state: screen.state ?? null,
      key: screen.key,
    }),
    [screen.path, screen.state, screen.key],
  )
  return <ScreenRoutes location={location} />
})

export function Workspace({ state: st, act }: { state: WorkspaceState; act: Act }) {
  const tab = activeTab(st)
  // Yan yana yalnızca geniş ekranda; daralınca bölünmüş sekmenin odaktaki ekranı tek başına kalır
  const wide = useMediaQuery('(min-width: 1024px)')
  const roomy = useMediaQuery('(min-width: 1200px)')
  const split = wide && tab.screens.length === 2
  const shown = split ? tab.screens : [tab.focus]
  const motion = useTabMotion()
  const radiusPx = useRadiusPx(SHEET_RADIUS)
  const radius = radiusPx === undefined ? undefined : Math.round(radiusPx)
  const notify = useNotify()

  // Olay işleyicileri son durumu okur (şerit, bölmeler ve ekranlar sabit işlevler alır)
  const latest = useRef({ st, wide, roomy, notify })
  useLayoutEffect(() => {
    latest.current = { st, wide, roomy, notify }
  })
  const strip = useRef<HTMLElement | null>(null)

  const actions = useMemo<Actions>(() => {
    // Geçiş (`startTransition`): React çizimi parçalara böler, tıklama görevi kısa kalır
    const run = (a: WorkspaceAction) => startTransition(() => act(a))
    /** Kapanınca odak kaybolduysa (kapanan sekmenin düğmesi) seçili sekmeye döner. */
    const keepFocus = () =>
      requestAnimationFrame(() => {
        const a = document.activeElement
        if (a && a !== document.body && a.isConnected) return
        strip.current?.querySelector<HTMLElement>('[role="tab"][tabindex="0"]')?.focus()
      })
    const closeTab = (t: string) => {
      run({ type: 'closeTab', tab: t })
      keepFocus()
    }
    const closeSide = (screen: string) => {
      // Listenin üstündeki form altındaki listeyle birlikte kapanır
      const under = screenOf(latest.current.st, screen)?.under
      run({ type: 'close', screen: under ?? screen })
      keepFocus()
    }
    return {
      select: (t, screen) => run({ type: 'select', tab: t, screen }),
      closeTab,
      closeSide,
      closeGroup: (group) => {
        run({ type: 'closeGroup', group })
        keepFocus()
      },
      moveUnit: (key, to) => act({ type: 'moveUnit', key, to }),
      moveTab: (t, to, group) => act({ type: 'moveTab', tab: t, to, group }),
      pair: (t) => run({ type: 'pair', tab: t, with: latest.current.st.active }),
      unpair: (t) => run({ type: 'unpair', tab: t }),
      copyLink: (path) => {
        const url = new URL(path, window.location.origin).href
        void navigator.clipboard?.writeText(url).then(
          () => latest.current.notify.success('Bağlantı kopyalandı', url),
          () => latest.current.notify.warning('Bağlantı kopyalanamadı', url),
        )
      },
      remove: (el) => {
        const { tabKey, screen, side } = el.dataset
        if (!tabKey || tabKey === START) return
        if (side && screen) closeSide(screen)
        else closeTab(tabKey)
      },
    }
  }, [act])

  /** Ekranın araçları: ekran başına bir kez kurulur (bağlam değerleri hiç değişmez). */
  const [tools] = useState(() => new Map<string, Tools>())
  const toolsOf = useCallback(
    (key: string, child: boolean) => {
      let t = tools.get(key)
      if (t) return t
      const go = (to: To, state: unknown, replace: boolean) => {
        const path = typeof to === 'string' ? to : (to.pathname ?? '')
        startTransition(() =>
          act({ type: 'go', screen: key, path, state, replace }, { push: !replace }),
        )
      }
      t = {
        api: {
          key,
          child,
          close: () => startTransition(() => act({ type: 'close', screen: key })),
          open: (path, where, state, opts) =>
            startTransition(() =>
              act(
                { type: 'open', path, where, state, from: key, ...opts },
                { push: where === 'here' },
              ),
            ),
          popOut: () => {
            const x = screenOf(latest.current.st, key)
            const id = x && /^talep:(.+)$/.exec(identityOf(x.path).key)?.[1]
            if (id)
              startTransition(() => act({ type: 'popOut', screen: key, path: `/talepler/${id}` }))
          },
        },
        nav: {
          basename: '/',
          static: false,
          useTransitions: undefined,
          future: {},
          navigator: {
            createHref: (to: To) => (typeof to === 'string' ? to : createPath(to)),
            go: (delta: number) =>
              startTransition(() => act({ type: delta < 0 ? 'back' : 'forward', screen: key })),
            push: (to: To, state?: unknown) => go(to, state, false),
            replace: (to: To, state?: unknown) => go(to, state, true),
          },
        },
        // Child'ın yeri panel boyutundan; dar ekranda yer yok: 1024px altında hepsi, 1200px
        // altında 2'ler de yeni sekmede (orijinaldeki gibi)
        openChild: (_from, id) => {
          const { wide: w, roomy: r } = latest.current
          const asked = panelSizeOf(id)
          const size: PanelSize = !w || (asked === 2 && !r) ? 3 : asked
          startTransition(() => act({ type: 'child', from: key, path: `/talepler/${id}`, size }))
        },
      }
      tools.set(key, t)
      return t
    },
    [tools, act],
  )

  // Açılış menüsü (sağ tık): tek, imlecin yerinde; açılınca çalışma alanı yeniden çizilmez
  const menu = useRef<MenuHandle | null>(null)

  // Ekranlar bölme başına bir kez kurulur; yalnızca durumu değişen ekranın öğesi yenilenir (bölme
  // ve diğer ekranlar yeniden çizilmez)
  const [cache] = useState(() => new Map<string, { screen: Screen; node: ReactNode }>())
  const nodes = useMemo(() => {
    const out = new Map<string, { screen: Screen; node: ReactNode }>()
    for (const s of st.screens) {
      const hit = cache.get(s.key)
      if (hit?.screen === s) {
        out.set(s.key, hit)
        continue
      }
      const t = toolsOf(s.key, !!s.parent)
      out.set(s.key, {
        screen: s,
        node: (
          <ScreenContext value={t.api}>
            <UNSAFE_NavigationContext value={t.nav}>
              <OpenChildContext value={t.openChild}>
                {/* Paylaşılan geçişler (`layoutId`) yalnızca kendi ekranında */}
                <LayoutGroup id={s.key}>
                  <ScreenEvents api={t.api} menu={menu}>
                    <ScreenView screen={s} />
                  </ScreenEvents>
                </LayoutGroup>
              </OpenChildContext>
            </UNSAFE_NavigationContext>
          </ScreenContext>
        ),
      })
    }
    cache.clear()
    out.forEach((v, k) => cache.set(k, v))
    for (const k of tools.keys()) if (!out.has(k)) tools.delete(k)
    return out
  }, [st.screens, cache, tools, toolsOf, menu])

  // Bölmeler: her ekranın kutusu sekmesinden (altta duran liste üstündeki formun yerinde; gizliyken
  // de kutusu değişmez)
  const panes = st.screens.map((s) => {
    const t = tabOf(st, s.key)
    const self = t?.screens.includes(s.key) ? s.key : st.screens.find((x) => x.under === s.key)?.key
    const slot: PaneSlot =
      wide && t && t.screens.length === 2 ? (t.screens[0] === self ? 'left' : 'right') : 'single'
    return { key: s.key, slot, share: (t?.ratio ?? 50) / 100, form: isFormPath(s.path) }
  })

  // Alan ekranın kalanını doldurur: yüksekliği, alanın sayfadaki yerinden ölçülür
  const outer = useRef<HTMLElement | null>(null)
  const [top, setTop] = useState(0)
  useLayoutEffect(() => {
    const measure = () => setTop((outer.current?.getBoundingClientRect().top ?? 0) + window.scrollY)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Düzen değişimi çizimde yakalanır (görünen ekranlar, pay). Hem önce hem şimdi görünen bölme bu
  // adımda ölçülür (Motion eski yerinden götürür); yeni görünen yönden kayarak gelir. Yön: sekme
  // değiştiyse sekmelerin sırası; aynı sekmede listenin üstündeki form kapanınca geriden
  const layout = `${tab.key}|${shown.join(',')}|${split ? tab.ratio : ''}`
  const index = st.tabs.indexOf(tab)
  const under = screenOf(st, shown[0]!)?.under
  const [step, setStep] = useState<Step>(() => ({
    layout,
    tab: tab.key,
    index,
    shown,
    under,
    n: 0,
    dir: 1,
    moved: {},
    entered: {},
  }))
  if (step.layout !== layout) {
    const n = step.n + 1
    const moved = { ...step.moved }
    const entered = { ...step.entered }
    const sameTab = step.tab === tab.key
    for (const key of shown) {
      if (step.shown.includes(key)) moved[key] = n
      else entered[key] = { n, push: split && sameTab && shown.indexOf(key) === 1 }
    }
    const before = step.shown[0]!
    const now = shown[0]!
    const forward = !sameTab
      ? index >= step.index
      : step.under === now
        ? false
        : !(tab.screens.includes(before) && tab.screens.indexOf(now) < tab.screens.indexOf(before))
    setStep({
      layout,
      tab: tab.key,
      index,
      shown,
      under,
      n,
      dir: forward ? 1 : -1,
      moved,
      entered,
    })
  }

  // Bölmeye tıklanınca / odaklanılınca (yan yanayken) o ekran sekmede vurgulanır
  const focusPane = useCallback(
    (key: string) => {
      const { st: s, wide: w } = latest.current
      const t = activeTab(s)
      if (!w || t.screens.length < 2 || t.focus === key) return
      act({ type: 'select', tab: t.key, screen: key })
    },
    [act],
  )

  // Şeridin sıraları ve yapısı (değişince sekmeler ölçülüp kayar)
  const units = useMemo(() => unitsOf(st.tabs, st.groups), [st.tabs, st.groups])
  const sig = (u: Unit) =>
    `${u.key}:${u.group ? `${u.group.name}.${u.group.color}` : ''}:${u.tabs.map((t) => `${t.key}=${t.screens.join('+')}`).join(',')}`
  const stripKey = units.map(sig).join('|')
  // Sıra başına: kendi yapısı ve öncekilerin (yeri ancak bunlar değişince kayar)
  const unitDeps = units.map((_, i) =>
    units
      .slice(0, i + 1)
      .map(sig)
      .join('|'),
  )
  const orderKey = units
    .slice(1)
    .map((u) => u.key)
    .join('|')
  const unitOrder = useMemo(() => (orderKey ? orderKey.split('|') : []), [orderKey])
  // Ekranların adresleri (sekmenin adı ve ikonu bundan): yalnızca kendi sırasınınki
  const pathOf = (k: string) => screenOf(st, k)?.path ?? ''
  const unitPaths = units.map((u) => u.tabs.map((t) => t.screens.map(pathOf).join('\t')).join('\n'))
  const activeGroup = tab.group ? st.groups.find((g) => g.key === tab.group) : undefined
  // Seçili sekme tek ekranlıysa diğer tek ekranlı sekmeler onun yanına alınabilir
  const canPair = wide && tab.screens.length === 1 && tab.key !== START

  // Şeridin sabit parçaları (şerit her çizimde yeniden kurulmasın)
  const tabKey = tab.key
  const splitActions = useMemo(
    () => (
      <AnimatePresence initial={false}>
        {split && (
          <MotionFlex
            key="split-actions"
            role="group"
            aria-label="Yan yana"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 8 }}
            transition={motion.fade}
            className="flex h-10 shrink-0 items-center gap-0.5 self-end ps-1 pe-3"
          >
            <Tip label="Yer değiştir">
              <Button
                type="text"
                size="small"
                aria-label="Bölmelerin yerini değiştir"
                icon={<ArrowLeftRight {...IC} size={15} />}
                onClick={() => act({ type: 'swap', tab: tabKey })}
                className="text-muted hover:text-foreground!"
              />
            </Tip>
            <Tip label="Ayrı sekmelere ayır">
              <Button
                type="text"
                size="small"
                aria-label="Ayrı sekmelere ayır"
                icon={<Ungroup {...IC} size={15} />}
                onClick={() => actions.unpair(tabKey)}
                className="text-muted hover:text-foreground!"
              />
            </Tip>
          </MotionFlex>
        )}
      </AnimatePresence>
    ),
    [split, motion, act, actions, tabKey],
  )

  return (
    // Yapı sabit: sekmeler gelip gidince Başlangıç yeniden takılmaz
    <Flex
      ref={outer}
      // Ekranın kalanı: alt pay (1.5rem) ve gezinme alttaysa çubuğun yeri (`--chrome-bottom`)
      style={{ height: `calc(100dvh - ${top}px - 1.5rem - var(--chrome-bottom, 0px))` }}
      className={cn('relative flex flex-col', TAB_BG)}
    >
      {/* Şerit: hep görünür (yalnız Başlangıç açıkken de) */}
      <Flex ref={strip} className="flex shrink-0">
        <TabStrip
          label="Açık sekmeler"
          selected={tab.key}
          sheet={
            activeGroup ? cn(SHEET_RING, GROUP_TONE[activeGroup.color % GROUP_TONE.length]) : SHEET
          }
          layoutKey={stripKey}
          // Soldan içeri girme payı = kabın köşesi (`rounded-3xl`) + sekme kavisi: seçili
          // sekmenin kavisi kabın düz üst kenarına oturur
          inset="ps-[calc(var(--radius)*3+var(--tab-r))] pe-8"
          onDelete={actions.remove}
          className="flex-1"
          end={splitActions}
        >
          {units.map((u, i) => (
            <UnitView
              key={u.key}
              unit={u}
              paths={unitPaths[i]!}
              layoutKey={unitDeps[i]!}
              position={i - 1}
              count={units.length - 1}
              first={units.slice(0, i).reduce((n, x) => n + x.tabs.length, 0)}
              selected={u.tabs.some((t) => t.key === tab.key) ? tab.key : undefined}
              split={split}
              canPair={canPair}
              unitOrder={unitOrder}
              actions={actions}
            />
          ))}
        </TabStrip>
      </Flex>

      {/*
       * Ekranların kabı: ekranın kalanını doldurur, ekranlar içinde kayar. Tüm ekranlar burada
       * takılı. Kenardan giren / çıkan ekran kabın kenarında kırpılır (`overflow-clip`: kaydırma kabı
       * değil). Bölücü sürüklenirken (`data-resizing`, React çizmez) imleç her yerde bölücünün,
       * ekranlar imleci almaz.
       */}
      <Flex
        className={cn(
          'group/panes relative flex min-h-0 min-w-0 flex-1 overflow-clip rounded-3xl bg-(--tab-bg)',
          'data-[resizing]:cursor-col-resize data-[resizing]:select-none [&[data-resizing]_[role=tabpanel]]:pointer-events-none',
        )}
      >
        <AnimatePresence initial={false}>
          {panes.map(({ key, slot, share, form }) => {
            const visible = shown.includes(key)
            return (
              <Pane
                key={key}
                id={key}
                visible={visible}
                slot={slot}
                share={share}
                moved={step.moved[key] ?? 0}
                entered={step.entered[key]}
                // Yön yalnızca bu adımda gelen bölmeye (diğerleri yeniden çizilmesin)
                dir={step.entered[key]?.n === step.n ? step.dir : 1}
                paired={split && visible}
                slide={wide}
                radius={radius}
                motion={motion}
                placeholder={form ? SKELETON : undefined}
                onFocus={focusPane}
              >
                {nodes.get(key)?.node}
              </Pane>
            )
          })}
        </AnimatePresence>
        {split && (
          <Divider
            ratio={tab.ratio}
            panes={[shown[0]!, shown[1]!]}
            base={tab.base}
            motion={motion}
            onRatio={(value) => act({ type: 'ratio', value })}
            onNudge={(delta) => act({ type: 'nudge', delta })}
          />
        )}
      </Flex>
      <OpenMenu ref={menu} wide={wide} />
    </Flex>
  )
}

/* --- Açılış: sağ tık menüsü, Ctrl / Cmd / orta tık --------------------------------------------- */

/** Açılacak hedef: sayfanın bağlantısı ya da `data-open-path`'li öğe (satır, kart). */
interface OpenTarget {
  el: HTMLElement
  path: string
}

interface MenuHandle {
  show: (t: OpenTarget & { x: number; y: number; api: ScreenApi }) => void
}

/**
 * Tıklanan öğenin açılış hedefi. Satırın içindeki denetimler (Olaylar, Sil, düğmeler, alanlar)
 * hedef değil; kartın kendi açma düğmesi (`data-open-click`) kart sayılır. Başka kökene, yeni
 * pencereye ya da indirmeye giden bağlantı hedef değil.
 */
function openTargetOf(node: EventTarget | null): OpenTarget | null {
  if (!(node instanceof Element)) return null
  const control = node.closest<HTMLElement>(
    'button, input, textarea, select, label, [role="button"], [role="combobox"]',
  )
  const row = node.closest<HTMLElement>('[data-open-path]')
  if (row && (!control || !row.contains(control) || control.hasAttribute('data-open-click')))
    return { el: row, path: row.dataset.openPath! }
  const a = node.closest<HTMLAnchorElement>('a[href]')
  if (!a || a.target || a.hasAttribute('download')) return null
  const url = new URL(a.href, window.location.href)
  return url.origin === window.location.origin ? { el: a, path: url.pathname } : null
}

/**
 * Ekrandaki açılışlar (ekran başına; portallardaki açılır pencereler de React ağacından buraya
 * çıkar): Ctrl / Cmd ya da orta tık yeni sekmede, geçmeden açar; sağ tık açılış menüsünü açar
 * (klavyede menü tuşu / Shift+F10 öğenin altında). Kap çizilmez (`contents`).
 */
function ScreenEvents({
  api,
  menu,
  children,
}: {
  api: ScreenApi
  menu: RefObject<MenuHandle | null>
  children: ReactNode
}) {
  const background = (e: ReactMouseEvent) => {
    const t = openTargetOf(e.target)
    if (!t) return
    e.preventDefault()
    e.stopPropagation()
    api.open(t.path, 'tab', undefined, { background: true, force: true })
  }
  return (
    <Flex
      className="contents"
      onClickCapture={(e) => {
        if (e.ctrlKey || e.metaKey) background(e)
      }}
      onAuxClickCapture={(e) => {
        if (e.button === 1) background(e)
      }}
      // Orta tıkta tarayıcının kaydırma imleci çıkmasın
      onMouseDownCapture={(e) => {
        if (e.button === 1 && openTargetOf(e.target)) e.preventDefault()
      }}
      onContextMenuCapture={(e) => {
        // Başlangıç'tan her şey zaten yeni sekmede açılır: tarayıcının kendi menüsü kalır
        if (api.key === START) return
        const t = openTargetOf(e.target)
        if (!t) return
        e.preventDefault()
        const keyboard = e.clientX === 0 && e.clientY === 0
        const box = t.el.getBoundingClientRect()
        menu.current?.show({
          ...t,
          x: keyboard ? box.left + 12 : e.clientX,
          y: keyboard ? box.bottom : e.clientY,
          api,
        })
      }}
    >
      {children}
    </Flex>
  )
}

/**
 * Açılış menüsü (imlecin yerinde): Aç (tıklamanın kendisi), Yeni sekmede aç, Yan yana aç (yalnızca
 * geniş ekranda). Dışarı tıklama ve Esc kapatır.
 */
function OpenMenu({ ref, wide }: { ref: Ref<MenuHandle>; wide: boolean }) {
  const [t, setT] = useState<Parameters<MenuHandle['show']>[0] | null>(null)
  useImperativeHandle(ref, () => ({ show: setT }), [])
  const items: MenuItem[] = [
    { key: 'here', label: 'Aç' },
    { key: 'tab', label: 'Yeni sekmede aç', icon: <SquareArrowOutUpRight {...IC} size={15} /> },
    ...(wide ? [{ key: 'side', label: 'Yan yana aç', icon: <Columns2 {...IC} size={15} /> }] : []),
  ]
  return (
    <Dropdown
      open={!!t}
      onOpenChange={(open) => {
        if (!open) setT(null)
      }}
      trigger={['contextMenu']}
      menu={{
        'aria-label': 'Aç',
        items,
        onClick: ({ key }) => {
          if (!t) return
          setT(null)
          if (key === 'here') (t.el.querySelector<HTMLElement>('[data-open-click]') ?? t.el).click()
          else t.api.open(t.path, key as Where, undefined, { force: true })
        },
      }}
    >
      {/* İmlecin yeri (menü buna göre açılır); `block`: antd'de içi boş `Flex` gizlenir */}
      <Flex
        aria-hidden
        className="pointer-events-none fixed z-50 block size-0"
        style={t ? { left: t.x, top: t.y } : undefined}
      />
    </Dropdown>
  )
}

/* --- Şerit ------------------------------------------------------------------------------------- */

/**
 * Şeridin bir sırası: Başlangıç (sabit, ikonla), bir grup (renkli; adı varsa yazar) ya da grupsuz
 * bir sekme. Sıra bütün olarak sürüklenir (grubun ilk sekmesinden, grupsuz sekmenin kendisinden);
 * grubun öbür sekmeleri grubun içinde.
 */
const UnitView = memo(function UnitView({
  unit,
  paths,
  layoutKey,
  position,
  count,
  first,
  selected,
  split,
  canPair,
  unitOrder,
  actions,
}: {
  unit: Unit
  /** Sekmelerin ekranlarının adresleri (satır başına bir sekme, sekmede bir sekme karakteriyle). */
  paths: string
  /** Sıranın düzen imzası (kendi ve önceki sıraların yapısı). */
  layoutKey: string
  /** Başlangıç hariç sırası. */
  position: number
  count: number
  /** İlk sekmesinin şeritteki sırası. */
  first: number
  /** Seçili sekme bu sıradaysa anahtarı. */
  selected: string | undefined
  split: boolean
  canPair: boolean
  unitOrder: string[]
  actions: Actions
}) {
  const start = unit.key === START
  const g = unit.group
  const order = unit.tabs.map((t) => t.key).join('|')
  const siblings = useMemo(() => order.split('|'), [order])
  const onMove = useCallback((to: number) => actions.moveUnit(unit.key, to), [actions, unit.key])
  const lines = paths.split('\n')
  return (
    <TabGroup
      id={unit.key}
      tone={g ? GROUP_TONE[g.color % GROUP_TONE.length] : undefined}
      toned={!!g}
      label={g?.name || undefined}
      layoutKey={layoutKey}
      onMove={start ? undefined : onMove}
      siblings={start ? undefined : unitOrder}
    >
      {unit.tabs.map((t, i) => {
        const screenPaths = lines[i]!.split('\t')
        const isSelected = t.key === selected
        // Tutamak: grupsuz sekme ve grubun ilk sekmesi (sırayı sürükler)
        const handle = !start && i === 0
        const paired = t.screens.length > 1
        const focusPath = screenPaths[t.screens.indexOf(t.focus)] ?? screenPaths[0]!
        const pairable = canPair && !start && !paired && !isSelected
        const menu: MenuItem[] = []
        if (!start) {
          if (pairable)
            menu.push({ key: 'pair', label: 'Yan yana aç', onClick: () => actions.pair(t.key) })
          if (paired)
            menu.push({
              key: 'unpair',
              label: 'Ayrı sekmelere ayır',
              onClick: () => actions.unpair(t.key),
            })
          if (menu.length) menu.push({ type: 'divider' })
          if (handle && g)
            menu.push(
              {
                key: 'group-left',
                label: 'Grubu sola taşı',
                disabled: position <= 0,
                onClick: () => actions.moveUnit(unit.key, position - 1),
              },
              {
                key: 'group-right',
                label: 'Grubu sağa taşı',
                disabled: position >= count - 1,
                onClick: () => actions.moveUnit(unit.key, position + 1),
              },
            )
          else if (g)
            menu.push(
              {
                key: 'left',
                label: 'Sola taşı',
                disabled: i <= 1,
                onClick: () => actions.moveTab(t.key, first + i - 1, g.key),
              },
              {
                key: 'right',
                label: 'Sağa taşı',
                disabled: i >= unit.tabs.length - 1,
                onClick: () => actions.moveTab(t.key, first + i + 1, g.key),
              },
            )
          else
            menu.push(
              {
                key: 'left',
                label: 'Sola taşı',
                disabled: position <= 0,
                onClick: () => actions.moveUnit(unit.key, position - 1),
              },
              {
                key: 'right',
                label: 'Sağa taşı',
                disabled: position >= count - 1,
                onClick: () => actions.moveUnit(unit.key, position + 1),
              },
            )
          menu.push(
            { type: 'divider' },
            {
              key: 'link',
              label: 'Bağlantıyı kopyala',
              onClick: () => actions.copyLink(focusPath),
            },
            { type: 'divider' },
            { key: 'close', label: 'Kapat', onClick: () => actions.closeTab(t.key) },
          )
          if (handle && g)
            menu.push({
              key: 'group-close',
              label: 'Grubu kapat',
              onClick: () => actions.closeGroup(g.key),
            })
        }
        return (
          <Tab
            key={t.key}
            id={t.key}
            selected={isSelected}
            handle={handle}
            menu={menu.length ? menu : undefined}
            onMove={g && !handle ? (to) => actions.moveTab(t.key, first + to, g.key) : undefined}
            siblings={siblings}
            min={1}
            className={start ? PINNED : undefined}
          >
            {t.screens.map((k, j) => (
              <Fragment key={k}>
                {j > 0 && (
                  <Flex
                    aria-hidden
                    className="relative z-2 mx-0.5 block h-4 w-px shrink-0 self-center bg-border"
                  />
                )}
                <ScreenLabel
                  screen={k}
                  tab={t.key}
                  path={screenPaths[j]!}
                  lead={j === 0}
                  start={start}
                  paired={paired}
                  current={isSelected && (!paired || k === t.focus)}
                  // Bölünmüşken iki ekran birden görünür
                  visible={isSelected && (split || !paired || k === t.focus)}
                  toned={!!g}
                  onSelect={() => actions.select(t.key, k)}
                  onClose={() => (paired ? actions.closeSide(k) : actions.closeTab(t.key))}
                />
              </Fragment>
            ))}
            {pairable && (
              <Tip label="Yan yana aç">
                <Button
                  type="text"
                  size="small"
                  aria-label={`Yan yana aç: ${screenMeta(screenPaths[0]!).name}`}
                  icon={<Columns2 {...IC} size={14} />}
                  onClick={() => actions.pair(t.key)}
                  className="relative z-2 me-1 shrink-0 self-center rounded-full text-muted opacity-0 transition-opacity group-hover/tab:opacity-100 hover:text-foreground! focus-visible:opacity-100"
                />
              </Tip>
            )}
          </Tab>
        )
      })}
    </TabGroup>
  )
})

/** Sekmedeki ekran: ikon ve ad (ipucunda yerin tam yolu), yanında kapatma. Başlangıç yalnızca ikon. */
function ScreenLabel({
  screen,
  tab,
  path,
  lead,
  start,
  paired,
  current,
  visible,
  toned,
  onSelect,
  onClose,
}: {
  screen: string
  tab: string
  path: string
  /** Sekmenin ilk ekranı (solda daha geniş boşluk). */
  lead: boolean
  /** Başlangıç'ın sabit sekmesi. */
  start: boolean
  paired: boolean
  /** Odaktaki ekran: vurgulu, klavyeyle sekmeye gelince odak buraya. */
  current: boolean
  /** Ekranda mı (`aria-selected`). */
  visible: boolean
  toned: boolean
  onSelect: () => void
  onClose: () => void
}) {
  const { name, icon, tip } = screenMeta(path)
  return (
    <>
      <Tip label={tip}>
        <TabButton
          role="tab"
          id={`screen-tab-${screen}`}
          data-tab-key={tab}
          data-screen={screen}
          data-side={paired || undefined}
          aria-selected={visible}
          aria-controls={`screen-pane-${screen}`}
          tabIndex={current ? 0 : -1}
          onClick={onSelect}
          label={name}
          icon={icon}
          current={current}
          toned={toned}
          labelClassName={start ? 'sr-only' : undefined}
          // Doğal genişliğin tavanı: tek ekranda 22rem, yan yana sekmede ekran başına 15rem
          className={cn(
            start ? 'justify-center px-0' : lead && 'ps-4',
            paired ? 'max-w-[15rem]' : 'max-w-[22rem]',
          )}
        />
      </Tip>
      {!start && (
        <TabClose label={`Kapat: ${name}`} removes={paired ? false : 'tab'} onClose={onClose} />
      )}
    </>
  )
}
