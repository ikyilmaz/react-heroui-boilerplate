import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { ChevronLeft, ChevronRight, FileText, History, Trash2, X } from 'lucide-react'
import { Avatar, Button, Card, Chip, ScrollShadow, Tabs, Tooltip, Typography, cn } from '@heroui/react'
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
  avatarColor,
  documentsOf,
  eventsFor,
  findBox,
  findProcess,
  findRequest,
  formatDateTime,
  initials,
  processCaption,
  propertiesOf,
  relative,
  type BoxId,
  type DetailNavState,
  type FlowDocument,
  type FlowEvent,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import { useHistoryViewOptions } from '@/synergy/shared/historyView'
import { FLOW_TEXT, statusColor } from '@/synergy/shared/flowLabels'
import { card, timeOf } from '@/synergy/shared/tokens'
import { Box } from '@/synergy/shared/ui'
import { START_CRUMB, WF_CRUMB, boxLink, processLink, requestLink, useFrame } from '@/synergy/v1/paths'
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

/** Başlık bandı: diğer karolar gibi beyaz, çerçeveli; dolu öğe birincil renkte, çizgili öğe nötr. */
const BAND = cn('bg-surface text-foreground', card)
const ON_BAND = 'bg-accent text-accent-foreground hover:bg-accent/90'
const OUTLINE_ON_BAND = 'border-border bg-surface text-foreground hover:bg-surface-secondary'
/** Kaydırınca beliren şerit: dolu birincil renk; üstünde dolu öğe beyaz, çizgili öğe rengini şeritten alır. */
const STRIP = 'bg-accent text-accent-foreground'
const ON_STRIP = 'bg-accent-foreground text-accent hover:bg-accent-foreground/90'
const OUTLINE_ON_STRIP = 'border-current/40 bg-transparent text-current hover:bg-accent-foreground/10'
/** Band metni: Typography rengini ezip bandın rengini izler. */
const FAINT = 'text-current! opacity-75'
/** Beyaz karo. */
const TITLE = 'font-display text-lg font-semibold'
const ROW = 'flex flex-wrap items-center gap-2'
const SPLIT = 'flex flex-wrap items-center justify-between gap-3'

function Viewer({
  r,
  caption,
  position,
  prev,
  next,
  onClose,
  onDeleted,
}: {
  r: WorkRequest
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
  const when = isDraft ? r.createdAt : r.requestDate
  const status = statusColor(r.status)

  const [view, setView] = useState<'form' | 'history'>('form')
  const [activeId, setActiveId] = useState(form.id)
  const [docsWarning, setDocsWarning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [decided, setDecided] = useState<FlowEvent | null>(null)
  const [sideTab, setSideTab] = useState<SideTab>('props')
  const [historyOptions, setHistoryOptions] = useHistoryViewOptions()
  const phone = useMediaQuery('(max-width: 639px)')
  // Vurgu gücü: varsayılan beyaz bant, hafif açık ton, dolu birincil renk (öğeler şerit gibi ters renkte)
  const accent = useLook().accent
  const solid = accent === 'solid'
  const band = solid ? cn(STRIP, card) : accent === 'soft' ? cn(SOFT_BAND, card) : BAND
  const scrolled = useScrolled(220)

  const flow = useKaroFlow(r, {
    onDocsRequired: () => {
      setDocsWarning(true)
      setSideTab('docs')
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
          <Button variant="secondary" fullWidth onPress={() => setView('history')}>
            {VIEWER_LABELS.showFullHistory}
          </Button>
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
            'absolute inset-x-0 h-16 flex-row items-center gap-4 py-0 transition',
            !scrolled && 'pointer-events-none -translate-y-3 opacity-0',
          )}
        >
          <Typography truncate data-item-title className={`${TITLE} flex-1 text-current!`}>
            {r.template.title}
          </Typography>
          {!phone && scrolled && <Box className={cn(ROW, 'shrink-0')}>{actions(true)}</Box>}
        </Card>
      </Box>

      {/* --- Band ---------------------------------------------------------------------------- */}
      <Card className={cn(band, 'gap-5 p-6')}>
        <Box className={SPLIT}>
          <Box className="flex min-w-0 items-center gap-3">
            <Avatar size="sm" color={avatarColor(r.requester.name)} aria-hidden>
              <Avatar.Fallback>{initials(r.requester.name)}</Avatar.Fallback>
            </Avatar>
            <Box className="min-w-0">
              <Typography type="body-sm" weight="medium" truncate className="text-current!">
                {caption}
              </Typography>
              <Typography type="body-xs" truncate className={FAINT}>
                {r.requester.name} · {r.requester.department}
              </Typography>
            </Box>
          </Box>
          <Box className={ROW}>
            {position && (
              <Typography type="body-sm" className={`font-mono ${FAINT}`}>
                {position}
              </Typography>
            )}
            <NavButton label={VIEWER_LABELS.prev} icon={ChevronLeft} onPress={prev} onStrip={solid} />
            <NavButton label={VIEWER_LABELS.next} icon={ChevronRight} onPress={next} onStrip={solid} />
          </Box>
        </Box>

        <Box className="flex flex-col gap-2">
          <Typography.Heading
            level={1}
            data-item-title
            className="font-display text-3xl font-bold text-current!"
          >
            {r.template.title}
          </Typography.Heading>
          <Box className={ROW}>
            <Typography type="body-sm" weight="medium" data-item-title className={`font-mono ${FAINT}`}>
              {r.no} · {FLOW_TEXT.processNo} {r.processNo}
            </Typography>
            <Chip size="sm" variant="primary" color={status}>
              {r.status}
            </Chip>
            <Tip label={formatDateTime(when)}>
              <Tooltip.Trigger>
                <Typography type="body-sm" {...timeOf(when)} className={FAINT}>
                  {relative(when)}
                </Typography>
              </Tooltip.Trigger>
            </Tip>
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
      <Box className="grid grid-cols-1 items-start gap-3 lg:grid-cols-12">
        <Card className={cn(card, 'p-6 sm:p-8 lg:col-span-8')}>
          {view === 'history' ? (
            <Box className="flex flex-col gap-6">
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
            <FileBody doc={active} onShowForm={() => setActiveId(form.id)} />
          )}
        </Card>

        {/* Yan bilgiler her genişlikte sekmelerde; geniş ekranda kaydırırken yapışık kalır (yapışkan şeridin altında) */}
        <Card className={cn(card, 'p-5 lg:sticky lg:top-22 lg:col-span-4', docsWarning && 'ring-2 ring-warning')}>
          <Tabs selectedKey={sideTab} onSelectionChange={(key) => setSideTab(key as SideTab)}>
            <Box className="flex items-center gap-2">
              <Tabs.ListContainer className="min-w-0 flex-1">
                <Tabs.List aria-label="Ayrıntılar" className="w-full">
                  {(
                    [
                      ['props', 'Özellikler'],
                      ['history', 'Tarihçe'],
                      ['docs', DOCUMENT_LABELS.title],
                    ] as const
                  ).map(([id, label]) => (
                    <Tabs.Tab key={id} id={id} className="flex-1 data-[selected=true]:text-accent-foreground">
                      <Tabs.Indicator className="bg-accent" />
                      {label}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
              {sideTab === 'history' && <Box className="shrink-0">{historyMenu}</Box>}
            </Box>
            {(['props', 'history', 'docs'] as const).map((id) => (
              <Tabs.Panel key={id} id={id} className="mt-2 p-0">
                {side[id]}
              </Tabs.Panel>
            ))}
          </Tabs>
        </Card>
      </Box>

      {/* Telefonda olay şeridi altta sabit */}
      {phone && hasActions && (
        <Card className={cn(band, ROW, card, 'fixed inset-x-3 bottom-3 z-30 flex-row p-3')}>
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
    const color = k === 'approve' ? 'success' : k === 'reject' || k === 'sendBack' ? 'danger' : 'default'
    return (
      <>
        <Chip variant="primary" color={color} className={color === 'default' ? on : undefined}>
          {decided.description}
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

function NavButton({ label, icon: Icon, onPress, onStrip }: { label: string; icon: LucideIcon; onPress?: () => void; onStrip?: boolean }) {
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
