import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { ChevronLeft, ChevronRight, CircleCheckBig, FileText, Trash2, X, Zap } from 'lucide-react'
import { Avatar, Button, Card, Chip, ScrollShadow, Separator, Tabs, Tooltip, Typography, cn } from '@heroui/react'
import { deleteDraft, markDocumentViewed, markRead, useBoxRequests, useRequest, useViewedDocuments } from '@/synergy/shared/decisions'
import {
  DELETE_CONFIRM,
  DOCUMENT_LABELS,
  VIEWER_LABELS,
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
import { FLOW_TEXT } from '@/synergy/shared/flowLabels'
import { toneOf } from '@/synergy/shared/pipeline'
import { timeOf } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { START_CRUMB, WF_CRUMB, boxLink, processLink, requestLink, useCrumbs } from '@/synergy/v2/paths'
import { DISPLAY, FILL, TINT, IC, IconTile, PANEL, Tip, useHero } from '@/synergy/v2/parts'
import { Confirm, useBentoFlow } from '@/synergy/v2/flow'
import { DocumentsList, FileDocument, FormDocument, HistoryLedger, HistoryViewMenu, PropertiesLedger } from '@/synergy/v2/DetailTiles'

/* -------------------------------------------------------------------------------------------------
 * Bento · Talep ayrıntısı (Flow Viewer)
 *
 * Bento: üst sırada açık tonlu başlık karosu (durum, numaralar, konu, talep eden; köşede konum ve
 * Geri / İleri) ve açık tonlu olay karosu (düğmeler alt alta; karardan sonra sonuç / İleri /
 * Kapat; taslakta "Sil"). Alt sırada form karosu (form, ek ya da tam tarihçe) ve kaydırırken yapışık
 * Özellikler / Tarihçe / Dokümanlar karosu. Dar ekranda sekme karosu formun üstünde.
 * ------------------------------------------------------------------------------------------------- */

export function BentoDetail() {
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
  const [fallbackIds] = useState(() => siblings.filter((x) => x.processId === params.processId).map((x) => x.id))
  const ids = (location.state as DetailNavState | null)?.ids ?? fallbackIds

  // Konum ve geri dönüş için kutu: rotadaki kutu, yoksa talebin kutusu
  const box = routeBox ?? (r && findBox(r.box))
  useCrumbs(
    r && process && box
      ? [START_CRUMB, WF_CRUMB, { label: box.title, href: boxLink(box.id) }, { label: processCaption(process), href: processLink(box.id, process.id) }, { label: r.no }]
      : [],
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
      position={index >= 0 ? `${index + 1} / ${ids.length}` : null}
      prev={index > 0 ? () => go(ids[index - 1]) : undefined}
      next={index >= 0 && index < ids.length - 1 ? () => go(ids[index + 1]) : undefined}
      onClose={() => navigate(processLink(box.id, process.id))}
      onDeleted={() => navigate(boxLink('taslaklar'))}
    />
  )
}

type SideTab = 'props' | 'history' | 'docs'

function Viewer({
  r,
  position,
  prev,
  next,
  onClose,
  onDeleted,
}: {
  r: WorkRequest
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
  const { hero, glass, fill } = useHero()
  const statusDot = r.status === 'Tamamlandı' ? 'bg-success' : r.status === 'Reddedildi' ? 'bg-danger' : r.status === 'Taslak' ? 'bg-muted' : 'bg-warning'

  const [view, setView] = useState<'form' | 'history'>('form')
  const [activeId, setActiveId] = useState(form.id)
  const [docsWarning, setDocsWarning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [decided, setDecided] = useState<FlowEvent | null>(null)
  const [sideTab, setSideTab] = useState<SideTab>('props')
  const [historyOptions, setHistoryOptions] = useHistoryViewOptions()

  const flow = useBentoFlow(r, {
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

  const side: Record<SideTab, ReactNode> = {
    props: <PropertiesLedger items={propertiesOf(r)} />,
    docs: <DocumentsList documents={documents} viewed={viewed} activeId={active.id} showWarning={docsWarning} onOpen={openDocument} />,
    history:
      r.history.length > 0 ? (
        <Box className="flex flex-col gap-4">
          <Box className="flex justify-end">{historyMenu}</Box>
          <ScrollShadow className="max-h-112 pe-1">
            <HistoryLedger r={r} options={historyOptions} compact />
          </ScrollShadow>
          <Button variant="outline" fullWidth onPress={() => setView('history')}>
            {VIEWER_LABELS.showFullHistory}
          </Button>
        </Box>
      ) : (
        <Typography type="body-sm" color="muted">
          {VIEWER_LABELS.propertiesEmpty}
        </Typography>
      ),
  }

  const tabs = [
    ['props', 'Özellikler'],
    ['history', 'Tarihçe'],
    ['docs', DOCUMENT_LABELS.title],
  ] as const

  return (
    <Box className="flex flex-col gap-4">
      {/* --- Üst sıra: açık tonlu başlık karosu + olay karosu ----------------------------------- */}
      <Box className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card
          className={cn(
            'relative min-h-60 justify-between gap-6 overflow-hidden rounded-3xl p-6 sm:p-7',
            hasActions ? 'lg:col-span-8' : 'lg:col-span-12',
            hero,
          )}
        >
          <Box className="relative flex flex-wrap items-center justify-between gap-3">
            <Box className="flex flex-wrap items-center gap-2">
              <Chip className={cn('gap-1.5 rounded-full px-3', glass)}>
                <Box aria-hidden className={cn('size-1.5 rounded-full', statusDot)} />
                <Chip.Label className="text-xs font-semibold">{r.status}</Chip.Label>
              </Chip>
              <Chip className={cn('rounded-full px-3 font-mono text-xs', glass)}>{r.no}</Chip>
              <Chip className={cn('rounded-full px-3 text-xs', glass)}>
                {FLOW_TEXT.processNo} <Text className="font-mono text-xs text-current">{r.processNo}</Text>
              </Chip>
            </Box>
            <Box className="flex items-center gap-1.5">
              {position && <Text className="me-1 font-mono text-xs text-current opacity-80">{position}</Text>}
              <NavButton label={VIEWER_LABELS.prev} icon={ChevronLeft} onPress={prev} />
              <NavButton label={VIEWER_LABELS.next} icon={ChevronRight} onPress={next} />
            </Box>
          </Box>
          <Box className="relative flex flex-col gap-3">
            <Typography.Heading level={1} data-item-title className={cn(DISPLAY, 'text-3xl leading-tight text-balance text-current! sm:text-4xl')}>
              {r.template.title}
            </Typography.Heading>
            <Box className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <Box className="flex min-w-0 items-center gap-2">
                <Avatar size="sm" aria-hidden className="size-7">
                  <Avatar.Fallback className={cn('text-[0.625rem] font-bold', fill)}>{initials(r.requester.name)}</Avatar.Fallback>
                </Avatar>
                <Text truncate className="text-sm text-current">
                  {r.requester.name} · <Text className="text-sm text-current opacity-75">{r.requester.department}</Text>
                </Text>
              </Box>
              <Tip label={formatDateTime(when)}>
                <Tooltip.Trigger>
                  <Text {...timeOf(when)} className="text-sm text-current opacity-75">
                    {relative(when)}
                  </Text>
                </Tooltip.Trigger>
              </Tip>
            </Box>
          </Box>
        </Card>

        {hasActions && (
          <Card role="region" aria-label="Olaylar" className={cn(PANEL, TINT, 'justify-between gap-4 p-5 lg:col-span-4')}>
            <Box className="flex items-center gap-3">
              <IconTile icon={decided ? CircleCheckBig : Zap} solid />
              <Typography.Heading level={2} className={cn(DISPLAY, 'text-lg')}>
                {decided ? 'Sonuç' : 'Olaylar'}
              </Typography.Heading>
            </Box>
            <Actions events={events} isDraft={isDraft} decided={decided} onRun={(id) => flow.run(id)} onDelete={() => setConfirmDelete(true)} onNext={next} onClose={onClose} />
          </Card>
        )}
      </Box>

      {/* --- Alt sıra: form karosu + sekme karosu (kaydırırken yapışık) ---------------------------- */}
      <Box className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
        <Card className={cn(PANEL, 'min-w-0 p-6 sm:p-8 lg:col-span-8')}>
          {view === 'history' ? (
            <Box className="flex flex-col gap-6">
              <Box className="flex flex-wrap items-center justify-between gap-3">
                <Typography.Heading level={2} className={cn(DISPLAY, 'text-xl')}>
                  {VIEWER_LABELS.history}
                </Typography.Heading>
                <Box className="flex items-center gap-2">
                  {historyMenu}
                  <Button variant="outline" onPress={() => setView('form')} className="rounded-full">
                    <FileText {...IC} />
                    {FLOW_TEXT.showForm}
                  </Button>
                </Box>
              </Box>
              <HistoryLedger r={r} options={historyOptions} />
            </Box>
          ) : active.kind === 'form' ? (
            <FormDocument r={r} form={form} files={documents.filter((d) => d.kind === 'file')} onOpenFile={openDocument} />
          ) : (
            <FileDocument doc={active} onShowForm={() => setActiveId(form.id)} />
          )}
        </Card>

        <Card className={cn(PANEL, 'order-first gap-0 lg:sticky lg:top-20 lg:order-none lg:col-span-4', docsWarning && 'border-warning ring-2 ring-warning/40')}>
          <Tabs selectedKey={sideTab} onSelectionChange={(key) => setSideTab(key as SideTab)} className="gap-0">
            <Box className="p-3">
              <Tabs.ListContainer>
                <Tabs.List aria-label="Ayrıntılar" className="w-full rounded-full">
                  {tabs.map(([id, label]) => (
                    <Tabs.Tab key={id} id={id} className="flex-1 rounded-full text-xs font-semibold data-[selected=true]:text-accent-foreground">
                      <Tabs.Indicator className={cn('rounded-full', FILL)} />
                      {label}
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </Box>
            <Separator />
            {tabs.map(([id]) => (
              <Tabs.Panel key={id} id={id} className="mt-0 p-5">
                {side[id]}
              </Tabs.Panel>
            ))}
          </Tabs>
        </Card>
      </Box>

      {flow.element}
      <Confirm
        isOpen={confirmDelete}
        tone="danger"
        label={FLOW_TEXT.delete}
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

/** Olaylar alt alta tam genişlikte; taslakta "Sil"; karardan sonra sonuç, İleri / Kapat. */
function Actions({
  events,
  isDraft,
  decided,
  onRun,
  onDelete,
  onNext,
  onClose,
}: {
  events: FlowEvent[]
  isDraft: boolean
  decided: FlowEvent | null
  onRun: (id: number) => void
  onDelete: () => void
  onNext?: () => void
  onClose: () => void
}) {
  if (decided) {
    const tone = toneOf(decided.kind)
    const color = tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : 'accent'
    return (
      <Box className="flex flex-col gap-2">
        <Chip variant="soft" color={color} className="h-9 w-full justify-center gap-2 rounded-lg">
          <Box aria-hidden className="size-1.5 rounded-full bg-current" />
          <Chip.Label className="text-sm font-medium">{decided.description}</Chip.Label>
        </Chip>
        {onNext && (
          <Button variant="primary" fullWidth onPress={onNext} className={FILL}>
            {VIEWER_LABELS.next}
            <ChevronRight {...IC} />
          </Button>
        )}
        <Button variant="outline" fullWidth onPress={onClose}>
          <X {...IC} />
          Kapat
        </Button>
      </Box>
    )
  }
  if (isDraft)
    return (
      <Button variant="outline" fullWidth onPress={onDelete} className="text-danger">
        <Trash2 {...IC} />
        {FLOW_TEXT.delete}
      </Button>
    )
  return (
    <Box role="group" aria-label="Olaylar" className="flex flex-col gap-2">
      {events.map(({ id, icon: Icon, kind, description, enable, default: isDefault }) => (
        <Button
          key={id}
          variant={isDefault ? 'primary' : 'outline'}
          fullWidth
          isDisabled={!enable}
          onPress={() => onRun(id)}
          className={cn('justify-start', isDefault ? FILL : 'bg-surface', !isDefault && (kind === 'reject' || kind === 'sendBack') && 'text-danger')}
        >
          <Icon {...IC} />
          {description}
        </Button>
      ))}
    </Box>
  )
}

function NavButton({ label, icon: Icon, onPress }: { label: string; icon: LucideIcon; onPress?: () => void }) {
  const { glass } = useHero()
  return (
    <Tip label={label} placement="bottom">
      <Button
        isIconOnly
        size="sm"
        aria-label={label}
        isDisabled={!onPress}
        onPress={onPress}
        className={cn('rounded-full', glass)}
      >
        <Icon {...IC} />
      </Button>
    </Tip>
  )
}
