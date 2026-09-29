import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Files,
  History,
  Info,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
  X,
} from 'lucide-react'
import {
  Avatar,
  Button,
  Card,
  Chip,
  ScrollShadow,
  Separator,
  Tabs,
  Typography,
  cn,
} from '@heroui/react'
import {
  deleteDraft,
  markDocumentViewed,
  markRead,
  useBoxRequests,
  useRequest,
  useViewedDocuments,
} from '@/synergy/shared/decisions'
import {
  DELETE_CONFIRM,
  DOCUMENT_LABELS,
  VIEWER_LABELS,
  documentsOf,
  eventsFor,
  findBox,
  findProcess,
  findRequest,
  processCaption,
  propertiesOf,
  type BoxId,
  type DetailNavState,
  type FlowDocument,
  type FlowEvent,
  type Process,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import { useHistoryViewOptions } from '@/synergy/shared/historyView'
import { FLOW_TEXT, statusColor } from '@/synergy/shared/flowLabels'
import { card } from '@/synergy/shared/tokens'
import { Box } from '@/synergy/shared/ui'
import {
  START_CRUMB,
  WF_CRUMB,
  boxLink,
  processLink,
  requestLink,
  useFrame,
} from '@/synergy/v1/paths'
import { IC, SOFT_BAND, TintIcon, Tip } from '@/synergy/v1/parts'
import { useLook } from '@/synergy/shared/themeSettings'
import { KaroConfirm, useKaroFlow } from '@/synergy/v1/flow'
import { useMediaQuery, useScrolled } from '@/synergy/shared/hooks'
import {
  DocumentsList,
  FileBody,
  FormBody,
  HistoryTimeline,
  HistoryViewMenu,
  PropertiesList,
} from '@/synergy/v1/DetailTiles'

/* -------------------------------------------------------------------------------------------------
 * Talep ayrıntısı (Flow Viewer): vurgu bandı + bento
 *
 * Band: süreç ve talep sahibi, Geri / İleri, başlık, numaralar, durum, olay şeridi. Kaydırınca 64px
 * yapışkan şeride daralır. Bento: solda form (ya da tam tarihçe), sağda özellikler, dokümanlar,
 * tarihçe sekmeleri (geniş ekranda yapışık; 640px altında olaylar altta sabit). Karardan sonra tarihçe
 * açılır; taslakta şerit yerine "Sil" var.
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

  // Konum ve geri dönüş için kutu: rotadaki kutu, yoksa talebin kutusu
  const box = routeBox ?? (r && findBox(r.box))
  useFrame(
    r && process && box
      ? [
          START_CRUMB,
          WF_CRUMB,
          { label: box.title, href: boxLink(box.id) },
          { label: processCaption(process), href: processLink(box.id, process.id) },
          { label: r.no },
        ]
      : [],
    box?.id ?? null,
  )

  if (deleted) return <Navigate to={boxLink('taslaklar')} replace />
  if (!r || !process || !box) return <Navigate to={boxLink(routeBox?.id ?? 'bekleyen')} replace />

  const index = ids.indexOf(r.id)
  const go = (id: string | undefined) => {
    const target = findRequest(id)
    if (target) navigate(requestLink(target), { state: { ids } satisfies DetailNavState })
  }

  return (
    <Viewer
      key={r.id}
      r={r}
      process={process}
      caption={processCaption(process)}
      position={index >= 0 ? `${index + 1} / ${ids.length}` : null}
      prev={index > 0 ? () => go(ids[index - 1]) : undefined}
      next={index >= 0 && index < ids.length - 1 ? () => go(ids[index + 1]) : undefined}
      onClose={() => navigate(processLink(box.id, process.id))}
      onDeleted={() => navigate(boxLink('taslaklar'))}
    />
  )
}

type SideTab = 'props' | 'history' | 'docs'

const SIDE_TABS: { id: SideTab; label: string; icon: LucideIcon }[] = [
  { id: 'props', label: 'Özellikler', icon: Info },
  { id: 'history', label: 'Tarihçe', icon: History },
  { id: 'docs', label: DOCUMENT_LABELS.title, icon: Files },
]

/** Yan panelin sağa katlanma tercihi (geniş ekranda; saklanır). */
const SIDE_KEY = 'synergy-detail-side-v1'

function loadSideCollapsed() {
  try {
    return localStorage.getItem(SIDE_KEY) === '0'
  } catch {
    return false
  }
}

/** Başlık bandı: diğer karolar gibi beyaz, çerçeveli; dolu öğe birincil renkte, çizgili öğe nötr. */
const BAND = cn('bg-surface text-foreground', card)
const ON_BAND = 'bg-accent text-accent-foreground hover:bg-accent/90'
const OUTLINE_ON_BAND = 'border-border bg-surface text-foreground hover:bg-surface-secondary'
/** Kaydırınca beliren şerit: dolu birincil renk; üstünde dolu öğe beyaz, çizgili öğe rengini şeritten alır. */
const STRIP = 'bg-accent text-accent-foreground'
const ON_STRIP = 'bg-accent-foreground text-accent hover:bg-accent-foreground/90'
const OUTLINE_ON_STRIP =
  'border-current/40 bg-transparent text-current hover:bg-accent-foreground/10'
/** Band metni: Typography rengini ezip bandın rengini izler. */
const FAINT = 'text-current! opacity-75'
/** Beyaz karo. */
const TITLE = 'font-display text-lg font-semibold'
const ROW = 'flex flex-wrap items-center gap-2'
const SPLIT = 'flex flex-wrap items-center justify-between gap-3'

function Viewer({
  r,
  process,
  caption,
  position,
  prev,
  next,
  onClose,
  onDeleted,
}: {
  r: WorkRequest
  process: Process
  caption: string
  position: string | null
  prev?: () => void
  next?: () => void
  onClose: () => void
  onDeleted: () => void
}) {
  const documents = documentsOf(r)
  const form = documents.find((d) => d.kind === 'form')!
  const viewed = useViewedDocuments(r.id)
  const events = eventsFor(r)
  const isDraft = r.status === 'Taslak'
  const status = statusColor(r.status)

  const [view, setView] = useState<'form' | 'history'>('form')
  const [activeId, setActiveId] = useState(form.id)
  const [docsWarning, setDocsWarning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [decided, setDecided] = useState<FlowEvent | null>(null)
  const [sideTab, setSideTab] = useState<SideTab>('props')
  const [historyOptions, setHistoryOptions] = useHistoryViewOptions()
  const phone = useMediaQuery('(max-width: 639px)')
  // Yan panel geniş ekranda sağa katlanır; form tam genişliğe yayılır
  const wide = useMediaQuery('(min-width: 1024px)')
  const [sideCollapsed, setSideCollapsed] = useState(loadSideCollapsed)
  const collapsed = wide && sideCollapsed
  const setCollapsed = (v: boolean) => {
    setSideCollapsed(v)
    try {
      localStorage.setItem(SIDE_KEY, v ? '0' : '1')
    } catch {
      // Depolama kapalıysa tercih yalnızca bu oturumda
    }
  }
  const openSide = (tab: SideTab) => {
    setSideTab(tab)
    setCollapsed(false)
  }
  // Vurgu gücü: varsayılan beyaz bant, hafif açık ton, dolu birincil renk (öğeler şerit gibi ters renkte)
  const accent = useLook().accent
  const solid = accent === 'solid'
  const band = solid ? cn(STRIP, card) : accent === 'soft' ? cn(SOFT_BAND, card) : BAND
  const scrolled = useScrolled(220)

  const flow = useKaroFlow(r, {
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

  const side = {
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
        <Box className="flex flex-col gap-3">
          <ScrollShadow className="max-h-104 pe-1">
            <HistoryTimeline r={r} options={historyOptions} compact />
          </ScrollShadow>
          {/* Görünüm seçenekleri (bilgilendirmeler, ham tarih) tam tarihçe düğmesinin yanında */}
          <Box className="flex items-center gap-2">
            <Button variant="secondary" onPress={() => setView('history')} className="flex-1">
              {VIEWER_LABELS.showFullHistory}
            </Button>
            {historyMenu}
          </Box>
        </Box>
      ) : (
        <Typography type="body-sm" color="muted">
          {VIEWER_LABELS.propertiesEmpty}
        </Typography>
      ),
  }

  return (
    <Box className={cn('flex flex-col gap-3', phone && hasActions && 'pb-24')}>
      {/* Kaydırınca: 64px yapışkan şerit (başlık + olaylar) */}
      <Box className="sticky top-2 z-30 -mb-3 h-0">
        <Card
          aria-hidden={!scrolled}
          className={cn(
            STRIP,
            card,
            // Şerit yukarıdan kayarak iner, çıkarken yukarı kaçar
            'absolute inset-x-0 h-16 flex-row items-center gap-4 py-0 transition duration-[calc(320ms*var(--motion-time,1))] ease-[cubic-bezier(0.22,1,0.36,1)]',
            !scrolled && 'pointer-events-none -translate-y-[calc(100%+1rem)] opacity-0',
          )}
        >
          {/* Konu her formda olmayabilir: şeritte süreç adı ve talep numarası */}
          <Box className="min-w-0 flex-1">
            <Typography truncate className={`${TITLE} text-current!`}>
              {caption}
            </Typography>
            <Typography type="body-xs" truncate className={`font-mono ${FAINT}`}>
              {r.no}
            </Typography>
          </Box>
          {!phone && scrolled && <Box className={cn(ROW, 'shrink-0')}>{actions(true)}</Box>}
        </Card>
      </Box>

      {/* --- Band ---------------------------------------------------------------------------- */}
      {/*
       * Başlık bandı: solda süreç ikonu, proje ve süreç adı (sayfa başlığı) ile durum; sağda sıra ve
       * Geri / İleri. Altında olaylar.
       */}
      <Card className={cn(band, 'gap-5 p-6')}>
        <Box className="flex flex-wrap items-start justify-between gap-4">
          <Box className="flex min-w-0 flex-1 items-center gap-4">
            <Box aria-hidden className="grid size-12 shrink-0 place-items-center rounded-2xl bg-current/10">
              <process.icon {...IC} size={22} />
            </Box>
            <Box className="min-w-0">
              <Typography type="body-sm" truncate className={FAINT}>
                {process.project}
              </Typography>
              <Box className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                <Typography.Heading
                  level={1}
                  truncate
                  title={caption}
                  className="min-w-0 font-display text-2xl font-bold text-current! sm:text-[1.75rem]"
                >
                  {isDraft ? process.form : process.name}
                </Typography.Heading>
                <Chip size="sm" variant="primary" color={status}>
                  {r.status}
                </Chip>
              </Box>
            </Box>
          </Box>
          <Box className={ROW}>
            {position && (
              <Typography type="body-sm" className={`font-mono ${FAINT}`}>
                {position}
              </Typography>
            )}
            <NavButton
              label={VIEWER_LABELS.prev}
              icon={ChevronLeft}
              onPress={prev}
              onStrip={solid}
            />
            <NavButton
              label={VIEWER_LABELS.next}
              icon={ChevronRight}
              onPress={next}
              onStrip={solid}
            />
          </Box>
        </Box>

        {/* Şerit göründüğünde bant kopyası erişilebilirlik ağacından çıkar (tek olay grubu) */}
        {hasActions && !phone && (
          <Box
            {...({ inert: scrolled } as Record<string, unknown>)}
            aria-hidden={scrolled || undefined}
            className={ROW}
          >
            {actions(solid)}
          </Box>
        )}
      </Card>

      {/* --- Bento ---------------------------------------------------------------------------- */}
      <Box className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <Card className={cn(card, 'min-w-0 p-6 sm:p-8 lg:flex-1')}>
          {view === 'history' ? (
            // Form ↔ tarihçe geçişinde içerik yeniden belirir
            <Box key="history" className="flex animate-rise flex-col gap-6">
              <Box className={SPLIT}>
                <Box className="flex items-center gap-3">
                  <TintIcon icon={History} />
                  <Typography.Heading level={2} className={TITLE}>
                    {VIEWER_LABELS.history}
                  </Typography.Heading>
                </Box>
                <Box className={ROW}>
                  {historyMenu}
                  <Button variant="secondary" onPress={() => setView('form')}>
                    <FileText {...IC} />
                    {FLOW_TEXT.showForm}
                  </Button>
                </Box>
              </Box>
              <HistoryTimeline r={r} options={historyOptions} />
            </Box>
          ) : active.kind === 'form' ? (
            <FormBody
              r={r}
              form={form}
              files={documents.filter((d) => d.kind === 'file')}
              onOpenFile={openDocument}
            />
          ) : (
            <Box key={active.id} className="animate-rise">
              <FileBody doc={active} onShowForm={() => setActiveId(form.id)} />
            </Box>
          )}
        </Card>

        {/*
         * Yan bilgiler her genişlikte sekmelerde; geniş ekranda kaydırırken yapışık kalır (yapışkan
         * şeridin altında) ve sağa katlanır: katlıyken dar bir rafta sekme ikonları, basınca açılır.
         * Zorunlu doküman uyarısında kart açılır ve sallanır.
         */}
        <Card
          className={cn(
            card,
            'shrink-0 transition-[width,padding] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:top-22',
            collapsed ? 'items-center gap-1 p-2 lg:w-14' : 'p-5 lg:w-[calc((100%-0.5rem)/3)]',
            docsWarning && 'animate-shake ring-2 ring-warning',
          )}
        >
          {collapsed ? (
            <>
              <Tip label="Paneli aç" placement="left">
                <Button
                  isIconOnly
                  variant="ghost"
                  aria-label="Paneli aç"
                  aria-expanded={false}
                  onPress={() => setCollapsed(false)}
                  className="text-muted"
                >
                  <PanelRightOpen {...IC} size={18} />
                </Button>
              </Tip>
              <Separator className="my-1 w-6" />
              {SIDE_TABS.map(({ id, label, icon: Icon }) => (
                <Tip key={id} label={label} placement="left">
                  <Button
                    isIconOnly
                    variant="ghost"
                    aria-label={label}
                    onPress={() => openSide(id)}
                    className={cn(id === sideTab && 'bg-accent-soft text-accent-soft-foreground')}
                  >
                    <Icon {...IC} size={18} />
                  </Button>
                </Tip>
              ))}
            </>
          ) : (
            <Tabs
              selectedKey={sideTab}
              onSelectionChange={(key) => setSideTab(key as SideTab)}
              className="min-w-0 animate-[fade-in_calc(0.3s*var(--motion-time,1))_ease-out_both]"
            >
              <Box className="flex items-center gap-2">
                <Tabs.ListContainer className="min-w-0 flex-1">
                  <Tabs.List aria-label="Ayrıntılar" className="w-full">
                    {SIDE_TABS.map(({ id, label }) => (
                      <Tabs.Tab
                        key={id}
                        id={id}
                        className="flex-1 whitespace-nowrap data-[selected=true]:text-accent-foreground"
                      >
                        <Tabs.Indicator className="bg-accent" />
                        {label}
                      </Tabs.Tab>
                    ))}
                  </Tabs.List>
                </Tabs.ListContainer>
                {wide && (
                  <Tip label="Paneli katla" placement="left">
                    <Button
                      isIconOnly
                      size="sm"
                      variant="ghost"
                      aria-label="Paneli katla"
                      aria-expanded
                      onPress={() => setCollapsed(true)}
                      className="shrink-0 text-muted"
                    >
                      <PanelRightClose {...IC} size={18} />
                    </Button>
                  </Tip>
                )}
              </Box>
              {SIDE_TABS.map(({ id }) => (
                <Tabs.Panel key={id} id={id} className="mt-2 animate-rise p-0">
                  {side[id]}
                </Tabs.Panel>
              ))}
            </Tabs>
          )}
        </Card>
      </Box>

      {/* Telefonda olay şeridi altta sabit */}
      {phone && hasActions && (
        <Card
          className={cn(band, ROW, card, 'fixed inset-x-3 bottom-3 z-30 animate-rise flex-row p-3')}
        >
          {actions(solid)}
        </Card>
      )}

      {flow.element}
      <KaroConfirm
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
    </Box>
  )
}

/** Karar çipinin halka rengi (durum rengi; nötr sonuçta birincil). */
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
        {/* Karar sonucu: çip sıçrayarak gelir, çevresinde halka yayılır, ikon çizilir */}
        <Chip
          variant="primary"
          color={color}
          className={cn(
            'animate-[pop_calc(0.42s*var(--motion-time,1))_cubic-bezier(0.34,1.56,0.64,1)_both,halo_calc(1.1s*var(--motion-time,1))_ease-out_0.2s_both]',
            HALO[color],
            color === 'default' && on,
          )}
        >
          <decided.icon
            {...IC}
            size={14}
            className="[&_*]:[stroke-dasharray:48] [&_*]:animate-draw"
          />
          <Chip.Label>{decided.description}</Chip.Label>
        </Chip>
        {onNext && (
          <Button onPress={onNext} className={on}>
            {VIEWER_LABELS.next}
            <ChevronRight {...IC} />
          </Button>
        )}
        <Button variant="outline" onPress={onClose} className={outline}>
          <X {...IC} />
          Kapat
        </Button>
      </>
    )
  }
  if (isDraft)
    return (
      <Button variant="outline" onPress={onDelete} className={outline}>
        <Trash2 {...IC} />
        {FLOW_TEXT.delete}
      </Button>
    )
  return (
    <Box role="group" aria-label="Olaylar" className={ROW}>
      {events.map(({ id, icon: Icon, kind, description, enable, default: isDefault }) => (
        <Button
          key={id}
          variant={isDefault ? 'primary' : 'outline'}
          isDisabled={!enable}
          onPress={() => onRun(id)}
          className={isDefault ? on : outline}
        >
          {kind === 'reject' ? (
            <Avatar aria-hidden className="size-5">
              <Avatar.Fallback className="bg-danger text-danger-foreground">
                <Icon {...IC} size={14} />
              </Avatar.Fallback>
            </Avatar>
          ) : (
            <Icon {...IC} />
          )}
          {description}
        </Button>
      ))}
    </Box>
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
        isIconOnly
        variant="outline"
        aria-label={label}
        isDisabled={!onPress}
        onPress={onPress}
        className={onStrip ? OUTLINE_ON_STRIP : OUTLINE_ON_BAND}
      >
        <Icon {...IC} size={18} />
      </Button>
    </Tip>
  )
}
