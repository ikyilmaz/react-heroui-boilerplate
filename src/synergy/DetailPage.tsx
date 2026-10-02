import { useEffect, useMemo, useRef, useState, type Ref } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { ChevronLeft, ChevronRight, FileText, History, Trash2, X } from 'lucide-react'
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
import { FLOW_TEXT, statusColor } from '@/synergy/shared/flowLabels'
import { START_CRUMB, WF_CRUMB, boxLink, processLink, requestLink, useFrame } from '@/synergy/paths'
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
import { CARD, cn, IC, MotionFlex, Scroll, TintIcon, Tip } from '@/synergy/ant/ui'
import { useTransition } from '@/synergy/motion'
import { SwitchPanel } from '@/synergy/ant/motion'
import { ConfirmDialog, useFlow } from '@/synergy/flow'
import { useMediaQuery, useScrolled } from '@/synergy/shared/hooks'
import { FormTabs, useTabScroller } from '@/synergy/FormTabs'
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
 * Talep ayrıntısı (Flow Viewer), antd: vurgu bandı + bento
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
  const { request: r, deleted } = useRequest(params.requestId)
  const routeBox = findBox(params.box)
  const process = r && findProcess(r.processId)

  useEffect(() => {
    if (params.requestId) markRead(params.requestId)
  }, [params.requestId])

  const siblings = useBoxRequests((routeBox?.id ?? 'bekleyen') as BoxId)
  const [fallbackIds] = useState(() =>
    siblings.filter((x) => x.processId === params.processId).map((x) => x.id),
  )
  const ids = (location.state as DetailNavState | null)?.ids ?? fallbackIds

  // Talep değişince geçişin yönü: listede ilerideyse içerik sağdan, gerideyse soldan gelir
  const at = params.requestId ? ids.indexOf(params.requestId) : -1
  const [seen, setSeen] = useState({ id: params.requestId, at })
  const [dir, setDir] = useState(1)
  if (seen.id !== params.requestId) {
    setSeen({ id: params.requestId, at })
    setDir(at >= seen.at ? 1 : -1)
  }

  // Konum ve geri dönüş için kutu: rotadaki kutu, yoksa talebin kutusu
  const box = routeBox ?? (r && findBox(r.box))
  useFrame(
    r && process && box
      ? [
          START_CRUMB,
          WF_CRUMB,
          { label: box.title, href: boxLink(box.id), icon: `box:${box.id}` },
          {
            label: processCaption(process),
            href: processLink(box.id, process.id),
            icon: `process:${process.id}`,
          },
          { label: r.no, icon: 'request' },
        ]
      : [],
    box?.id ?? null,
  )

  if (deleted) return <Navigate to={boxLink('taslaklar')} replace />
  if (!r || !process || !box) return <Navigate to={boxLink(routeBox?.id ?? 'bekleyen')} replace />

  const index = ids.indexOf(r.id)
  const go = (id: string) => {
    const target = findRequest(id)
    if (target) navigate(requestLink(target), { state: { ids } satisfies DetailNavState })
  }

  // Form sekmeleri talebe bağlı: Geri / İleri ile talep değişince yeniden kurulur (eskisi solarak
  // çıkarken yenisi iskeletiyle gidilen yönden gelir)
  return (
    <Flex className="relative flex flex-col">
      <SwitchPanel id={r.id} dir={dir} className="flex flex-col">
        <FormTabs
          key={r.id}
          rootId={r.id}
          root={
            <Viewer
              r={r}
              process={process}
              caption={processCaption(process)}
              nav={index >= 0 ? { ids, index, go, box } : undefined}
              onClose={() => navigate(processLink(box.id, process.id))}
              onDeleted={() => navigate(boxLink('taslaklar'))}
            />
          }
          renderTab={renderChild}
          placeholder={<FormSkeleton />}
        />
      </SwitchPanel>
    </Flex>
  )
}

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

/** Listeden açılan talebin gezinmesi: listedeki talepler, açık olanın sırası, geçiş ve kutu. */
interface DetailNav {
  ids: string[]
  index: number
  go: (id: string) => void
  /** Listenin kutusu (ızgaranın sütunları ve tarih alanı). */
  box: Box
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
/** Band metni: antd yazı rengini ezip bandın rengini izler. */
const FAINT = 'text-current opacity-75'
const TITLE = 'm-0 font-display text-lg font-semibold'
const ROW = 'flex flex-wrap items-center gap-2'
const SPLIT = 'flex flex-wrap items-center justify-between gap-3'

/** Durum etiketinin rengi (antd adlarıyla). */
const TAG_COLOR = { success: 'success', danger: 'error', warning: 'warning' } as const

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
  const status = statusColor(r.status)
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
  // Vurgu gücü (tema paneli): varsayılanda beyaz bant; koyu zeminli bantlarda öğeler şerit gibi ters renkte
  const bandStyle = useBand('record')
  const solid = !bandStyle.light
  const band = cn(CARD, bandStyle.band)
  const scrolled = useScrolled(220, scroller)

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
          {/* Halka kadar (0.75rem; tema boşluk ölçeğinden bağımsız) iç boşluk + eşit negatif boşluk:
              bekleyen adımın nabız halkası kaydırma kabında kesilmesin, yerleşim değişmesin */}
          <Scroll className="-m-[0.75rem] max-h-[27.5rem] p-[0.75rem] pe-[1rem]">
            <HistoryTimeline r={r} options={historyOptions} compact />
          </Scroll>
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
          {/* Konu her formda olmayabilir: şeritte süreç adı ve talep numarası */}
          <Flex vertical className="min-w-0 flex-1">
            <Typography.Text ellipsis className={`${TITLE} text-current`}>
              {caption}
            </Typography.Text>
            <Typography.Text ellipsis className={`font-mono text-xs ${FAINT}`}>
              {r.no}
            </Typography.Text>
          </Flex>
          {!phone && scrolled && <Flex className={cn(ROW, 'shrink-0')}>{actions(true)}</Flex>}
        </Card>
      </Flex>

      {/* --- Band ---------------------------------------------------------------------------- */}
      {/*
       * Başlık bandı: solda süreç ikonu, proje ve süreç adı (sayfa başlığı) ile durum; sağda Geri /
       * İleri, aralarında listedeki süreçlerin şeridi. Altında olaylar.
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
            <Flex vertical className="min-w-0">
              <Typography.Text ellipsis className={`text-sm ${FAINT}`}>
                {process.project}
              </Typography.Text>
              <Flex wrap align="center" className="min-w-0 gap-x-3 gap-y-1">
                {/* `data-tab-cue`: form sekmeleri arasında geçince kısa kayarak yenilenir (FormTabs.tsx) */}
                <Typography.Title
                  level={1}
                  title={caption}
                  data-tab-cue
                  className="m-0 min-w-0 truncate font-display text-2xl font-bold text-current sm:text-[1.75rem]"
                >
                  {isDraft ? process.form : process.name}
                </Typography.Title>
                <Tag variant="solid" color={TAG_COLOR[status]} data-tab-cue className="me-0">
                  {r.status}
                </Tag>
              </Flex>
            </Flex>
          </Flex>
          {isChild ? null : (
            <Flex className={ROW}>
              <NavButton
                label={VIEWER_LABELS.prev}
                icon={ChevronLeft}
                onPress={prev}
                onStrip={solid}
              />
              {nav && nav.ids.length > 1 && (
                <NavTrail nav={nav} process={process} onStrip={solid} />
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
      {/* Solda form (ya da tam tarihçe), sağda yan bilgiler; telefonda alt alta */}
      <Flex
        ref={attachSide}
        vertical={side.mode === 'stack'}
        className={cn('relative gap-3', side.mode !== 'stack' && 'items-start')}
      >
        <Card
          className={cn(CARD, 'min-w-0', side.mode !== 'stack' && 'flex-1')}
          classNames={{ body: 'p-6 sm:p-8' }}
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
        </Card>

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
  const { ids, index, go, box } = nav
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
          classNames={{ container: 'p-0 overflow-hidden' }}
          content={
            <NavGrid
              rootRef={grid}
              ids={ids}
              current={current}
              position={index + 1}
              box={box}
              process={process}
              onHover={setHovered}
              onOpen={(id) => (id === current ? close() : go(id))}
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
              'group h-8 gap-1.5 px-2.5 text-current hover:bg-current/8! hover:text-current!',
              open && 'bg-current/10!',
            )}
          >
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
        <Typography.Text type="secondary" className="font-mono text-xs tabular-nums">
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
