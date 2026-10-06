import {
  Fragment,
  memo,
  startTransition,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react'
import { ArrowLeftRight, Columns2, FileText, Ungroup } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Button, Flex, type MenuProps } from 'antd'
import { findRequest, panelSizeOf, processOf, type PanelSize } from '@/synergy/shared/workflowData'
import { activeView, type TabsAction, type View } from '@/synergy/shared/formTabs'
import { appOfRoot } from '@/synergy/shared/appForms'
import {
  activeGroup,
  type Group,
  type GroupsAction,
  type GroupsState,
} from '@/synergy/shared/formGroups'
import { useMediaQuery, useRadiusPx } from '@/synergy/shared/hooks'
import { cn, IC, MotionFlex, Tip } from '@/synergy/ant/ui'
import { OpenChildContext, type OpenChild } from '@/synergy/tabs/context'
import { useTabMotion } from '@/synergy/tabs/motion'
import { Divider, Pane, type Entered, type PaneSlot } from '@/synergy/tabs/Panes'
import { GROUP_TONE, SHEET, SHEET_RING, TAB_BG } from '@/synergy/tabs/shape'
import { Tab, TabButton, TabClose, TabGroup, TabStrip } from '@/synergy/tabs/TabStrip'

/* -------------------------------------------------------------------------------------------------
 * Form sekmeleri (parent → child → child child)
 *
 * Formdaki bir düğmeyle açılan child talep, detay sayfasının aynısıyla açılır. Nerede açılacağını
 * child formun panel boyutu belirler (mantık `shared/formTabs.ts`): 1 / 2 sekmeyi böler, 3 yeni
 * sekmede açılır; bölünmüş iki form tek sekmede yan yana durur. Dar ekranda yer yok: 1024px
 * altında hepsi, 1200px altında 2'ler de 3 gibi açılır (orijinaldeki gibi).
 *
 * Form grupları (açık istek üzerine; mantık `shared/formGroups.ts`): her açılan talep ve menüden
 * açılan uygulama formu (`shared/appForms.ts`) kendi grubu, grubun child'ları onun sekmeleri; birden çok grup varken her grup kendi renginde (Chrome gibi
 * nokta, alt çizgi, seçili sekmenin çerçevesi). Sekmeler ve gruplar sürükleyerek ya da sağ tık
 * menüsüyle sıralanır.
 *
 * Şerit ve bölmeler ortak sekme sisteminden (`tabs/`): şerit `TabStrip` (Chrome'un şeridi), bölmeler
 * `Pane` (kalıcı, kimlik başına bir kez çizilir; sekme geçişi yalnızca görünürlüğü değiştirir).
 * Her formun önünde süreç ikonu; yan yana sekmede iki formun ikonu ve adı, odaktaki birincil renkte.
 * Ada basınca o bölme odaklanır (dar ekranda yalnızca o görünür). Şeridin ucunda yer değiştirme (⇄)
 * ve sekmelere ayırma; tek formlu sekme "Yan yana aç" ile seçili sekmenin yanına alınır. Klavye: oklar
 * sekmeler arasında gezer, Delete formu kapatır (kökün sekmesinde grubu).
 *
 * Çizim yalıtımı: formlar bölme başına bir kez kurulur (`renderRoot` / `renderTab` sabit işlev
 * olmalı), bağlamlar sekme geçişinde değişmez, şerit ve bölmeler `memo`; bir sekme geçişinde yalnızca
 * iki sekme ve iki bölme yeniden çizilir, formların hiçbiri.
 * ------------------------------------------------------------------------------------------------- */

type MenuItem = NonNullable<MenuProps['items']>[number]

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
/** Sekmenin anahtarı (`data-tab`): grup ve sekme. */
const tabKey = (group: string, view: string) => `${group}:${view}`

/** Sekmedeki ad ve ikon, ipucundaki talep numarası (menü uygulamasının formunda uygulamanınkiler). */
function formMeta(id: string) {
  const app = appOfRoot(id)
  if (app) return { name: app.caption, icon: app.icon ?? FileText, no: undefined }
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

/** Şeridin ve bölmelerin işlemleri (sabit; son durumu okur). */
interface Actions {
  select: (group: string, view: string, id: string) => void
  close: (group: string, id: string) => void
  closeGroup: (group: string) => void
  moveTab: (group: string, view: string, to: number) => void
  moveGroup: (group: string, to: number) => void
  pair: (group: string, view: string) => void
  /** Delete tuşu (şerit): odaktaki sekmenin formu. */
  remove: (tab: HTMLElement) => void
}

/**
 * Anahtar başına bir kez kurulan öğeler: liste değişse de (form açılıp kapanınca) var olan
 * anahtarların öğesi aynı nesne kalır, React onları yeniden çizmez. `make` sabit olmalı.
 */
function useKeyed<T extends { key: string }>(items: T[], make: (item: T) => ReactNode) {
  const [cache] = useState(() => new Map<string, ReactNode>())
  const sig = items.map((i) => i.key).join('\n')
  return useMemo(() => {
    const out = new Map<string, ReactNode>()
    for (const item of items) out.set(item.key, cache.get(item.key) ?? make(item))
    cache.clear()
    out.forEach((node, key) => cache.set(key, node))
    return out
    // Yalnızca anahtarlar değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig])
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
  /** Grubun kök formunun görünümü. Sabit bir işlev olmalı (form grup ve kök başına bir kez kurulur). */
  renderRoot: (group: Group) => ReactNode
  /** Form gelene kadar (`LOAD_MS`) bölmede duran iskelet (sabit öğe). */
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
  const motion = useTabMotion()
  const radiusPx = useRadiusPx(SHEET_RADIUS)
  const radius = radiusPx === undefined ? undefined : Math.round(radiusPx)
  // Renkler grupları birbirinden ayırır: yalnızca birden çok grup varken
  const colored = st.groups.length > 1

  // Olay işleyicileri son durumu okur (şerit ve bölmeler sabit işlevler alır, sekme geçişinde
  // yeniden çizilmesin)
  const latest = useRef({ group, view, hasTabs, wide, roomy, onCloseGroup })
  useLayoutEffect(() => {
    latest.current = { group, view, hasTabs, wide, roomy, onCloseGroup }
  })
  const strip = useRef<HTMLElement | null>(null)
  const actions = useMemo<Actions>(() => {
    const tabs = (key: string, action: TabsAction) => dispatch({ type: 'tabs', key, action })
    /** Kapanınca odak kaybolduysa (kapanan sekmenin düğmesi) seçili sekmeye döner. */
    const keepFocus = () =>
      requestAnimationFrame(() => {
        const a = document.activeElement
        if (a && a !== document.body && a.isConnected) return
        strip.current?.querySelector<HTMLElement>('[role="tab"][tabindex="0"]')?.focus()
      })
    const base: Omit<Actions, 'remove'> = {
      // Etkin grupta sekme seçilir; başka grupta o gruba geçilip form gösterilir. Geçiş
      // (`startTransition`): React çizimi parçalara böler, tıklama görevi kısa kalır, araya kare
      // girer; art arda tıklamada yarım kalan çizim bırakılır
      select: (g, v, id) =>
        startTransition(() =>
          g === latest.current.group.key
            ? tabs(g, { type: 'focus', view: v, id })
            : dispatch({ type: 'reveal', key: g, form: id }),
        ),
      // Kapatma da geçiş: şeridin genişlik donması (`TabStrip`) aynı geçişte, aynı çizimde
      close: (g, id) => {
        startTransition(() => tabs(g, { type: 'close', id }))
        keepFocus()
      },
      closeGroup: (g) => {
        startTransition(() => latest.current.onCloseGroup(g))
        keepFocus()
      },
      moveTab: (g, v, to) => dispatch({ type: 'moveTab', key: g, view: v, to }),
      moveGroup: (g, to) => dispatch({ type: 'moveGroup', key: g, to }),
      pair: (g, v) => tabs(g, { type: 'pair', view: v }),
    }
    // Delete tuşu: odaktaki formun sekmesi kapanır (kökünki grubu kapatır)
    return {
      ...base,
      remove: (el: HTMLElement) => {
        const { form, group: g, root: isRoot } = el.dataset
        if (!form || !g) return
        if (isRoot) base.closeGroup(g)
        else base.close(g, form)
      },
    }
  }, [dispatch])

  /** Formdan child açma (grubun içinde): yeri child'ın panel boyutundan (dar ekranda hep yeni sekme). */
  const [openers] = useState(() => new Map<string, OpenChild>())
  const openerOf = useCallback(
    (key: string) => {
      let open = openers.get(key)
      if (!open) {
        open = (from, id) => {
          const { hasTabs: tabbed, wide: w, roomy: r } = latest.current
          // İlk child açılırken sayfa başa döner ki sekme alanı ekranın kalanına otursun
          if (!tabbed) window.scrollTo({ top: 0 })
          const asked = panelSizeOf(id)
          const size: PanelSize = !w || (asked === 2 && !r) ? 3 : asked
          // Geçiş: yeni bölme ve sekme parça parça çizilir, tıklama görevi kısa kalır
          startTransition(() =>
            dispatch({ type: 'tabs', key, action: { type: 'open', from, id, size } }),
          )
        }
        openers.set(key, open)
      }
      return open
    },
    [openers, dispatch],
  )

  // Formlar bölme başına bir kez kurulur (kök formlar grup ve kök başına): sekme seçmek, bölmeye
  // tıklamak ya da bölücüyü sürüklemek formları yeniden çizmez. Bütün grupların formları takılı
  // kalır (girilen alanlar kaybolmasın); yalnızca etkin grubunkiler görünür
  const panes = st.groups.flatMap((g) =>
    [g.tabs.rootId, ...g.tabs.entries.map((e) => e.id)].map((id) => {
      // Kutusu sekmesinden: tek formlu sekmede kabın tamamı, yan yana sekmede sol / sağ
      const v = g.tabs.views.find((x) => x.ids.includes(id))
      const pairedView = wide && v?.ids.length === 2
      const slot: PaneSlot = pairedView ? (v.ids[0] === id ? 'left' : 'right') : 'single'
      return {
        key: paneKey(g.key, id),
        group: g,
        id,
        root: id === g.tabs.rootId,
        slot,
        // Sekmesinin payı (gizliyken de: görününce kutusu değişmez)
        share: (v?.ratio ?? 50) / 100,
      }
    }),
  )
  const nodes = useKeyed(panes, (p) => (
    <OpenChildContext value={openerOf(p.group.key)}>
      {p.root ? renderRoot(p.group) : renderTab(p.id, () => actions.close(p.group.key, p.id))}
    </OpenChildContext>
  ))

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

  // Düzen değişimi çizimde yakalanır (görünen formlar, pay). Hem önce hem şimdi görünen bölme bu
  // adımda ölçülür (Motion eski yerinden götürür); yeni görünen yönden kayarak gelir. Gizlenen
  // bölmenin adımı değişmez. Yön: grup değiştiyse grupların sırası, kök değiştiyse (Geri / İleri)
  // listedeki sıra, sekme değiştiyse sekmelerin, bölme değiştiyse bölmelerin sırası.
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

  // Bölmeye tıklanınca / odaklanılınca (yan yanayken) o form sekmede vurgulanır
  const focusPane = useCallback(
    (key: string) => {
      const { group: g, view: v, wide: w } = latest.current
      if (!w || v.ids.length < 2) return
      dispatch({ type: 'tabs', key: g.key, action: { type: 'focus', view: v.key, id: formOf(key) } })
    },
    [dispatch],
  )
  const tabs = (action: TabsAction) => dispatch({ type: 'tabs', key: group.key, action })

  // Şeridin yapısı: sıra, yan yana sekmeler, renk (değişince sekmeler ölçülüp kayar)
  const stripKey =
    st.groups
      .map((g) => `${g.key}:${g.tabs.views.map((v) => `${v.key}=${v.ids.join('+')}`).join(',')}`)
      .join('|') + (colored ? '|c' : '')
  // Grup başına: kendi yapısı ve önceki grupların yapısı (yeri ancak bunlar değişince kayar)
  const groupKeys = st.groups.map((_, i) =>
    st.groups
      .slice(0, i + 1)
      .map((x) => `${x.key}:${x.tabs.views.map((v) => `${v.key}=${v.ids.join('+')}`).join(',')}`)
      .join('|'),
  )
  const groupOrderKey = st.groups.map((g) => g.key).join('|')
  const groupOrder = useMemo(() => groupOrderKey.split('|'), [groupOrderKey])
  // Seçili sekme tek formluysa diğer tek formlu sekmeler onun yanına alınabilir
  const canPair = wide && view.ids.length === 1

  // Şeridin sabit parçaları (şerit her çizimde yeniden kurulmasın)
  const viewKey = view.key
  const groupKey = group.key
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
                onClick={() =>
                  dispatch({ type: 'tabs', key: groupKey, action: { type: 'swap', view: viewKey } })
                }
                className="text-muted hover:text-foreground!"
              />
            </Tip>
            <Tip label="Ayrı sekmelere ayır">
              <Button
                type="text"
                size="small"
                aria-label="Ayrı sekmelere ayır"
                icon={<Ungroup {...IC} size={15} />}
                onClick={() =>
                  dispatch({ type: 'tabs', key: groupKey, action: { type: 'unpair', view: viewKey } })
                }
                className="text-muted hover:text-foreground!"
              />
            </Tip>
          </MotionFlex>
        )}
      </AnimatePresence>
    ),
    [split, motion, dispatch, groupKey, viewKey],
  )

  return (
    // Yapı sabit: sekmeler gelip gidince ana form yeniden takılmaz
    <Flex
      ref={outer}
      style={hasTabs ? { height: `calc(100dvh - ${top}px - 1.5rem)` } : undefined}
      className={cn('relative flex flex-col', TAB_BG)}
    >
      {/* Şerit: sekmeler kabın içinden kısa yükselir */}
      <AnimatePresence initial={false} mode="popLayout">
        {hasTabs && (
          <MotionFlex
            key="strip"
            ref={strip}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: motion.stripOut }}
            transition={motion.stripIn}
            className="flex shrink-0"
          >
            <TabStrip
              label="Açık formlar"
              selected={tabKey(group.key, view.key)}
              sheet={colored ? cn(SHEET_RING, GROUP_TONE[group.color % GROUP_TONE.length]) : SHEET}
              layoutKey={stripKey}
              // Soldan içeri girme payı = kabın köşesi (`rounded-3xl`) + sekme kavisi: seçili
              // sekmenin kavisi kabın düz üst kenarına oturur
              inset="ps-[calc(var(--radius)*3+var(--tab-r))] pe-8"
              onDelete={actions.remove}
              className="flex-1"
              end={splitActions}
            >
              {st.groups.map((g, i) => (
                <FormGroup
                  key={g.key}
                  group={g}
                  layoutKey={`${groupKeys[i]}|${colored ? 'c' : ''}`}
                  active={g === group}
                  index={i}
                  count={st.groups.length}
                  colored={colored}
                  split={split}
                  canPair={canPair}
                  groupOrder={groupOrder}
                  actions={actions}
                />
              ))}
            </TabStrip>
          </MotionFlex>
        )}
      </AnimatePresence>

      {/*
       * Formların kabı: sekmeler açıkken ekranın kalanını doldurur, formlar içinde kayar. Tüm
       * formlar burada takılı. Sekme alanında kenardan giren / çıkan form kabın kenarında kırpılır
       * (`overflow-clip`: kaydırma kabı değil). Tek formda (sayfa kipi) kırpılmaz, kenardaki
       * kartların konturu / gölgesi kesilmez; yalnızca son child çıkarken. Bölücü sürüklenirken
       * (`data-resizing`, React çizmez) imleç her yerde bölücünün, formlar imleci almaz.
       */}
      <Flex
        className={cn(
          'group/panes relative flex min-w-0',
          (hasTabs || leaving) && 'overflow-clip',
          hasTabs ? 'min-h-0 flex-1 rounded-3xl bg-(--tab-bg)' : 'p-0',
          'data-[resizing]:cursor-col-resize data-[resizing]:select-none [&[data-resizing]_[role=tabpanel]]:pointer-events-none',
        )}
      >
        <AnimatePresence initial={false} onExitComplete={() => setLeaving(false)}>
          {panes.map(({ key, slot, share }) => {
            const visible = shown.includes(key)
            return (
              <Pane
                key={key}
                id={key}
                visible={visible}
                slot={slot}
                share={share}
                sheet={hasTabs}
                moved={step.moved[key] ?? 0}
                entered={step.entered[key]}
                // Yön yalnızca bu adımda gelen bölmeye (diğerleri yeniden çizilmesin)
                dir={step.entered[key]?.n === step.n ? step.dir : 1}
                paired={split && visible}
                slide={wide}
                radius={radius}
                motion={motion}
                placeholder={placeholder}
                onFocus={focusPane}
              >
                {nodes.get(key)}
              </Pane>
            )
          })}
        </AnimatePresence>
        {split && (
          <Divider
            ratio={view.ratio}
            panes={[shown[0]!, shown[1]!]}
            base={view.base}
            motion={motion}
            onRatio={(value) => tabs({ type: 'ratio', value })}
            onNudge={(delta) => tabs({ type: 'nudge', delta })}
          />
        )}
      </Flex>
    </Flex>
  )
}

/* --- Şerit ------------------------------------------------------------------------------------- */

/**
 * Bir grup: kökün sekmesi ve child sekmeleri. Renkliyken (birden çok grup) grubun noktası ve alt
 * çizgisi. Blok bütün olarak sürüklenir (kökün sekmesinden tutulur).
 */
const FormGroup = memo(function FormGroup({
  group: g,
  layoutKey,
  active,
  index,
  count,
  colored,
  split,
  canPair,
  groupOrder,
  actions,
}: {
  group: Group
  /** Grubun düzen imzası (kendi ve önceki grupların yapısı). */
  layoutKey: string
  /** Etkin grup (seçili sekmesi onda). */
  active: boolean
  index: number
  count: number
  colored: boolean
  split: boolean
  canPair: boolean
  groupOrder: string[]
  actions: Actions
}) {
  const order = g.tabs.views.map((v) => tabKey(g.key, v.key)).join('|')
  const siblings = useMemo(() => order.split('|'), [order])
  const onMove = useCallback((to: number) => actions.moveGroup(g.key, to), [actions, g.key])
  return (
    <TabGroup
      id={g.key}
      tone={GROUP_TONE[g.color % GROUP_TONE.length]}
      toned={colored}
      layoutKey={layoutKey}
      onMove={onMove}
      siblings={groupOrder}
    >
      {g.tabs.views.map((v, i) => (
        <ViewTab
          key={tabKey(g.key, v.key)}
          groupKey={g.key}
          view={v}
          index={i}
          count={g.tabs.views.length}
          rootId={g.tabs.rootId}
          selected={active && g.tabs.active === v.key}
          split={split}
          toned={colored}
          pairable={active && canPair && v.ids.length === 1 && g.tabs.active !== v.key}
          siblings={siblings}
          groupIndex={index}
          groupCount={count}
          actions={actions}
        />
      ))}
    </TabGroup>
  )
})

/**
 * Bir sekme: tek form ya da yan yana iki form (aralarında ince çizgi). Kapatma her formun yanında;
 * kökünki bütün grubu kapatır. Kökün sekmesi grubun tutamağı (sürükleyince grup gelir, sağ tık
 * menüsü grubu taşır / kapatır); child sekmesi grubun içinde sürüklenir.
 */
const ViewTab = memo(function ViewTab({
  groupKey,
  view,
  index,
  count,
  rootId,
  selected,
  split,
  toned,
  pairable,
  siblings,
  groupIndex,
  groupCount,
  actions,
}: {
  groupKey: string
  view: View
  index: number
  count: number
  rootId: string
  selected: boolean
  split: boolean
  toned: boolean
  /** "Yan yana aç": bu sekme seçili (tek formlu) sekmenin yanına alınabilir. */
  pairable: boolean
  siblings: string[]
  groupIndex: number
  groupCount: number
  actions: Actions
}) {
  const isRoot = view.ids.includes(rootId)
  const paired = view.ids.length > 1
  const close = (id: string) =>
    id === rootId ? actions.closeGroup(groupKey) : actions.close(groupKey, id)
  const menu: MenuItem[] = isRoot
    ? [
        {
          key: 'group-left',
          label: 'Grubu sola taşı',
          disabled: groupIndex === 0,
          onClick: () => actions.moveGroup(groupKey, groupIndex - 1),
        },
        {
          key: 'group-right',
          label: 'Grubu sağa taşı',
          disabled: groupIndex === groupCount - 1,
          onClick: () => actions.moveGroup(groupKey, groupIndex + 1),
        },
        { type: 'divider' },
        { key: 'group-close', label: 'Grubu kapat', onClick: () => actions.closeGroup(groupKey) },
      ]
    : [
        {
          key: 'left',
          label: 'Sola taşı',
          disabled: index <= 1,
          onClick: () => actions.moveTab(groupKey, view.key, index - 1),
        },
        {
          key: 'right',
          label: 'Sağa taşı',
          disabled: index >= count - 1,
          onClick: () => actions.moveTab(groupKey, view.key, index + 1),
        },
        { type: 'divider' },
        { key: 'close', label: 'Kapat', onClick: () => close(view.focus) },
      ]
  return (
    <Tab
      id={tabKey(groupKey, view.key)}
      selected={selected}
      handle={isRoot}
      menu={menu}
      onMove={isRoot ? undefined : (to) => actions.moveTab(groupKey, view.key, to)}
      siblings={siblings}
      min={1}
    >
      {view.ids.map((id, i) => (
        <Fragment key={id}>
          {i > 0 && (
            <Flex
              aria-hidden
              className="relative z-2 mx-0.5 block h-4 w-px shrink-0 self-center bg-border"
            />
          )}
          <FormLabel
            id={id}
            groupKey={groupKey}
            lead={i === 0}
            paired={paired}
            current={selected && (!paired || id === view.focus)}
            // Bölünmüşken iki form birden görünür
            visible={selected && (split || !paired || id === view.focus)}
            root={id === rootId}
            toned={toned}
            onSelect={() => actions.select(groupKey, view.key, id)}
            onClose={() => close(id)}
          />
        </Fragment>
      ))}
      {pairable && (
        <Tip label="Yan yana aç">
          <Button
            type="text"
            size="small"
            aria-label={`Yan yana aç: ${formMeta(view.ids[0]!).name}`}
            icon={<Columns2 {...IC} size={14} />}
            onClick={() => actions.pair(groupKey, view.key)}
            className="relative z-2 me-1 shrink-0 self-center rounded-full text-muted opacity-0 transition-opacity group-hover/tab:opacity-100 hover:text-foreground! focus-visible:opacity-100"
          />
        </Tip>
      )}
    </Tab>
  )
})

/** Sekmedeki form: süreç ikonu ve adı (ipucunda talep numarası), yanında kapatma. */
function FormLabel({
  id,
  groupKey,
  lead,
  paired,
  current,
  visible,
  root,
  toned,
  onSelect,
  onClose,
}: {
  id: string
  groupKey: string
  /** Sekmenin ilk formu (solda daha geniş boşluk). */
  lead: boolean
  paired: boolean
  /** Odaktaki form: vurgulu, klavyeyle sekmeye gelince odak buraya. */
  current: boolean
  /** Formu ekranda (`aria-selected`). */
  visible: boolean
  /** Grubun kökü: kapatma bütün grubu kapatır. */
  root: boolean
  toned: boolean
  onSelect: () => void
  onClose: () => void
}) {
  const { name, icon, no } = formMeta(id)
  const pane = paneKey(groupKey, id)
  return (
    <>
      {/* Aynı adlı formlar (ör. iki teklif) ipucundaki talep numarasıyla ayrılır */}
      <Tip label={no ? `${name} · ${no}` : name}>
        <TabButton
          role="tab"
          id={`form-tab-${pane}`}
          data-form={id}
          data-group={groupKey}
          data-root={root || undefined}
          aria-selected={visible}
          aria-controls={`form-pane-${pane}`}
          tabIndex={current ? 0 : -1}
          onClick={onSelect}
          label={name}
          icon={icon}
          current={current}
          toned={toned}
          // Doğal genişliğin tavanı: tek formda 22rem, yan yana sekmede form başına 15rem
          className={cn(lead && 'ps-4', paired ? 'max-w-[15rem]' : 'max-w-[22rem]')}
        />
      </Tip>
      <TabClose
        label={`${root ? 'Grubu kapat' : 'Kapat'}: ${name}`}
        tip={root ? 'Grubu kapat' : 'Kapat'}
        removes={root ? 'group' : paired ? false : 'tab'}
        onClose={onClose}
      />
    </>
  )
}
