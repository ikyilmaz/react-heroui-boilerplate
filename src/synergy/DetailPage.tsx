import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Ref,
} from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { LayoutGroup, motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  History,
  Save,
  Send,
  Trash2,
  X,
} from 'lucide-react'
import {
  Avatar,
  Button,
  Card,
  Flex,
  Popover,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd'
import {
  deleteDraft,
  isRead,
  markDocumentViewed,
  markRead,
  useBoxRequests,
  useReadIds,
  useRequest,
  useRequests,
  useViewedDocuments,
} from '@/synergy/shared/decisions'
import {
  DELETE_CONFIRM,
  VIEWER_LABELS,
  boxProcessCaption,
  columnsFor,
  dateBucket,
  dateBuckets,
  dateOf,
  documentsOf,
  eventsFor,
  findApp,
  findBox,
  findProcess,
  findRequest,
  processCaption,
  propertiesOf,
  type Box,
  type BoxId,
  type DetailNavState,
  type FlowDocument,
  type FlowEvent,
  type Process,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import { useHistoryViewOptions } from '@/synergy/shared/historyView'
import { FLOW_TEXT } from '@/synergy/shared/flowLabels'
import {
  BASE,
  START_CRUMB,
  WF_CRUMB,
  boxLink,
  processLink,
  requestLink,
  useFrame,
} from '@/synergy/paths'
import { CellValue, EmptyNote, GroupLabel, SearchField, useBand } from '@/synergy/ant/parts'
import {
  GRID_CELL,
  GRID_GROUP_ROW,
  GRID_LEAD,
  GRID_ROW,
  GRID_ROW_SELECTED,
  GRID_TABLE,
  GridFooter,
} from '@/synergy/ant/grid'
import { searchText } from '@/synergy/shared/grid'
import { CARD, CARD_RADIUS, cn, IC, MotionFlex, TintIcon, Tip } from '@/synergy/ant/ui'
import { useTransition } from '@/synergy/motion'
import { ConfirmDialog, useFlow } from '@/synergy/flow'
import { useFillHeight, useMediaQuery, useRadiusPx, useScrolled } from '@/synergy/shared/hooks'
import { FormTabs } from '@/synergy/FormTabs'
import { useTabScroller } from '@/synergy/tabs/context'
import {
  MAX_GROUPS,
  activeForm,
  activeGroup,
  canOpen,
  formPath,
  groupOf,
  groupsReducer,
  initGroups,
  type Group,
  type GroupNav,
} from '@/synergy/shared/formGroups'
import { useNotify } from '@/synergy/ant/hr'
import {
  APP_FORM_TEXT,
  appFormOf,
  appIdOf,
  appOfRoot,
  appRoot,
} from '@/synergy/shared/appForms'
import { AppFormBody } from '@/synergy/AppForm'
import { SidePanel, useSidePanel, type SideTab, type SideTarget } from '@/synergy/DetailSide'
import {
  DocumentsList,
  FileBody,
  FormBody,
  FormSkeleton,
  HistoryTimeline,
  HistoryViewMenu,
  PropertiesList,
} from '@/synergy/DetailTiles'

/* -------------------------------------------------------------------------------------------------
 * Form çalışma alanı: talep ayrıntısı (Flow Viewer) ve menü uygulamalarının formları aynı form
 * gruplarında (`/is-akislari/:box/:processId/:requestId` ve `/uygulamalar/:appId` aynı sayfa: biri
 * açıkken öbürüne gidilince sayfa yeniden kurulmaz, yeni grup açılır; açıksa o gruba geçilir).
 *
 * Talep ayrıntısı, antd: vurgu bandı + bento
 *
 * Band: süreç ve talep sahibi, Geri / İleri (aralarında süreç şeridi), başlık, numaralar, durum, olay
 * şeridi. Kaydırınca 64px yapışkan şeride daralır. Bento: solda form (ya da tam tarihçe), sağda yan
 * bilgiler: Dokümanlar kartı ve Özellikler / Tarihçe kartı (DetailSide.tsx; bölme genişliğine göre
 * sütun ya da raf + çekmece, telefonda altta). 640px altında olaylar altta sabit. Karardan sonra
 * tarihçe açılır; taslakta şerit yerine "Sil" var. Form sunucudan gelene kadar iskelet (FormTabs);
 * Geri / İleri ile talep değişince içerik gidilen yönden kayarak gelir.
 * ------------------------------------------------------------------------------------------------- */

export function DetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const notify = useNotify()
  const routeBox = findBox(params.box)
  // Adresin formu: talep ya da menü uygulaması (`app:<uygulama>`)
  const addressRoot = params.requestId ?? (params.appId ? appRoot(params.appId) : '')

  // İlk grubun listesi: listeden gelindiyse onun sırası, yoksa kutudaki aynı süreçten talepler
  // (ızgaranın varsayılanı gibi yeniden eskiye; tarih grupları bölünmesin)
  const siblings = useBoxRequests((routeBox?.id ?? 'bekleyen') as BoxId)
  const [st, dispatch] = useReducer(groupsReducer, undefined, () =>
    initGroups({
      root: addressRoot,
      nav: params.requestId
        ? {
            ids:
              (location.state as DetailNavState | null)?.ids ??
              siblings
                .filter((x) => x.processId === params.processId)
                .sort((a, b) => dateOf(b).getTime() - dateOf(a).getTime())
                .map((x) => x.id),
            box: (routeBox?.id ?? 'bekleyen') as BoxId,
          }
        : null,
    }),
  )
  // Olay işleyicileri ve adres eşlemesi son durumu okur (eski kapanışlar değil)
  const latest = useRef(st)
  useLayoutEffect(() => {
    latest.current = st
  }, [st])

  const group = activeGroup(st)
  const root = group.tabs.rootId
  const rootReq = findRequest(root)
  const rootApp = appOfRoot(root)

  // Adres etkin grubun kökünü izler (geçmişe kayıt eklemeden: gruplar arası geçiş geri tuşunu doldurmasın)
  useEffect(() => {
    if (addressRoot === root) return
    const to = linkOf(root)
    if (!to) return
    navigate(to, {
      replace: true,
      state: rootReq ? ({ ids: group.nav?.ids ?? [] } satisfies DetailNavState) : undefined,
    })
    // Yalnızca kök değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root])

  // Adres dışarıdan başka bir forma değişince (menüden uygulama, tarayıcının geri tuşu) yeni grupta
  // açılır; zaten bir grubun köküyse o gruba geçilir
  useEffect(() => {
    const id = addressRoot
    if (!id) return
    if (!canOpen(latest.current, id)) {
      warnFull()
      const back = linkOf(activeGroup(latest.current).tabs.rootId)
      if (back) navigate(back, { replace: true })
      return
    }
    dispatch({ type: 'open', root: id, nav: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressRoot])

  // Konum çubuğundaki ata form (`?form=`): o formun sekmesi seçilir, adres temizlenir
  const formParam = new URLSearchParams(location.search).get('form')
  useEffect(() => {
    if (!formParam) return
    const owner = groupOf(latest.current, addressRoot)
    if (owner) dispatch({ type: 'reveal', key: owner.key, form: formParam })
    navigate({ pathname: location.pathname }, { replace: true, state: location.state })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formParam])

  const warnFull = () =>
    notify.warning(
      `En çok ${MAX_GROUPS} form grubu açılabilir`,
      'Yenisini açmak için açık gruplardan birini kapatın.',
    )

  /** Talebi yeni grupta açar (zaten açıksa o gruba geçer; sınırdaysa uyarır). */
  const openGroup = (id: string, nav: GroupNav | null) => {
    if (!canOpen(latest.current, id)) return warnFull()
    dispatch({ type: 'open', root: id, nav })
  }

  /** Grubu kapatır; son grupsa sayfadan `leaveTo`ya çıkılır (gruplar sayfayla birlikte biter). */
  const closeGroup = (key: string, leaveTo: string) => {
    if (latest.current.groups.length <= 1) navigate(leaveTo)
    else dispatch({ type: 'close', key })
  }

  // Konum: kutu › süreç › kök form › … › etkin form (açanlar zinciri; atalar o formun sekmesini açar);
  // menü uygulamasının formunda Başlangıç › uygulama (orijinalde menü öğesinin paneli)
  const rootProcess = rootReq && findProcess(rootReq.processId)
  const box = findBox(group.nav?.box ?? rootReq?.box)
  const path = formPath(group, activeForm(group))
  const requestCrumbs =
    rootReq && rootProcess && box
      ? [
          START_CRUMB,
          WF_CRUMB,
          { label: box.title, href: boxLink(box.id), icon: `box:${box.id}` },
          {
            label: processCaption(rootProcess),
            href: processLink(box.id, rootProcess.id),
            icon: `process:${rootProcess.id}`,
          },
          // Formların adı (kodu değil; kod formun başlık kartında ve özelliklerde)
          ...path.map((id, i) => {
            const form = findRequest(id)
            const p = form && findProcess(form.processId)
            return {
              label: p?.form ?? id,
              icon: i === 0 || !p ? 'request' : `process:${p.id}`,
              ...(i < path.length - 1 && {
                href: `${requestLink(rootReq)}?form=${encodeURIComponent(id)}`,
              }),
            }
          }),
        ]
      : []
  useFrame(
    rootApp ? [START_CRUMB, { label: rootApp.caption, icon: `app:${rootApp.id}` }] : requestCrumbs,
    box?.id ?? null,
  )

  // Her grubun kök formu: FormTabs grup ve kök başına bir kez kurar (sabit işlev); olay işleyicileri
  // son durumu okur (`actions`), kurulan form sekme geçişlerinde yeniden çizilmez
  const actions = useRef({ openGroup, closeGroup })
  useLayoutEffect(() => {
    actions.current = { openGroup, closeGroup }
  })
  const renderRoot = useCallback((g: Group) => {
    const appId = appIdOf(g.tabs.rootId)
    // Menü uygulamasının formu: son grupsa kapanınca Başlangıç'a dönülür
    if (appId !== undefined)
      return <AppViewer appId={appId} onClose={() => actions.current.closeGroup(g.key, BASE)} />
    return (
      <RootViewer
        group={g}
        onReplace={(id) => dispatch({ type: 'replace', key: g.key, root: id })}
        onOpen={(id) => actions.current.openGroup(id, g.nav)}
        onClose={(leaveTo) => actions.current.closeGroup(g.key, leaveTo)}
      />
    )
  }, [])

  return (
    <Flex className="relative flex flex-col">
      <FormTabs
        state={st}
        dispatch={dispatch}
        renderRoot={renderRoot}
        renderTab={renderChild}
        placeholder={SKELETON}
        onCloseGroup={(key) => {
          const g = latest.current.groups.find((x) => x.key === key)
          const r = g && findRequest(g.tabs.rootId)
          closeGroup(
            key,
            r
              ? processLink(r.box, r.processId)
              : g && appIdOf(g.tabs.rootId) !== undefined
                ? BASE
                : boxLink('bekleyen'),
          )
        }}
      />
    </Flex>
  )
}

/** Grubun kökünün adresi: talebin ayrıntısı ya da menü uygulaması. */
function linkOf(root: string) {
  const app = appOfRoot(root)
  if (app) return app.href
  const r = findRequest(root)
  return r && requestLink(r)
}

/**
 * Grubun kök formu: Geri / İleri grubun kökünü değiştirir, Süreçler izinden seçilen talep yeni
 * grupta açılır, "Kapat" grubu kapatır. Kök bulunamaz ya da silinirse (taslak) grup kapanır.
 */
function RootViewer({
  group,
  onReplace,
  onOpen,
  onClose,
}: {
  group: Group
  onReplace: (id: string) => void
  onOpen: (id: string) => void
  /** Grubu kapatır; son grupsa sayfadan bu adrese çıkılır. */
  onClose: (leaveTo: string) => void
}) {
  const root = group.tabs.rootId
  const { request: r, deleted } = useRequest(root)
  const process = r && findProcess(r.processId)
  useEffect(() => markRead(root), [root])
  const gone = !r || !process || deleted
  const leaveTo = deleted ? boxLink('taslaklar') : boxLink(group.nav?.box ?? r?.box ?? 'bekleyen')
  useEffect(() => {
    if (gone) onClose(leaveTo)
    // Yalnızca kök gidince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gone])
  if (gone) return null
  const ids = group.nav?.ids ?? []
  const index = ids.indexOf(root)
  const box = findBox(group.nav?.box ?? r.box)!
  return (
    <Viewer
      r={r}
      process={process}
      caption={processCaption(process)}
      nav={index >= 0 ? { ids, index, go: onReplace, open: onOpen, box, scope: group.key } : undefined}
      onClose={() => onClose(processLink(box.id, process.id))}
      onDeleted={() => onClose(boxLink('taslaklar'))}
    />
  )
}

/** Form gelene kadar bölmede duran iskelet (sabit öğe: bölmeler yeniden çizilmesin). */
const SKELETON = <FormSkeleton />

/** Child sekmesinin görünümü (FormTabs her kimlik için bir kez çağırır; sabit işlev). */
const renderChild = (id: string, close: () => void) => <ChildViewer id={id} onClose={close} />

/** Child sekmesi: child talebin detayı (güncel hâliyle); Geri / İleri yok, kapat sekmede. */
function ChildViewer({ id, onClose }: { id: string; onClose: () => void }) {
  const { request: r } = useRequest(id)
  useEffect(() => markRead(id), [id])
  const process = r && findProcess(r.processId)
  if (!r || !process) return null
  return (
    <Viewer
      r={r}
      process={process}
      caption={processCaption(process)}
      onClose={onClose}
      onDeleted={onClose}
      isChild
    />
  )
}

/** Menü formunun olayları (orijinal: akışın başlangıç olayları ya da uygulama formunun araç çubuğu). */
type AppEvent = 'send' | 'draft' | 'cancel' | 'save' | 'close'

const APP_EVENTS: Record<
  'start' | 'form',
  { id: AppEvent; label: string; icon: LucideIcon; primary?: boolean }[]
> = {
  start: [
    { id: 'send', label: APP_FORM_TEXT.send, icon: Send, primary: true },
    { id: 'draft', label: APP_FORM_TEXT.saveDraft, icon: Save },
    { id: 'cancel', label: APP_FORM_TEXT.cancel, icon: X },
  ],
  form: [
    { id: 'save', label: APP_FORM_TEXT.save, icon: Save, primary: true },
    { id: 'close', label: APP_FORM_TEXT.close, icon: X },
  ],
}

/**
 * Menü uygulamasının formu (maket, `shared/appForms.ts`): talep ayrıntısının bandı (ikon, ad,
 * olaylar; kaydırınca yapışkan şerit) ve form kartı; Geri / İleri, yan bilgiler, tarihçe yok (akış
 * henüz başlamadı). "Gönder" bildirip formu kapatır, "Taslak Olarak Kaydet" / "Kaydet" yalnızca
 * bildirir (hiçbir şey kaydedilmez), "İptal" / "Kapat" formu (grubu) kapatır. Uygulama yoksa grup
 * kapanır.
 */
function AppViewer({ appId, onClose }: { appId: string; onClose: () => void }) {
  const app = findApp(appId)
  // Maket değerler (bugüne göre tarihler) form kurulurken bir kez
  const [form] = useState(() => appFormOf(appId))
  const notify = useNotify()
  const phone = useMediaQuery('(max-width: 639px)')
  const scroller = useTabScroller()
  const scrolled = useScrolled(220, scroller)
  const [attachFill, fillStyle] = useFillHeight(scroller ? '0.75rem' : '1.5rem', scroller)
  const bandStyle = useBand('record')
  const solid = !bandStyle.light
  const band = cn(CARD, bandStyle.band)
  const gone = !app || !form
  useEffect(() => {
    if (gone) onClose()
    // Yalnızca uygulama yoksa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gone])
  if (gone) return null

  const run = (id: AppEvent) => {
    if (id === 'send') {
      notify.success(APP_FORM_TEXT.success, APP_FORM_TEXT.sent(app.caption))
      onClose()
    } else if (id === 'draft') notify.success(APP_FORM_TEXT.success, APP_FORM_TEXT.draftSaved)
    else if (id === 'save') notify.success(APP_FORM_TEXT.success, APP_FORM_TEXT.saved)
    else onClose()
  }
  const actions = (onStrip: boolean) => (
    <Flex role="group" aria-label="Olaylar" className={ROW}>
      {APP_EVENTS[form.kind].map(({ id, label, icon: Icon, primary }) => (
        <Button
          key={id}
          type={primary ? 'primary' : 'default'}
          onClick={() => run(id)}
          className={
            primary ? (onStrip ? ON_STRIP : ON_BAND) : onStrip ? OUTLINE_ON_STRIP : OUTLINE_ON_BAND
          }
          icon={<Icon {...IC} />}
        >
          {label}
        </Button>
      ))}
    </Flex>
  )
  const Icon = app.icon ?? FileText

  return (
    <Flex vertical gap={12} className={cn(phone && 'pb-24')}>
      {/* Kaydırınca: 64px yapışkan şerit (olaylar + formun adı; talep ayrıntısındaki gibi) */}
      <Flex className="sticky top-[calc(var(--chrome-top,0px)+0.5rem)] z-30 -mb-3 block h-0">
        <Card
          aria-hidden={!scrolled}
          className={cn(
            STRIP,
            CARD,
            'absolute inset-x-0 h-16 transition duration-[calc(320ms*var(--motion-time,1))] ease-[cubic-bezier(0.22,1,0.36,1)]',
            !scrolled && 'pointer-events-none -translate-y-[calc(100%+1rem)] opacity-0',
          )}
          classNames={{ body: 'flex h-full items-center gap-4 px-6 py-0' }}
        >
          {!phone && scrolled && <Flex className={cn(ROW, 'shrink-0')}>{actions(true)}</Flex>}
          <Typography.Text
            ellipsis
            title={app.caption}
            className={`${TITLE} ms-auto max-w-[min(24rem,40%)] min-w-0 shrink text-end text-current`}
          >
            {app.caption}
          </Typography.Text>
        </Card>
      </Flex>

      {/* Bant: uygulamanın ikonu ve adı (formun başlığı), altında olaylar */}
      <Card className={band} classNames={{ body: 'flex flex-col gap-5 p-6' }}>
        <Flex align="center" gap={16} className="min-w-0">
          <Flex
            aria-hidden
            align="center"
            justify="center"
            className="size-12 shrink-0 rounded-2xl bg-current/10"
          >
            <Icon {...IC} size={22} />
          </Flex>
          <Typography.Title
            level={1}
            title={app.caption}
            data-tab-cue
            className="m-0 min-w-0 truncate font-display text-2xl font-bold text-current sm:text-[1.75rem]"
          >
            {app.caption}
          </Typography.Title>
        </Flex>
        {!phone && (
          <Flex
            {...({ inert: scrolled } as Record<string, unknown>)}
            aria-hidden={scrolled || undefined}
            className={ROW}
          >
            {actions(solid)}
          </Flex>
        )}
      </Card>

      {/* Form kartı kabın (sayfa ya da form sekmesinin bölmesi) altına kadar uzanır */}
      <Flex ref={attachFill} style={fillStyle} className="flex">
        <Card
          className={cn(CARD, 'min-h-(--fill-h) min-w-0 flex-1')}
          classNames={{ body: 'p-6 sm:p-8' }}
        >
          <AppFormBody form={form} />
        </Card>
      </Flex>

      {/* Telefonda olaylar altta sabit */}
      {phone && (
        <Card
          className={cn(band, 'fixed inset-x-3 bottom-3 z-30 animate-rise')}
          classNames={{ body: cn(ROW, 'p-3') }}
        >
          {actions(solid)}
        </Card>
      )}
    </Flex>
  )
}

/** Listeden açılan talebin gezinmesi: listedeki talepler, açık olanın sırası, geçiş ve kutu. */
interface DetailNav {
  ids: string[]
  index: number
  /** Geri / İleri: grubun kökü bu talep olur. */
  go: (id: string) => void
  /** Süreçler izinden seçilen talep: yeni grupta açılır. */
  open: (id: string) => void
  /** Listenin kutusu (ızgaranın sütunları ve tarih alanı). */
  box: Box
  /** Grubun anahtarı: Süreçler izinin çizgisi (`layoutId`) yalnızca kendi grubunda kayar. */
  scope: string
}

/** Tailwind sınıfları antd'nin kendi zemin / yazı rengini ezdiği için devre dışı hâli elle. */
const OFF = 'disabled:opacity-45'
const ON_BAND = cn('border-transparent bg-accent text-accent-foreground hover:bg-accent/90!', OFF)
const OUTLINE_ON_BAND = cn(
  'border-border bg-surface text-foreground hover:bg-surface-secondary! hover:text-foreground!',
  OFF,
)
/** Kaydırınca beliren şerit: dolu birincil renk; üstünde dolu öğe beyaz, çizgili öğe rengini şeritten alır. */
const STRIP = 'bg-accent text-accent-foreground'
const ON_STRIP = cn(
  'border-transparent bg-accent-foreground text-accent hover:bg-accent-foreground/90! hover:text-accent!',
  OFF,
)
const OUTLINE_ON_STRIP = cn(
  'border-current/40 bg-transparent text-current hover:border-current! hover:bg-accent-foreground/10! hover:text-current!',
  OFF,
)
/** Form kartı: Motion düzen animasyonu için. */
const MotionCard = motion.create(Card)

const TITLE = 'm-0 font-display text-lg font-semibold'
const ROW = 'flex flex-wrap items-center gap-2'
const SPLIT = 'flex flex-wrap items-center justify-between gap-3'

function Viewer({
  r,
  process,
  caption,
  nav,
  onClose,
  onDeleted,
  isChild = false,
}: {
  r: WorkRequest
  process: Process
  caption: string
  /** Listeden açıldıysa; yoksa Geri / İleri kapalı. */
  nav?: DetailNav
  onClose: () => void
  onDeleted: () => void
  /** Child sekmesi: başlıkta Geri / İleri gösterilmez. */
  isChild?: boolean
}) {
  const documents = documentsOf(r)
  const form = documents.find((d) => d.kind === 'form')!
  const viewed = useViewedDocuments(r.id)
  const events = eventsFor(r)
  const isDraft = r.status === 'Taslak'
  // Geri / İleri listedeki komşu taleplere
  const prev = nav && nav.index > 0 ? () => nav.go(nav.ids[nav.index - 1]) : undefined
  const next =
    nav && nav.index < nav.ids.length - 1 ? () => nav.go(nav.ids[nav.index + 1]) : undefined

  const [view, setView] = useState<'form' | 'history'>('form')
  const [activeId, setActiveId] = useState(form.id)
  const [docsWarning, setDocsWarning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [decided, setDecided] = useState<FlowEvent | null>(null)
  const [sideTab, setSideTab] = useState<SideTab>('props')
  const [historyOptions, setHistoryOptions] = useHistoryViewOptions()
  const phone = useMediaQuery('(max-width: 639px)')
  const scroller = useTabScroller()
  // Yan bilgiler (DetailSide.tsx): bölme genişliğine göre sütun, raf + çekmece ya da formun altında
  const [side, attachSide] = useSidePanel(scroller)
  const openSide = (target: SideTarget) => {
    if (target !== 'docs') setSideTab(target)
    side.setOpen(true)
  }
  // Beyaz bant; koyu zeminli bantta öğeler şerit gibi ters renkte olurdu
  const bandStyle = useBand('record')
  const solid = !bandStyle.light
  const band = cn(CARD, bandStyle.band)
  const scrolled = useScrolled(220, scroller)
  // Form ve yan bilgiler kabın (sayfa ya da form sekmesinin bölmesi) altına kadar uzanır
  const [attachFill, fillStyle] = useFillHeight(scroller ? '0.75rem' : '1.5rem', scroller)
  const attachBento = useCallback(
    (el: HTMLElement | null) => {
      attachSide(el)
      attachFill(el)
    },
    [attachSide, attachFill],
  )
  // Form kartının yan sütunla birlikte hareketi (aşağıda)
  const sideLayout = `${side.mode}:${side.open}`
  const moveT = useTransition({ duration: 0.42, ease: [0.22, 1, 0.36, 1] })
  const cardRadius = useRadiusPx(CARD_RADIUS)

  const flow = useFlow(r, {
    onDocsRequired: () => {
      setDocsWarning(true)
      openSide('docs')
    },
    onDecided: (event) => {
      setDocsWarning(false)
      setDecided(event)
      setView('history')
    },
  })

  const openDocument = (doc: FlowDocument) => {
    markDocumentViewed(r.id, doc.id)
    setActiveId(doc.id)
    setView('form')
    setDocsWarning(false)
    // Çekmece formu örtüyor: gösterilen doküman görünsün
    side.dismiss()
  }
  const active = documents.find((d) => d.id === activeId) ?? form
  const historyMenu = <HistoryViewMenu options={historyOptions} onChange={setHistoryOptions} />

  const hasActions = events.length > 0 || isDraft || !!decided
  const actions = (onStrip = false) => (
    <Actions
      events={events}
      isDraft={isDraft}
      decided={decided}
      onRun={(id) => flow.run(id)}
      onDelete={() => setConfirmDelete(true)}
      onNext={next}
      onClose={onClose}
      onStrip={onStrip}
    />
  )

  const sideContent = {
    props: <PropertiesList items={propertiesOf(r)} />,
    docs: (
      <DocumentsList
        documents={documents}
        viewed={viewed}
        activeId={active.id}
        showWarning={docsWarning}
        onOpen={openDocument}
      />
    ),
    history:
      r.history.length > 0 ? (
        <Flex vertical gap={12}>
          {/* Kart kendi içinde kayar (DetailSide.tsx); nabız halkasına yer orada bırakılır */}
          <HistoryTimeline r={r} options={historyOptions} compact />
          {/* Görünüm seçenekleri (bilgilendirmeler, ham tarih) tam tarihçe düğmesinin yanında */}
          <Flex align="center" gap={8}>
            <Button
              variant="filled"
              color="default"
              onClick={() => {
                setView('history')
                side.dismiss()
              }}
              className="flex-1"
            >
              {VIEWER_LABELS.showFullHistory}
            </Button>
            {historyMenu}
          </Flex>
        </Flex>
      ) : (
        <Typography.Text type="secondary">{VIEWER_LABELS.propertiesEmpty}</Typography.Text>
      ),
  }

  return (
    <Flex vertical gap={12} className={cn(phone && hasActions && 'pb-24')}>
      {/* Kaydırınca: 64px yapışkan şerit (başlık + olaylar) */}
      {/* Üst modda kabuğun altına (`--chrome-top`, kabuk verir) */}
      <Flex className="sticky top-[calc(var(--chrome-top,0px)+0.5rem)] z-30 -mb-3 block h-0">
        <Card
          aria-hidden={!scrolled}
          className={cn(
            STRIP,
            CARD,
            // Şerit yukarıdan kayarak iner, çıkarken yukarı kaçar
            'absolute inset-x-0 h-16 transition duration-[calc(320ms*var(--motion-time,1))] ease-[cubic-bezier(0.22,1,0.36,1)]',
            !scrolled && 'pointer-events-none -translate-y-[calc(100%+1rem)] opacity-0',
          )}
          classNames={{ body: 'flex h-full items-center gap-4 px-6 py-0' }}
        >
          {/* Olaylar en solda; formun adı (yalnızca ad, kod yok) en sağda, uzunsa kısalır */}
          {!phone && scrolled && <Flex className={cn(ROW, 'shrink-0')}>{actions(true)}</Flex>}
          <Typography.Text
            ellipsis
            title={caption}
            className={`${TITLE} ms-auto max-w-[min(24rem,40%)] min-w-0 shrink text-end text-current`}
          >
            {process.form}
          </Typography.Text>
        </Card>
      </Flex>

      {/* --- Band ---------------------------------------------------------------------------- */}
      {/*
       * Başlık bandı: solda süreç ikonu ve süreç adı (sayfa başlığı); sağda Geri / İleri, aralarında
       * listedeki süreçlerin şeridi ve sırası. Altında olaylar.
       */}
      <Card className={band} classNames={{ body: 'flex flex-col gap-5 p-6' }}>
        <Flex wrap align="start" justify="space-between" gap={16}>
          <Flex align="center" gap={16} className="min-w-0 flex-1">
            <Flex
              aria-hidden
              align="center"
              justify="center"
              className="size-12 shrink-0 rounded-2xl bg-current/10"
            >
              <process.icon {...IC} size={22} />
            </Flex>
            {/* `data-tab-cue`: form sekmeleri arasında geçince kısa kayarak yenilenir (FormTabs.tsx) */}
            <Typography.Title
              level={1}
              title={caption}
              data-tab-cue
              className="m-0 min-w-0 truncate font-display text-2xl font-bold text-current sm:text-[1.75rem]"
            >
              {isDraft ? process.form : process.name}
            </Typography.Title>
          </Flex>
          {isChild ? null : (
            <Flex className={ROW}>
              <NavButton
                label={VIEWER_LABELS.prev}
                icon={ChevronLeft}
                onPress={prev}
                onStrip={solid}
              />
              {/* `LayoutGroup` yalnızca izin çevresinde: çizgi Geri / İleri'de eski kökten yenisine
                  kayar, gruplar birbirine karışmaz; formun diğer düzen öğeleri gruba girmez */}
              {nav && nav.ids.length > 1 && (
                <LayoutGroup id={nav.scope}>
                  <NavTrail nav={nav} process={process} onStrip={solid} />
                </LayoutGroup>
              )}
              <NavButton
                label={VIEWER_LABELS.next}
                icon={ChevronRight}
                onPress={next}
                onStrip={solid}
              />
            </Flex>
          )}
        </Flex>

        {/* Şerit göründüğünde bant kopyası erişilebilirlik ağacından çıkar (tek olay grubu) */}
        {hasActions && !phone && (
          <Flex
            {...({ inert: scrolled } as Record<string, unknown>)}
            aria-hidden={scrolled || undefined}
            className={ROW}
          >
            {actions(solid)}
          </Flex>
        )}
      </Card>

      {/* --- Bento ---------------------------------------------------------------------------- */}
      {/* Solda form (ya da tam tarihçe), sağda yan bilgiler; telefonda alt alta. Form kartı kabın
          altına kadar uzanır (`--fill-h`; yan sütun da aynı boyda) */}
      <Flex
        ref={attachBento}
        vertical={side.mode === 'stack'}
        style={side.mode === 'stack' ? undefined : fillStyle}
        className={cn('relative gap-3', side.mode !== 'stack' && 'items-start')}
      >
        {/*
         * Yan sütun açılıp katlanınca form kartı Motion düzen animasyonuyla (FLIP, yalnızca dönüşüm)
         * daralır / genişler: içerik bir kez son genişliğinde dizilir (`layout="position"`, ölçek
         * geri alınır), kart onu kırpar. Köşe px (Motion düzeltir). Yalnızca yan yerleşim değişince
         * ölçülür (`layoutDependency`).
         */}
        <MotionCard
          layout
          layoutDependency={sideLayout}
          transition={{ layout: moveT }}
          style={cardRadius === undefined ? undefined : { borderRadius: cardRadius }}
          className={cn(
            CARD,
            'min-w-0 overflow-clip',
            side.mode !== 'stack' && 'min-h-(--fill-h) flex-1',
          )}
          classNames={{ body: 'p-6 sm:p-8' }}
        >
          <MotionFlex
            layout="position"
            layoutDependency={sideLayout}
            transition={{ layout: moveT }}
            className="block"
          >
            {view === 'history' ? (
              // Form ↔ tarihçe geçişinde içerik yeniden belirir
              <Flex key="history" vertical gap={24} className="animate-rise">
                <Flex className={SPLIT}>
                  <Flex align="center" gap={12}>
                    <TintIcon icon={History} />
                    <Typography.Title level={2} className={TITLE}>
                      {VIEWER_LABELS.history}
                    </Typography.Title>
                  </Flex>
                  <Flex className={ROW}>
                    {historyMenu}
                    <Button
                      variant="filled"
                      color="default"
                      icon={<FileText {...IC} />}
                      onClick={() => setView('form')}
                    >
                      {FLOW_TEXT.showForm}
                    </Button>
                  </Flex>
                </Flex>
                <HistoryTimeline r={r} options={historyOptions} />
              </Flex>
            ) : active.kind === 'form' ? (
              <FormBody
                r={r}
                files={documents.filter((d) => d.kind === 'file')}
                onOpenFile={openDocument}
              />
            ) : (
              <Flex key={active.id} vertical className="animate-rise">
                <FileBody doc={active} onShowForm={() => setActiveId(form.id)} />
              </Flex>
            )}
          </MotionFlex>
        </MotionCard>

        {/* Zorunlu doküman uyarısında panel açılır, Dokümanlar kartı sallanır */}
        <SidePanel
          side={side}
          tab={sideTab}
          onTab={setSideTab}
          onOpen={openSide}
          warning={docsWarning}
          docs={sideContent.docs}
          props={sideContent.props}
          history={sideContent.history}
        />
      </Flex>

      {/* Telefonda olay şeridi altta sabit */}
      {phone && hasActions && (
        <Card
          className={cn(band, 'fixed inset-x-3 bottom-3 z-30 animate-rise')}
          classNames={{ body: cn(ROW, 'p-3') }}
        >
          {actions(solid)}
        </Card>
      )}

      {flow.element}
      <ConfirmDialog
        isOpen={confirmDelete}
        tone="danger"
        message={DELETE_CONFIRM}
        onNo={() => setConfirmDelete(false)}
        onYes={() => {
          setConfirmDelete(false)
          deleteDraft(r.id)
          onDeleted()
        }}
      />
    </Flex>
  )
}

/** Karar etiketinin halka rengi (durum rengi; nötr sonuçta birincil). */
const HALO = {
  success: '[--halo:var(--success)]',
  danger: '[--halo:var(--danger)]',
  default: '[--halo:var(--accent)]',
} as const

/** Olay şeridi; taslakta "Sil"; karardan sonra İleri / Kapat. */
function Actions({
  events,
  isDraft,
  decided,
  onRun,
  onDelete,
  onNext,
  onClose,
  onStrip = false,
}: {
  events: FlowEvent[]
  isDraft: boolean
  decided: FlowEvent | null
  onRun: (id: number) => void
  onDelete: () => void
  onNext?: () => void
  onClose: () => void
  /** Kaydırınca beliren birincil şeritte: öğeler şeridin ters renginde. */
  onStrip?: boolean
}) {
  const on = onStrip ? ON_STRIP : ON_BAND
  const outline = onStrip ? OUTLINE_ON_STRIP : OUTLINE_ON_BAND
  if (decided) {
    const k = decided.kind
    const color =
      k === 'approve' ? 'success' : k === 'reject' || k === 'sendBack' ? 'danger' : 'default'
    return (
      <>
        {/* Karar sonucu: etiket sıçrayarak gelir, çevresinde halka yayılır, ikon çizilir */}
        <Tag
          variant="solid"
          color={color === 'danger' ? 'error' : color === 'success' ? 'success' : undefined}
          icon={
            <decided.icon
              {...IC}
              size={14}
              className="[&_*]:[stroke-dasharray:48] [&_*]:animate-draw"
            />
          }
          className={cn(
            'me-0 inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm',
            'animate-[pop_calc(0.42s*var(--motion-time,1))_cubic-bezier(0.34,1.56,0.64,1)_both,halo_calc(1.1s*var(--motion-time,1))_ease-out_0.2s_both]',
            HALO[color],
            color === 'default' && on,
          )}
        >
          {decided.description}
        </Tag>
        {onNext && (
          <Button
            onClick={onNext}
            className={on}
            iconPlacement="end"
            icon={<ChevronRight {...IC} />}
          >
            {VIEWER_LABELS.next}
          </Button>
        )}
        <Button onClick={onClose} className={outline} icon={<X {...IC} />}>
          Kapat
        </Button>
      </>
    )
  }
  if (isDraft)
    return (
      <Button onClick={onDelete} className={outline} icon={<Trash2 {...IC} />}>
        {FLOW_TEXT.delete}
      </Button>
    )
  return (
    <Flex role="group" aria-label="Olaylar" className={ROW}>
      {events.map(({ id, icon: Icon, kind, description, enable, default: isDefault }) => (
        <Button
          key={id}
          type={isDefault ? 'primary' : 'default'}
          disabled={!enable}
          onClick={() => onRun(id)}
          className={isDefault ? on : outline}
          icon={
            kind === 'reject' ? (
              <Avatar
                aria-hidden
                size={20}
                icon={<Icon {...IC} size={14} />}
                className="inline-flex! items-center justify-center bg-danger text-danger-foreground"
              />
            ) : (
              <Icon {...IC} />
            )
          }
        >
          {description}
        </Button>
      ))}
    </Flex>
  )
}

function NavButton({
  label,
  icon: Icon,
  onPress,
  onStrip,
}: {
  label: string
  icon: LucideIcon
  onPress?: () => void
  onStrip?: boolean
}) {
  return (
    <Tip label={label} placement="bottom">
      <Button
        aria-label={label}
        disabled={!onPress}
        onClick={onPress}
        icon={<Icon {...IC} size={18} />}
        className={onStrip ? OUTLINE_ON_STRIP : OUTLINE_ON_BAND}
      />
    </Tip>
  )
}

/** Süreç şeridindeki çizgi sayısı: açık talebin bulunduğu 8'li sayfa. */
const TRAIL_PAGE = 8

/** Süreç ızgarasının sayfa boyları (iş akışı ızgarasıyla aynı). */
const NAV_SIZES = [10, 20, 30, 50] as const

/**
 * Geri / İleri arasındaki süreç şeridi (yüzen içindekiler, yatay): listedeki her süreç kısa bir
 * çizgi, açık olan uzun ve birincil renkte (açık talebin 8'li sayfası). Basınca açılır pencerede
 * listenin veri ızgarası (`NavGrid`); ızgarada üstüne gelinen satırın çizgisi belirginleşir.
 * Pencere büyük olduğundan üstüne gelince değil basınca açılır (Geri ile İleri arasında gezen
 * imleç onu açmasın). Esc ya da dışarı basmak kapatır.
 */
function NavTrail({
  nav,
  process,
  onStrip,
}: {
  nav: DetailNav
  process: Process
  onStrip: boolean
}) {
  const { ids, index, open: openGroup, box } = nav
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const grid = useRef<HTMLElement>(null)
  const transition = useTransition()
  const current = ids[index]

  // Çizgiler: açık talebin 8'li sayfası; son sayfa kısa kalırsa boş yuvalar iki yanda (şerit sabit)
  const tickFrom = Math.floor(index / TRAIL_PAGE) * TRAIL_PAGE
  const tickIds = ids.slice(tickFrom, tickFrom + TRAIL_PAGE)
  const size = Math.min(ids.length, TRAIL_PAGE)
  const lead = Math.floor((size - tickIds.length) / 2)
  const ticks = Array.from({ length: size }, (_, i) => tickIds[i - lead])

  const toggle = (v: boolean) => {
    setOpen(v)
    if (!v) setHovered(null)
  }
  const close = () => {
    toggle(false)
    trigger.current?.focus()
  }
  const label = `${VIEWER_LABELS.processes} (${index + 1} / ${ids.length})`

  return (
    // Tooltip ile açılır pencere aynı tetikleyiciyi paylaşamaz: ipucu sarmalayıcıda
    <Tip label={label} placement="bottom" disabled={open}>
      <Flex
        className="inline-flex"
        // Pencere içinden gelen tuşlar da buraya çıkar (React ağacı)
        onKeyDown={(e) => {
          if (e.key !== 'Escape' || !open) return
          e.stopPropagation()
          close()
        }}
      >
        <Popover
          open={open}
          onOpenChange={toggle}
          trigger="click"
          placement="bottomRight"
          arrow={false}
          // Kapanınca ızgara kalkar: yeniden açılınca açık talebin sayfasından, aramasız başlar
          destroyOnHidden
          // Açılınca odak aramada (pencere yerleşince; ilk çizimde odak alınamıyor)
          afterOpenChange={(v) => {
            if (v) grid.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus()
          }}
          classNames={{ container: 'p-0' }}
          content={
            <NavGrid
              rootRef={grid}
              ids={ids}
              current={current}
              position={index + 1}
              box={box}
              process={process}
              onHover={setHovered}
              // Seçilen talep yeni grupta açılır (açıksa o gruba geçilir); açık olan yalnızca kapatır
              onOpen={(id) => {
                close()
                if (id !== current) openGroup(id)
              }}
            />
          }
        >
          <Button
            ref={trigger}
            type="text"
            aria-label={label}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={cn(
              'group h-auto flex-col gap-1 px-2.5 py-1.5 text-current hover:bg-current/8! hover:text-current!',
              open && 'bg-current/10!',
            )}
          >
            <Flex aria-hidden gap={6}>
              {ticks.map((id, i) => (
                <Flex key={i} aria-hidden align="center" className="h-5 w-0.5">
                  {id && id === current ? (
                    // Açık talebin çizgisi talepten talebe kayar (yalnızca talep değişince; form
                    // sekmelerinde bölme daralıp genişlerken yerinde kalır)
                    <MotionFlex
                      layoutId="detail-trail"
                      layoutDependency={current}
                      transition={transition}
                      className={cn(
                        'block h-full w-full rounded-full',
                        onStrip ? 'bg-current' : 'bg-accent',
                      )}
                    />
                  ) : (
                    <Flex
                      className={cn(
                        'block w-full rounded-full transition-[height,background-color] duration-[calc(200ms*var(--motion-time,1))]',
                        !id
                          ? 'invisible h-2.5'
                          : id === hovered
                            ? 'h-3.5 bg-current/70'
                            : 'h-2.5 bg-current/25 group-hover:bg-current/45',
                      )}
                    />
                  )}
                </Flex>
              ))}
            </Flex>
            {/* Sıra: listedeki yeri (ör. 2 / 8); ekran okuyucu düğmenin adından okur */}
            <Typography.Text
              aria-hidden
              className="text-[0.6875rem] leading-none text-current tabular-nums opacity-60"
            >
              {index + 1} / {ids.length}
            </Typography.Text>
          </Button>
        </Popover>
      </Flex>
    </Tip>
  )
}

/** Süreç ızgarasının satırı: tarih grubu başlığı ya da talep. */
interface NavRow {
  key: string
  group?: { label: string; count: number }
  r?: WorkRequest
}

/**
 * Süreç ızgarası (açılır pencerede): iş akışı ızgarasının tablosu (aynı sütunlar, görünüş, tarih
 * grupları; okunmamışlar kalın). Sıra Geri / İleri'nin sırası (listenin açıldığı ızgaradaki gibi);
 * açık talep vurgulu, satıra basınca (ya da Enter) o talebe gidilir. Üstte ara, altta sayfa boyu ve
 * sayfalar; ilk açılışta açık talebin sayfası. Durumlar güncel (karar verilen talep de listede).
 */
function NavGrid({
  rootRef,
  ids,
  current,
  position,
  box,
  process,
  onHover,
  onOpen,
}: {
  rootRef: Ref<HTMLElement>
  ids: string[]
  current: string | undefined
  /** Açık talebin sırası (1'den). */
  position: number
  box: Box
  process: Process
  onHover: (id: string | null) => void
  onOpen: (id: string) => void
}) {
  const requests = useRequests(ids)
  const readIds = useReadIds()
  const columns = useMemo(() => columnsFor(box, process), [box, process])
  const caption = boxProcessCaption(box, process)
  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState<number>(NAV_SIZES[0])
  // Açık talebin sayfası (sayfa boyu değişince de onu gösterir)
  const at = Math.max(
    0,
    requests.findIndex((r) => r.id === current),
  )
  const [page, setPage] = useState(() => Math.floor(at / NAV_SIZES[0]) + 1)

  const q = search.trim().toLocaleLowerCase('tr')
  const found = useMemo(
    () => (q ? requests.filter((r) => searchText(r, columns).includes(q)) : requests),
    [requests, columns, q],
  )
  const pageCount = Math.max(1, Math.ceil(found.length / pageSize))
  const shownPage = Math.min(page, pageCount)
  const from = (shownPage - 1) * pageSize
  const pageRows = found.slice(from, from + pageSize)

  // Tarih grupları: sıra korunur, art arda aynı gruptakiler bir başlığın altında
  const data: NavRow[] = []
  let group: NavRow | null = null
  let last: string | null = null
  for (const r of pageRows) {
    const bucket = dateBucket(dateOf(r, box))
    if (bucket !== last || !group?.group) {
      const label = dateBuckets.find((b) => b.id === bucket)?.label ?? ''
      group = { key: `g-${r.id}`, group: { label, count: 0 } }
      data.push(group)
      last = bucket
    }
    group.group!.count++
    data.push({ key: r.id, r })
  }

  const rowHeader = box.draftDelete ? 'flowCaption' : 'Subject'
  const span = columns.length
  const tableColumns: TableColumnsType<NavRow> = columns.map((c, i) => ({
    key: c.key,
    dataIndex: c.key,
    title: c.caption,
    className: c.key === rowHeader ? GRID_LEAD : GRID_CELL,
    // Grup satırında ilk hücre tüm satırı kaplar, diğerleri çizilmez
    onCell: (row: NavRow) => (row.group ? { colSpan: i === 0 ? span : 0 } : {}),
    render: (_: unknown, row: NavRow) =>
      row.group ? (
        <GroupLabel label={row.group.label} count={row.group.count} />
      ) : (
        <CellValue r={row.r!} col={c} />
      ),
  }))

  return (
    <Flex
      ref={rootRef}
      vertical
      role="dialog"
      aria-label={VIEWER_LABELS.processes}
      className="max-h-[min(42rem,calc(100dvh-10rem))] w-[min(68rem,calc(100vw-2rem))]"
    >
      <Flex wrap align="center" gap={12} className="shrink-0 px-5 pt-4 pb-3">
        <Flex vertical className="min-w-48 flex-1">
          <Typography.Text type="secondary" className="text-xs">
            {box.title}
          </Typography.Text>
          <Typography.Title level={2} ellipsis className="m-0 font-display text-lg">
            {caption}
          </Typography.Title>
        </Flex>
        <Typography.Text type="secondary" className="text-xs tabular-nums">
          {position} / {ids.length}
        </Typography.Text>
        <SearchField
          value={search}
          onChange={(v) => {
            setSearch(v)
            setPage(1)
          }}
          className="w-60"
        />
      </Flex>
      {/* Tablo kalan yüksekliği doldurur ve kendi içinde kayar; başlık satırı üstte kalır */}
      <Flex vertical className="min-h-0 flex-1 overflow-auto px-3">
        <Table<NavRow>
          aria-label={caption}
          size="middle"
          pagination={false}
          columns={tableColumns}
          dataSource={data}
          className={GRID_TABLE}
          locale={{ emptyText: <EmptyNote text="Gösterilecek veri yok." /> }}
          rowClassName={(row) =>
            row.group
              ? GRID_GROUP_ROW
              : cn(
                  GRID_ROW,
                  row.r!.id === current && GRID_ROW_SELECTED,
                  !isRead(row.r!, readIds) && 'font-semibold',
                )
          }
          onRow={(row) => {
            const r = row.r
            if (!r) return {}
            return {
              onClick: () => onOpen(r.id),
              onKeyDown: (e) => {
                if (e.key === 'Enter' && e.target === e.currentTarget) onOpen(r.id)
              },
              onMouseEnter: () => onHover(r.id),
              onMouseLeave: () => onHover(null),
              onFocus: () => onHover(r.id),
              onBlur: () => onHover(null),
              tabIndex: 0,
              'aria-current': r.id === current ? 'true' : undefined,
            }
          }}
        />
      </Flex>
      {found.length > 0 && (
        <Flex className="block shrink-0 border-t border-border px-5 py-3">
          <GridFooter
            page={shownPage}
            from={from}
            shown={pageRows.length}
            total={found.length}
            pageSize={pageSize}
            sizes={NAV_SIZES}
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n)
              setPage(q ? 1 : Math.floor(at / n) + 1)
            }}
          />
        </Flex>
      )}
    </Flex>
  )
}
