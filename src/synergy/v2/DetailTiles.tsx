import { Fragment, useId, type ReactNode } from 'react'
import { FileText, Paperclip, Settings2 } from 'lucide-react'
import {
  Alert,
  Button,
  Chip,
  Dropdown,
  Header,
  ListBox,
  Popover,
  Separator,
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
import { TextBox } from '@/components/TextBox'
import { FormField, LongField } from '@/synergy/shared/FormFields'
import { DISPLAY, IC, IconTile, LABEL, SELECTED, StatusMark, Tip } from '@/synergy/v2/parts'

/* Bento Flow Viewer parçaları: form (gerçek bileşenler, salt okunur), ek dosya, akış özellikleri, dokümanlar, akış tarihçesi */

/* --- Form -------------------------------------------------------------------------------------- */

const colCls = 'whitespace-nowrap after:content-none'
const cellCls = 'border-b-0'
const numCls = cn(cellCls, 'text-end whitespace-nowrap tabular-nums font-mono text-[0.8125rem]')

/** Form bölümü: kalın küçük başlık, altında içerik. */
function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <Box role="group" aria-labelledby={id} className="flex flex-col gap-3">
      <Typography.Heading level={3} id={id} className="text-sm font-semibold">
        {title}
      </Typography.Heading>
      {children}
    </Box>
  )
}

/** Belge başlığı ve numarası. */
function DocTitle({ doc }: { doc: FlowDocument }) {
  return (
    <Box className="flex flex-col gap-1">
      <Typography.Heading level={2} className={cn(DISPLAY, 'text-lg')}>
        {doc.name}
      </Typography.Heading>
      <Text tone="muted" className="font-mono text-xs">
        {DOCUMENT_LABELS.no}: {doc.id}
      </Text>
    </Box>
  )
}

/** İki sütunlu etiket / değer listesi; satırlar arasında ince çizgi. */
function Ledger({ rows, labelWidth = 'grid-cols-[12rem_1fr]', mono = [] }: { rows: [string, ReactNode][]; labelWidth?: string; mono?: string[] }) {
  return (
    <Box role="list" className="flex flex-col">
      {rows.map(([label, value], i) => (
        <Fragment key={label}>
          {i > 0 && <Separator />}
          <Box role="listitem" className={cn('grid gap-x-4 gap-y-0.5 py-2.5 max-sm:grid-cols-1', labelWidth)}>
            <Text tone="muted" className="text-sm">
              {label}
            </Text>
            <Text tone="primary" className={cn('text-sm break-words', mono.includes(label) && 'font-mono text-[0.8125rem]')}>
              {value}
            </Text>
          </Box>
        </Fragment>
      ))}
    </Box>
  )
}

export function FormDocument({ r, form, files, onOpenFile }: { r: WorkRequest; form: FlowDocument; files: FlowDocument[]; onOpenFile: (d: FlowDocument) => void }) {
  const t = r.template
  const fields = Object.entries(t.fields)
  const items = t.items ?? []
  const total = items.reduce((s, it) => s + it.qty * it.price, 0)
  return (
    <Box className="flex flex-col gap-10">
      <Box className="flex items-center gap-3">
        <IconTile icon={FileText} />
        <DocTitle doc={form} />
      </Box>

      {fields.length === 0 && !t.reason ? (
        <Typography type="body-sm" color="muted" className="py-10 text-center">
          {FLOW_TEXT.formEmpty}
        </Typography>
      ) : (
        <>
          <Section title="Konu">
            <TextBox aria-label="Konu" value={t.title} isReadOnly className="w-full" />
          </Section>
          {fields.length > 0 && (
            <Section title="Form bilgileri">
              {/* Gerçek form bileşenleri, salt okunur (shared/FormFields.tsx) */}
              <Box className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
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
                            <Table.Cell className={numCls}>{tl.format(it.qty * it.price)}</Table.Cell>
                          </Table.Row>
                        )),
                        <Table.Row key="total" id="total">
                          <Table.Cell className={cn(cellCls, 'font-semibold')}>Toplam</Table.Cell>
                          <Table.Cell className={cellCls} />
                          <Table.Cell className={cellCls} />
                          <Table.Cell className={cn(cellCls, DISPLAY, 'text-end text-lg whitespace-nowrap tabular-nums')}>{tl.format(total)}</Table.Cell>
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
                  <Button key={f.id} variant="outline" size="sm" onPress={() => onOpenFile(f)} className="gap-2">
                    <Paperclip {...IC} className="text-muted" />
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

export function FileDocument({ doc, onShowForm }: { doc: FlowDocument; onShowForm: () => void }) {
  return (
    <Box className="flex flex-col items-center gap-4 py-16 text-center">
      <IconTile icon={Paperclip} />
      <DocTitle doc={doc} />
      <Button variant="outline" className="mt-2" onPress={onShowForm}>
        <FileText {...IC} />
        {FLOW_TEXT.showForm}
      </Button>
    </Box>
  )
}

/* --- Akış özellikleri -------------------------------------------------------------------------- */

export function PropertiesLedger({ items }: { items: FlowProperty[] }) {
  if (!items.length)
    return (
      <Typography type="body-sm" color="muted">
        {VIEWER_LABELS.propertiesEmpty}
      </Typography>
    )
  return <Ledger rows={items.map((it) => [it.name, it.value ?? '—'])} labelWidth="grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" mono={['Süreç No', 'Form No']} />
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
      <ListBox.Item key={d.id} id={d.id} textValue={d.name} className={cn('gap-3 rounded-lg px-3', SELECTED)}>
        <Icon {...IC} className="shrink-0 opacity-70" />
        <Box className="min-w-0">
          <Text slot="label" truncate className="block text-sm text-current!">
            {d.name}
          </Text>
          <Text slot="description" className="font-mono text-[0.6875rem] text-current! opacity-65">
            {DOCUMENT_LABELS.no}: {d.id}
          </Text>
        </Box>
      </ListBox.Item>
    )
  }
  return (
    <Box className="flex flex-col gap-3">
      {showWarning && notViewed.length > 0 && (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{DOCS_REQUIRED}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      <ListBox aria-label={DOCUMENT_LABELS.title} selectionMode="single" disallowEmptySelection selectedKeys={[activeId]} onSelectionChange={onSelectionChange} className="-mx-2 p-0">
        {notViewed.length > 0 && (
          <ListBox.Section>
            <Header className={LABEL}>{DOCUMENT_LABELS.mustView}</Header>
            {notViewed.map(item)}
          </ListBox.Section>
        )}
        <ListBox.Section>
          {notViewed.length > 0 && <Header className={cn(LABEL, 'pt-3')}>{DOCUMENT_LABELS.other}</Header>}
          {rest.map(item)}
        </ListBox.Section>
      </ListBox>
    </Box>
  )
}

/* --- Akış tarihçesi ---------------------------------------------------------------------------- */

export function HistoryViewMenu({ options, onChange }: { options: HistoryViewOptions; onChange: (o: HistoryViewOptions) => void }) {
  return (
    <Dropdown>
      <Tip label={FLOW_TEXT.viewOptions}>
        <Button isIconOnly size="sm" variant="ghost" aria-label={FLOW_TEXT.viewOptions} className="text-muted">
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

/** Adımın durum metni; vekaleten yanıtlandıysa ayrıca "Vekaleten" çipi çizilir. */
function statusText(h: HistoryEntry) {
  const base = h.type === 'end' || h.type === 'notify' ? '' : h.responseDate ? (h.eventText ?? '') : VIEWER_LABELS.waiting
  return h.actionerType === 'delegated' && h.actioner && base ? FLOW_TEXT.delegated(base, h.actioner.name) : base
}

export function HistoryLedger({ r, options, compact = false }: { r: WorkRequest; options: HistoryViewOptions; compact?: boolean }) {
  const items = r.history.filter((h) => options.notify || h.type !== 'notify')
  return (
    <Box className="flex flex-col gap-4">
      <Box className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Text tone="primary" className="text-sm font-semibold">
          {FLOW_TEXT.mainFlow}
        </Text>
        <StatusMark status={r.status} />
        {!compact && <Text className="text-sm">{processCaption(processOf(r))}</Text>}
        <Text tone="muted" className="ms-auto font-mono text-xs">
          {FLOW_TEXT.processNo}: {r.processNo}
        </Text>
      </Box>
      <Box role="list" aria-label={VIEWER_LABELS.history}>
        {items.map((h, i) => (
          <HistoryRow key={h.id} h={h} isLast={i === items.length - 1} rawDate={options.rawDate} compact={compact} />
        ))}
      </Box>
    </Box>
  )
}

function HistoryRow({ h, isLast, rawDate, compact }: { h: HistoryEntry; isLast: boolean; rawDate: boolean; compact: boolean }) {
  const waiting = !h.responseDate && h.type === 'approver'
  const status = statusText(h)
  const res = h.responseDate
  const dates = res && res.getTime() !== h.requestDate.getTime() ? [h.requestDate, res] : [h.requestDate]
  const marker = h.eventText === 'Reddet' ? 'bg-danger' : waiting ? 'bg-surface ring-2 ring-accent' : 'bg-accent'
  return (
    <Box role="listitem" className={cn('grid gap-3', compact ? 'grid-cols-[auto_1fr]' : 'grid-cols-[6.5rem_auto_1fr]')}>
      {!compact && <HistoryDates h={h} dates={dates} rawDate={rawDate} className="pt-0.5 text-end" />}
      <Box className="flex flex-col items-center pt-1.5">
        <Box aria-hidden className={cn('size-2.5 shrink-0 rounded-full', marker)} />
        {!isLast && <Separator orientation="vertical" className="mt-1.5 flex-1" />}
      </Box>
      <Box className={cn('min-w-0', !isLast && 'pb-5')}>
        <Box className="flex items-start justify-between gap-3">
          <Text tone={waiting ? 'muted' : 'primary'} className="text-sm font-medium">
            {h.step}
          </Text>
          {compact && <HistoryDates h={h} dates={dates} rawDate={rawDate} className="shrink-0 text-end" />}
        </Box>
        {h.approver && <Text className="block text-sm">{h.approver.name}</Text>}
        {status && (
          <Box className="flex flex-wrap items-center gap-1.5">
            <Text tone={waiting ? 'muted' : 'secondary'} className="text-sm">
              {status}
            </Text>
            {h.actionerType === 'delegated' && (
              <Chip size="sm" variant="soft">
                {VIEWER_LABELS.delegated}
              </Chip>
            )}
          </Box>
        )}
        {h.reason && <ReasonQuote h={h} reason={h.reason} />}
      </Box>
    </Box>
  )
}

/** Tarih(ler): göreli ya da tam; ipucunda İstek / Cevap tarihi. */
function HistoryDates({ h, dates, rawDate, className }: { h: HistoryEntry; dates: Date[]; rawDate: boolean; className?: string }) {
  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger className={cn('flex flex-col', className)}>
        {dates.map((d) => (
          <Text key={d.getTime()} tone="muted" {...timeOf(d)} className="text-xs">
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
          {VIEWER_LABELS.responseDate}: {h.responseDate ? formatDateTime(h.responseDate) : '-'}
        </Typography>
      </Tooltip.Content>
    </Tooltip>
  )
}

/** Sebep: ikinci yüzeyde kısa alıntı; uzunsa kırpılır, tamamı "Detay" penceresinde. */
function ReasonQuote({ h, reason }: { h: HistoryEntry; reason: string }) {
  const long = reason.length > 90
  return (
    <Box className="mt-2 flex flex-col items-start gap-1 rounded-lg bg-surface-secondary px-3 py-2">
      <Text className={LABEL}>{VIEWER_LABELS.reason}</Text>
      <Typography type="body-sm" className={long ? 'line-clamp-2' : undefined}>
        “{reason}”
      </Typography>
      {long && (
        <Popover>
          <Button size="sm" variant="ghost" className="-ms-3" aria-label={`${VIEWER_LABELS.reason}: ${h.step}`}>
            {FLOW_TEXT.detail}
          </Button>
          <Popover.Content placement="top" className="w-80 max-w-[calc(100vw-2rem)]">
            <Popover.Dialog className="flex flex-col gap-2">
              <Popover.Heading className="font-semibold">
                {VIEWER_LABELS.reason}:{' '}
                {h.approver && (
                  <Text tone="muted" className="text-sm font-normal">
                    ({h.approver.name})
                  </Text>
                )}
              </Popover.Heading>
              <Typography type="body-sm">{reason}</Typography>
              {h.responseDate && (
                <Text tone="muted" {...timeOf(h.responseDate)} className="font-mono text-xs">
                  {formatDateTime(h.responseDate)}
                </Text>
              )}
            </Popover.Dialog>
          </Popover.Content>
        </Popover>
      )}
    </Box>
  )
}
