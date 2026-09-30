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
import { Avatar, Button, Card, Divider, Flex, Tabs, Tag, Typography } from 'antd'
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
import { START_CRUMB, WF_CRUMB, boxLink, processLink, requestLink, useFrame } from '@/synergy/paths'
import { useBand } from '@/synergy/ant/parts'
import { CARD, cn, IC, Scroll, TintIcon, Tip } from '@/synergy/ant/ui'
import { ConfirmDialog, useFlow } from '@/synergy/flow'
import { useMediaQuery, useScrolled } from '@/synergy/shared/hooks'
import { FormTabs, usePaneNarrow, useTabScroller } from '@/synergy/FormTabs'
import {
  DocumentsList,
  FileBody,
  FormBody,
  HistoryTimeline,
  HistoryViewMenu,
  PropertiesList,
} from '@/synergy/DetailTiles'

/* -------------------------------------------------------------------------------------------------
 * Talep ayrıntısı (Flow Viewer), antd: vurgu bandı + bento
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
  const go = (id: string | undefined) => {
    const target = findRequest(id)
    if (target) navigate(requestLink(target), { state: { ids } satisfies DetailNavState })
  }

  // Form sekmeleri talebe bağlı: Geri / İleri ile talep değişince yeniden kurulur
  return (
    <FormTabs
      key={r.id}
      rootId={r.id}
      root={
        <Viewer
          r={r}
          process={process}
          caption={processCaption(process)}
          position={index >= 0 ? `${index + 1} / ${ids.length}` : null}
          prev={index > 0 ? () => go(ids[index - 1]) : undefined}
          next={index >= 0 && index < ids.length - 1 ? () => go(ids[index + 1]) : undefined}
          onClose={() => navigate(processLink(box.id, process.id))}
          onDeleted={() => navigate(boxLink('taslaklar'))}
        />
      }
      renderTab={(id, close) => <ChildViewer id={id} onClose={close} />}
    />
  )
}

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
      position={null}
      onClose={onClose}
      onDeleted={onClose}
      isChild
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
  position,
  prev,
  next,
  onClose,
  onDeleted,
  isChild = false,
}: {
  r: WorkRequest
  process: Process
  caption: string
  position: string | null
  prev?: () => void
  next?: () => void
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
  // Yan yana bölmede panel katlı başlar (bölme dar); açılırsa yalnızca bu bölmede açık kalır
  const narrow = usePaneNarrow()
  const [openInPane, setOpenInPane] = useState(false)
  const collapsed = narrow ? !openInPane : wide && sideCollapsed
  const setCollapsed = (v: boolean) => {
    if (narrow) {
      setOpenInPane(!v)
      return
    }
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
  // Vurgu gücü (tema paneli): varsayılanda beyaz bant; koyu zeminli bantlarda öğeler şerit gibi ters renkte
  const bandStyle = useBand('record')
  const solid = !bandStyle.light
  const band = cn(CARD, bandStyle.band)
  const scrolled = useScrolled(220, useTabScroller())

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
              onClick={() => setView('history')}
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
       * Başlık bandı: solda süreç ikonu, proje ve süreç adı (sayfa başlığı) ile durum; sağda sıra ve
       * Geri / İleri. Altında olaylar.
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
              {position && (
                <Typography.Text className={`font-mono text-sm ${FAINT}`}>
                  {position}
                </Typography.Text>
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
      <Flex vertical className="gap-3 lg:flex-row lg:items-start">
        <Card className={cn(CARD, 'min-w-0 lg:flex-1')} classNames={{ body: 'p-6 sm:p-8' }}>
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

        {/*
         * Yan bilgiler her genişlikte sekmelerde; geniş ekranda kaydırırken yapışık kalır (yapışkan
         * şeridin altında) ve sağa katlanır: katlıyken dar bir rafta sekme ikonları, basınca açılır.
         * Zorunlu doküman uyarısında kart açılır ve sallanır.
         */}
        <Card
          className={cn(
            CARD,
            'shrink-0 transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:sticky lg:top-22',
            collapsed ? 'lg:w-14' : 'lg:w-[calc((100%-0.5rem)/3)]',
            docsWarning && 'animate-shake ring-2 ring-warning',
          )}
          classNames={{
            body: collapsed
              ? 'flex flex-col items-center gap-1 p-2'
              : 'p-5 pt-2 animate-[fade-in_calc(0.3s*var(--motion-time,1))_ease-out_both]',
          }}
        >
          {collapsed ? (
            <>
              <Tip label="Paneli aç" placement="left">
                <Button
                  type="text"
                  aria-label="Paneli aç"
                  aria-expanded={false}
                  icon={<PanelRightOpen {...IC} size={18} />}
                  onClick={() => setCollapsed(false)}
                  className="text-muted"
                />
              </Tip>
              <Divider className="my-1 w-6 min-w-0" />
              {SIDE_TABS.map(({ id, label, icon: Icon }) => (
                <Tip key={id} label={label} placement="left">
                  <Button
                    type="text"
                    aria-label={label}
                    icon={<Icon {...IC} size={18} />}
                    onClick={() => openSide(id)}
                    className={cn(
                      id === sideTab &&
                        'bg-accent/12! text-accent-soft-foreground! hover:bg-accent/18!',
                    )}
                  />
                </Tip>
              ))}
            </>
          ) : (
            <Tabs
              activeKey={sideTab}
              onChange={(key) => setSideTab(key as SideTab)}
              animated={{ inkBar: true, tabPane: true }}
              tabBarExtraContent={
                wide && (
                  <Tip label="Paneli katla" placement="left">
                    <Button
                      type="text"
                      size="small"
                      aria-label="Paneli katla"
                      aria-expanded
                      icon={<PanelRightClose {...IC} size={18} />}
                      onClick={() => setCollapsed(true)}
                      className="ms-2 text-muted"
                    />
                  </Tip>
                )
              }
              // Sekmeler şeridi eşit paylaşır; içerik kabı yanlara halka kadar (0.75rem) taşar:
              // tarihçedeki nabız halkası kesilmesin
              classNames={{
                header: 'mb-3 [&_.ant-tabs-nav-list]:w-full',
                item: 'm-0 flex-1 justify-center',
                body: '-mx-[0.75rem] px-[0.75rem]',
              }}
              items={SIDE_TABS.map(({ id, label }) => ({ key: id, label, children: side[id] }))}
            />
          )}
        </Card>
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
