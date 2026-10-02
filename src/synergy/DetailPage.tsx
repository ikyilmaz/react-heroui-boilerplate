import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router'
import type { LucideIcon } from 'lucide-react'
import { ChevronLeft, ChevronRight, FileText, History, Trash2, X } from 'lucide-react'
import { Avatar, Button, Card, Flex, Pagination, Popover, Tag, Typography } from 'antd'
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
import { CARD, cn, IC, MotionFlex, Scroll, TintIcon, Tip } from '@/synergy/ant/ui'
import { useTransition } from '@/synergy/motion'
import { ConfirmDialog, useFlow } from '@/synergy/flow'
import { useMediaQuery, useScrolled } from '@/synergy/shared/hooks'
import { FormTabs, useTabScroller } from '@/synergy/FormTabs'
import { SidePanel, useSidePanel, type SideTab, type SideTarget } from '@/synergy/DetailSide'
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
 * Band: süreç ve talep sahibi, Geri / İleri (aralarında süreç şeridi), başlık, numaralar, durum, olay
 * şeridi. Kaydırınca 64px yapışkan şeride daralır. Bento: solda form (ya da tam tarihçe), sağda yan
 * bilgiler: Dokümanlar kartı ve Özellikler / Tarihçe kartı (DetailSide.tsx; bölme genişliğine göre
 * sütun ya da raf + çekmece, telefonda altta). 640px altında olaylar altta sabit. Karardan sonra
 * tarihçe açılır; taslakta şerit yerine "Sil" var.
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
  const go = (id: string) => {
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
          nav={index >= 0 ? { ids, index, go } : undefined}
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
      onClose={onClose}
      onDeleted={onClose}
      isChild
    />
  )
}

/** Listeden açılan talebin gezinmesi: listedeki talepler, açık olanın sırası ve geçiş. */
interface DetailNav {
  ids: string[]
  index: number
  go: (id: string) => void
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
              {nav && nav.ids.length > 1 && <NavTrail nav={nav} onStrip={solid} />}
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

/** Süreç şeridinin sayfa boyu: çizgiler ve açılır liste aynı sayfayı gösterir. */
const TRAIL_PAGE = 8

/**
 * Geri / İleri arasındaki süreç şeridi (yüzen içindekiler, yatay): listedeki her süreç kısa bir
 * çizgi, açık olan uzun ve birincil renkte. Üstüne gelince (ya da basınca) süreçler açılır listede;
 * satıra basınca o talebe gidilir. Uzun listede sayfalı: çizgiler listenin gösterdiği sayfayı izler,
 * liste kapanınca açık talebin sayfasına döner. Liste şeridin hemen ardında takılı (Sekme ile içine
 * geçilir); Esc ya da dışarı odaklanma kapatır.
 */
function NavTrail({ nav, onStrip }: { nav: DetailNav; onStrip: boolean }) {
  const { ids, index, go } = nav
  const home = Math.floor(index / TRAIL_PAGE) + 1
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(home)
  // Listede üstüne gelinen (ya da odaklanan) satırın çizgisi belirginleşir
  const [hovered, setHovered] = useState<string | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const transition = useTransition()

  const from = (page - 1) * TRAIL_PAGE
  const shown = ids.slice(from, from + TRAIL_PAGE)
  // Son sayfa kısa kalsa da şerit ve liste boyu sabit: boş yuvalar görünmez (çizgilerde iki yanda)
  const size = Math.min(ids.length, TRAIL_PAGE)
  const slots = Array.from({ length: size }, (_, i) => shown[i])
  const lead = Math.floor((size - shown.length) / 2)
  const ticks = Array.from({ length: size }, (_, i) => shown[i - lead])
  const current = ids[index]

  const toggle = (v: boolean) => {
    setOpen(v)
    if (v) return
    setPage(home)
    setHovered(null)
  }
  const close = () => {
    toggle(false)
    trigger.current?.focus()
  }

  const list = (
    <Flex
      vertical
      gap={2}
      role="dialog"
      aria-label={VIEWER_LABELS.processes}
      className="w-80 max-w-[calc(100vw-2rem)]"
    >
      {slots.map((id, i) => {
        const x = id ? findRequest(id) : undefined
        const active = !!x && id === current
        return (
          // Boş yuva görünmez satır: sayfa düğmeleri imlecin altından kaçmaz
          <Button
            key={id ?? `slot-${i}`}
            type="text"
            aria-current={active ? 'page' : undefined}
            onClick={() => (active ? close() : id && go(id))}
            onMouseEnter={() => setHovered(id ?? null)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(id ?? null)}
            onBlur={() => setHovered(null)}
            className={cn(
              'h-auto w-full justify-start gap-3 rounded-xl! px-2 py-1.5 text-start font-normal hover:bg-surface-secondary!',
              active
                ? 'text-accent-soft-foreground hover:text-accent-soft-foreground!'
                : 'text-foreground hover:text-foreground!',
              !x && 'invisible',
            )}
          >
            <Typography.Text className="w-5 shrink-0 text-end font-mono text-xs text-current tabular-nums opacity-60">
              {from + i + 1}
            </Typography.Text>
            <Flex vertical className="min-w-0 flex-1">
              <Typography.Text
                className={cn('truncate text-sm text-current', active && 'font-medium')}
              >
                {x?.template.title ?? '\u00a0'}
              </Typography.Text>
              <Typography.Text className="truncate text-xs text-current opacity-60">
                {x ? (
                  <>
                    <Typography.Text className="font-mono text-xs text-current">
                      {x.no}
                    </Typography.Text>
                    {' · '}
                    {x.requester.name}
                  </>
                ) : (
                  '\u00a0'
                )}
              </Typography.Text>
            </Flex>
          </Button>
        )
      })}
      {ids.length > TRAIL_PAGE && (
        <Flex
          align="center"
          justify="space-between"
          gap={8}
          className="mt-1 border-t border-border px-1 pt-2"
        >
          <Typography.Text type="secondary" className="font-mono text-xs tabular-nums">
            {from + 1}–{from + shown.length} / {ids.length}
          </Typography.Text>
          <Pagination
            size="small"
            aria-label="Sayfalar"
            current={page}
            total={ids.length}
            pageSize={TRAIL_PAGE}
            showSizeChanger={false}
            onChange={(p) => {
              setPage(p)
              setHovered(null)
            }}
            className="font-mono"
          />
        </Flex>
      )}
    </Flex>
  )

  return (
    // Liste bu kabın içine takılır: odak şeritten listeye geçince kapanmaz
    <Flex
      className="inline-flex"
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return
        e.stopPropagation()
        close()
      }}
      onBlur={(e) => {
        const to = e.relatedTarget
        if (open && to && !e.currentTarget.contains(to)) toggle(false)
      }}
    >
      <Popover
        open={open}
        onOpenChange={toggle}
        trigger="hover"
        placement="bottomRight"
        arrow={false}
        getPopupContainer={(n) => n.parentElement ?? document.body}
        classNames={{ container: 'p-2' }}
        content={list}
      >
        <Button
          ref={trigger}
          type="text"
          aria-label={`${VIEWER_LABELS.processes} (${index + 1} / ${ids.length})`}
          aria-haspopup="dialog"
          aria-expanded={open}
          // Dokunmatik ve klavye: basınca açılır (açıkken kapatmaz)
          onClick={() => toggle(true)}
          className="group h-8 gap-1.5 px-2.5 text-current hover:bg-current/8! hover:text-current!"
        >
          {ticks.map((id, i) => (
            <Flex key={i} aria-hidden align="center" className="h-5 w-0.5">
              {id && id === current ? (
                // Açık talebin çizgisi talepten talebe kayar
                <MotionFlex
                  layoutId="detail-trail"
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
  )
}
