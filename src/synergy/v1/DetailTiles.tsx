import { Fragment, createElement, useId, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Check,
  CheckCheck,
  CirclePlay,
  CornerUpLeft,
  CircleDot,
  FileText,
  Flag,
  Forward,
  Hourglass,
  Info,
  Paperclip,
  Settings2,
  X,
} from 'lucide-react'
import {
  Alert,
  Avatar,
  Button,
  Card,
  Chip,
  Dropdown,
  EmptyState,
  Header,
  ListBox,
  Popover,
  Table,
  Tooltip,
  Typography,
  cn,
  type Selection,
} from '@heroui/react'
import {
  DOCS_REQUIRED,
  DOCUMENT_LABELS,
  VIEWER_LABELS,
  formatDateTime,
  processCaption,
  processOf,
  relative,
  tl,
  type FlowDocument,
  type FlowProperty,
  type HistoryEntry,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import type { HistoryViewOptions } from '@/synergy/shared/historyView'
import { FLOW_TEXT } from '@/synergy/shared/flowLabels'
import { timeOf } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { IC, StatusChip, TintIcon, Tip } from '@/synergy/v1/parts'
import { TextBox } from '@/components/TextBox'
import { FormField, LongField } from '@/synergy/shared/FormFields'

/* Flow Viewer karoları: form, ek dosya, akış özellikleri, dokümanlar, akış tarihçesi */

const TITLE = 'font-display text-lg'

/* --- Form -------------------------------------------------------------------------------------- */

/** Kalem tablosu: ayırıcısız başlık şeridi; satırlar çizgisiz, üzerine gelince yuvarlak şerit. */
const colCls = 'whitespace-nowrap after:content-none'
const cellCls = 'border-b-0'
const numCls = cn(cellCls, 'text-end whitespace-nowrap tabular-nums')

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <Box role="group" aria-labelledby={id} className="flex flex-col gap-3">
      <Typography.Heading level={3} id={id} color="muted" weight="medium" className="text-sm">
        {title}
      </Typography.Heading>
      {children}
    </Box>
  )
}

/** Doküman başlığı ve numarası. */
function DocTitle({ doc }: { doc: FlowDocument }) {
  return (
    <>
      <Typography.Heading level={2} className={TITLE}>
        {doc.name}
      </Typography.Heading>
      <Text tone="muted" type="body-xs" weight="medium" className="font-mono">
        {DOCUMENT_LABELS.no}: {doc.id}
      </Text>
    </>
  )
}

export function FormBody({
  r,
  form,
  files,
  onOpenFile,
}: {
  r: WorkRequest
  form: FlowDocument
  files: FlowDocument[]
  onOpenFile: (d: FlowDocument) => void
}) {
  const t = r.template
  const fields = Object.entries(t.fields)
  const items = t.items ?? []
  const total = items.reduce((s, it) => s + it.qty * it.price, 0)
  return (
    <Box className="flex flex-col gap-8">
      <Box className="flex items-center gap-3">
        <TintIcon icon={FileText} />
        <Box>
          <DocTitle doc={form} />
        </Box>
      </Box>

      {fields.length === 0 && !t.reason ? (
        <EmptyState className="py-10 text-center">{FLOW_TEXT.formEmpty}</EmptyState>
      ) : (
        <>
          <Section title="Konu">
            <TextBox aria-label="Konu" value={t.title} isReadOnly className="w-full" />
          </Section>
          {fields.length > 0 && (
            <Section title="Form bilgileri">
              {/* Gerçek form bileşenleri, salt okunur (FormFields.tsx) */}
              <Box className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {fields.map(([label, value]) => (
                  <FormField key={label} label={label} value={value} />
                ))}
              </Box>
            </Section>
          )}
          {items.length > 0 && (
            <Section title="Kalemler">
              <Table variant="secondary">
                <Table.ScrollContainer>
                  <Table.Content aria-label="Kalemler">
                    <Table.Header>
                      <Table.Column isRowHeader className={colCls}>
                        Kalem
                      </Table.Column>
                      {['Miktar', 'Birim fiyat', 'Tutar'].map((c) => (
                        <Table.Column key={c} id={c} className={cn(colCls, 'text-end')}>
                          {c}
                        </Table.Column>
                      ))}
                    </Table.Header>
                    <Table.Body>
                      {[
                        ...items.map((it, i) => (
                          <Table.Row key={`i${i}`} id={`i${i}`}>
                            <Table.Cell className={cellCls}>{it.name}</Table.Cell>
                            <Table.Cell className={numCls}>
                              {it.qty} {it.unit}
                            </Table.Cell>
                            <Table.Cell className={numCls}>{tl.format(it.price)}</Table.Cell>
                            <Table.Cell className={numCls}>
                              {tl.format(it.qty * it.price)}
                            </Table.Cell>
                          </Table.Row>
                        )),
                        <Table.Row key="total" id="total">
                          <Table.Cell className={cn(cellCls, 'font-semibold')}>Toplam</Table.Cell>
                          <Table.Cell className={cellCls} />
                          <Table.Cell className={cellCls} />
                          <Table.Cell className={cn(numCls, 'font-display text-lg font-bold')}>
                            {tl.format(total)}
                          </Table.Cell>
                        </Table.Row>,
                      ]}
                    </Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </Section>
          )}
          {t.reason && (
            <Section title="Açıklama">
              <LongField label="Açıklama" value={t.reason} rows={5} hideLabel />
            </Section>
          )}
          {files.length > 0 && (
            <Section title="Ekler">
              <Box className="flex flex-wrap gap-2">
                {files.map((f) => (
                  <Button key={f.id} variant="secondary" size="sm" onPress={() => onOpenFile(f)}>
                    <Paperclip {...IC} />
                    {f.name}
                  </Button>
                ))}
              </Box>
            </Section>
          )}
        </>
      )}
    </Box>
  )
}

export function FileBody({ doc, onShowForm }: { doc: FlowDocument; onShowForm: () => void }) {
  return (
    <EmptyState className="flex flex-col items-center gap-3 py-12 text-center">
      <TintIcon icon={Paperclip} className="size-14" />
      <DocTitle doc={doc} />
      <Button className="mt-2" onPress={onShowForm}>
        <FileText {...IC} />
        {FLOW_TEXT.showForm}
      </Button>
    </EmptyState>
  )
}

/* --- Akış özellikleri -------------------------------------------------------------------------- */

export function PropertiesList({ items }: { items: FlowProperty[] }) {
  if (!items.length)
    return (
      <Typography type="body-sm" color="muted">
        {VIEWER_LABELS.propertiesEmpty}
      </Typography>
    )
  return (
    <Box className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-1">
      {items.map((it) => (
        <Fragment key={it.name}>
          <Text tone="muted" type="body-sm">
            {it.name}
          </Text>
          <Text
            tone="primary"
            type="body-sm"
            className={cn('break-words', ['Süreç No', 'Form No'].includes(it.name) && 'font-mono')}
          >
            {it.value ?? '-'}
          </Text>
        </Fragment>
      ))}
    </Box>
  )
}

/* --- Dokümanlar -------------------------------------------------------------------------------- */

export function DocumentsList({
  documents,
  viewed,
  activeId,
  showWarning,
  onOpen,
}: {
  documents: FlowDocument[]
  viewed: ReadonlySet<number>
  activeId: number
  showWarning: boolean
  onOpen: (d: FlowDocument) => void
}) {
  if (!documents.length)
    return (
      <Typography type="body-sm" color="muted">
        {DOCUMENT_LABELS.empty}
      </Typography>
    )
  const notViewed = documents.filter((d) => d.mustView && !viewed.has(d.id))
  const rest = documents.filter((d) => !notViewed.includes(d))
  const onSelectionChange = (keys: Selection) => {
    const doc = keys !== 'all' && documents.find((d) => d.id === Number([...keys][0]))
    if (doc) onOpen(doc)
  }
  const item = (d: FlowDocument) => {
    const Icon = d.kind === 'form' ? FileText : Paperclip
    return (
      <ListBox.Item
        key={d.id}
        id={d.id}
        textValue={d.name}
        className="data-selected:bg-accent data-selected:text-accent-foreground"
      >
        <Icon {...IC} className="shrink-0" />
        <Box className="min-w-0">
          <Text slot="label" type="body-sm" truncate className="text-current!">
            {d.name}
          </Text>
          <Text slot="description" type="body-xs" className="font-mono text-current! opacity-70">
            {DOCUMENT_LABELS.no}: {d.id}
          </Text>
        </Box>
      </ListBox.Item>
    )
  }
  return (
    <Box className="flex flex-col gap-2">
      {showWarning && notViewed.length > 0 && (
        // Dolu uyarı zemini: ikon ve metin uyarının ön plan renginde
        <Alert status="warning" className="bg-warning">
          <Alert.Indicator className="text-warning-foreground" />
          <Alert.Content>
            <Alert.Description className="font-medium text-warning-foreground">{DOCS_REQUIRED}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <ListBox
        aria-label={DOCUMENT_LABELS.title}
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={[activeId]}
        onSelectionChange={onSelectionChange}
        className="p-0"
      >
        {notViewed.length > 0 && (
          <ListBox.Section>
            <Header>{DOCUMENT_LABELS.mustView}</Header>
            {notViewed.map(item)}
          </ListBox.Section>
        )}
        <ListBox.Section>
          {notViewed.length > 0 && <Header className="pt-3">{DOCUMENT_LABELS.other}</Header>}
          {rest.map(item)}
        </ListBox.Section>
      </ListBox>
    </Box>
  )
}

/* --- Akış tarihçesi ---------------------------------------------------------------------------- */

export function HistoryViewMenu({
  options,
  onChange,
}: {
  options: HistoryViewOptions
  onChange: (o: HistoryViewOptions) => void
}) {
  return (
    <Dropdown>
      <Tip label={FLOW_TEXT.viewOptions}>
        <Button isIconOnly variant="ghost" aria-label={FLOW_TEXT.viewOptions}>
          <Settings2 {...IC} />
        </Button>
      </Tip>
      <Dropdown.Popover placement="bottom end" className="min-w-60">
        <Dropdown.Menu
          aria-label={FLOW_TEXT.viewOptions}
          selectionMode="multiple"
          selectedKeys={(['notify', 'rawDate'] as const).filter((k) => options[k])}
          onSelectionChange={(keys) => {
            const has = (key: string) => keys === 'all' || keys.has(key)
            onChange({ notify: has('notify'), rawDate: has('rawDate') })
          }}
        >
          <Dropdown.Item id="notify" textValue={FLOW_TEXT.showNotify}>
            <Dropdown.ItemIndicator />
            {FLOW_TEXT.showNotify}
          </Dropdown.Item>
          <Dropdown.Item id="rawDate" textValue={FLOW_TEXT.showRawDate}>
            <Dropdown.ItemIndicator />
            {FLOW_TEXT.showRawDate}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}

const eventIcons: Record<string, LucideIcon> = {
  Gönder: CirclePlay,
  Onayla: Check,
  Reddet: X,
  'Geri Gönder': CornerUpLeft,
  'Revizyon İste': CornerUpLeft,
  Yönlendir: Forward,
}

function iconOf(h: HistoryEntry, isDone: boolean, isLast: boolean): LucideIcon {
  if (h.type === 'end') return isDone && isLast ? CheckCheck : Flag
  if (h.type === 'notify') return Info
  if (h.type === 'starter') return CirclePlay
  if (!h.responseDate) return Hourglass
  return (h.eventText && eventIcons[h.eventText]) || CircleDot
}

/** Adımın durum metni; vekaleten yanıtlandıysa ayrıca "Vekaleten" çipi çizilir. */
function statusText(h: HistoryEntry) {
  const base =
    h.type === 'end' || h.type === 'notify'
      ? ''
      : h.responseDate
        ? (h.eventText ?? '')
        : VIEWER_LABELS.waiting
  return h.actionerType === 'delegated' && h.actioner && base
    ? FLOW_TEXT.delegated(base, h.actioner.name)
    : base
}

export function HistoryTimeline({
  r,
  options,
  compact = false,
}: {
  r: WorkRequest
  options: HistoryViewOptions
  compact?: boolean
}) {
  const items = r.history.filter((h) => options.notify || h.type !== 'notify')
  const isDone = items.every((h) => !!h.responseDate)
  return (
    <Box className="flex flex-col gap-4">
      <Box className="flex flex-wrap items-center gap-2">
        <Text tone="primary" type="body-sm" weight="semibold">
          {FLOW_TEXT.mainFlow}
        </Text>
        <StatusChip status={r.status} />
        {!compact && <Text type="body-sm">{processCaption(processOf(r))}</Text>}
        <Text tone="muted" type="body-xs" className="ms-auto font-mono">
          {FLOW_TEXT.processNo}: {r.processNo}
        </Text>
      </Box>
      <Box role="list" aria-label={VIEWER_LABELS.history}>
        {items.map((h, i) => (
          <HistoryItem
            key={h.id}
            h={h}
            isLast={i === items.length - 1}
            isDone={isDone}
            rawDate={options.rawDate}
          />
        ))}
      </Box>
    </Box>
  )
}

/** Tarihçe adımı; bekleyen adımın halkası nabız gibi atar. */
function HistoryItem({
  h,
  isLast,
  isDone,
  rawDate,
}: {
  h: HistoryEntry
  isLast: boolean
  isDone: boolean
  rawDate: boolean
}) {
  const icon = iconOf(h, isDone, isLast)
  const waiting = !h.responseDate && h.type === 'approver'
  const status = statusText(h)
  const res = h.responseDate
  const dates =
    res && res.getTime() !== h.requestDate.getTime() ? [h.requestDate, res] : [h.requestDate]
  return (
    <Box role="listitem" className="flex gap-3">
      <Box className="flex flex-col items-center">
        {/* Tamamlanan adım vurgu renginde; bekleyen adım yalnızca halka */}
        {/* Halka kökte ve dışta: içe dönük halka dolgunun altında kalıyordu */}
        <Avatar
          size="sm"
          aria-hidden
          className={cn(
            'shrink-0',
            waiting && 'animate-[halo_calc(1.8s*var(--motion-time,1))_ease-out_infinite] ring-2 ring-accent',
          )}
        >
          <Avatar.Fallback
            className={
              h.eventText === 'Reddet'
                ? 'bg-danger text-danger-foreground'
                : waiting
                  ? 'bg-surface text-muted'
                  : 'bg-accent text-accent-foreground'
            }
          >
            {createElement(icon, { ...IC, size: 15 })}
          </Avatar.Fallback>
        </Avatar>
        {!isLast && (
          <Box
            aria-hidden
            className="my-1 w-0.5 flex-1 bg-accent-soft"
          />
        )}
      </Box>
      <Box className={cn('min-w-0 flex-1', !isLast && 'pb-4')}>
        <Box className="flex items-start justify-between gap-3">
          <Text tone={waiting ? 'muted' : 'primary'} type="body-sm" weight="medium">
            {h.step}
          </Text>
          <Tooltip delay={300}>
            <Tooltip.Trigger className="flex shrink-0 flex-col items-end">
              {dates.map((d) => (
                <Text key={d.getTime()} tone="muted" type="body-xs" {...timeOf(d)}>
                  {rawDate ? formatDateTime(d) : relative(d)}
                </Text>
              ))}
            </Tooltip.Trigger>
            <Tooltip.Content>
              <Typography type="body-xs" weight="semibold">
                {FLOW_TEXT.detail}
              </Typography>
              <Typography type="body-xs">
                {VIEWER_LABELS.requestDate}: {formatDateTime(h.requestDate)}
              </Typography>
              <Typography type="body-xs">
                {VIEWER_LABELS.responseDate}:{' '}
                {h.responseDate ? formatDateTime(h.responseDate) : '-'}
              </Typography>
            </Tooltip.Content>
          </Tooltip>
        </Box>
        {h.approver && <Text type="body-sm">({h.approver.name})</Text>}
        {status && (
          <Box className="flex flex-wrap items-center gap-1.5">
            <Text tone={waiting ? 'muted' : 'secondary'} type="body-sm">
              {status}
            </Text>
            {h.actionerType === 'delegated' && <Chip size="sm">{VIEWER_LABELS.delegated}</Chip>}
          </Box>
        )}
        {h.reason && <ReasonQuote h={h} reason={h.reason} />}
      </Box>
    </Box>
  )
}

/** Sebep: kısa ise alıntı olarak satırda; uzunsa kırpılmış alıntı + tamamı açılır pencerede. */
function ReasonQuote({ h, reason }: { h: HistoryEntry; reason: string }) {
  const long = reason.length > 90
  return (
    <>
      <Card variant="secondary" className="mt-1 gap-0 px-3 py-2">
        <Text tone="muted" type="body-xs" weight="medium">
          {VIEWER_LABELS.reason}
        </Text>
        <Text tone="primary" type="body-sm" className={long ? 'line-clamp-2' : 'block'}>
          “{reason}”
        </Text>
      </Card>
      {long && (
        <Popover>
          <Button
            size="sm"
            variant="ghost"
            className="mt-1"
            aria-label={`${VIEWER_LABELS.reason}: ${h.step}`}
          >
            {FLOW_TEXT.detail}
          </Button>
          <Popover.Content placement="top" className="w-80 max-w-[calc(100vw-2rem)]">
            <Popover.Dialog className="flex flex-col gap-2">
              <Popover.Heading className="font-semibold">
                {VIEWER_LABELS.reason}:{' '}
                {h.approver && (
                  <Text tone="muted" type="body-sm" weight="normal">
                    ({h.approver.name})
                  </Text>
                )}
              </Popover.Heading>
              <Text tone="primary" type="body-sm">
                {reason}
              </Text>
              {h.responseDate && (
                <Text tone="muted" type="body-xs" {...timeOf(h.responseDate)}>
                  {formatDateTime(h.responseDate)}
                </Text>
              )}
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      )}
    </>
  )
}
