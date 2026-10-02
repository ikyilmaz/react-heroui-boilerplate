import { useId, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Check,
  CheckCheck,
  CirclePlay,
  CornerUpLeft,
  CircleDot,
  FilePlus2,
  FileText,
  Flag,
  Forward,
  Hourglass,
  Info,
  Paperclip,
  Settings2,
  SquareArrowOutUpRight,
  X,
} from 'lucide-react'
import {
  Alert,
  Avatar,
  Button,
  Card,
  ConfigProvider,
  Descriptions,
  Dropdown,
  Empty,
  Flex,
  Form,
  Input,
  Menu,
  Popover,
  Skeleton,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography,
  type TableColumnsType,
} from 'antd'
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
  type ChildLink,
  type LineItem,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import type { HistoryViewOptions } from '@/synergy/shared/historyView'
import { FLOW_TEXT } from '@/synergy/shared/flowLabels'
import { CARD, cn, IC, StatusTag, TintIcon, Tip } from '@/synergy/ant/ui'
import { useLook } from '@/synergy/shared/themeSettings'
import { FormField, LongField } from '@/synergy/FormFields'
import { useOpenChild } from '@/synergy/FormTabs'

/* Flow Viewer karoları (antd): form (ve child form bağlantıları), ek dosya, akış özellikleri, dokümanlar, akış tarihçesi */

const { Text, Title } = Typography

const TITLE = 'm-0 font-display text-lg'

/* --- Form -------------------------------------------------------------------------------------- */

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <Flex vertical gap={12} role="group" aria-labelledby={id}>
      <Title level={3} id={id} className="m-0 text-sm font-medium text-muted">
        {title}
      </Title>
      {children}
    </Flex>
  )
}

/** Doküman başlığı ve numarası. */
function DocTitle({ doc }: { doc: FlowDocument }) {
  return (
    <>
      <Title level={2} className={TITLE}>
        {doc.name}
      </Title>
      <Text type="secondary" className="font-mono text-xs font-medium">
        {DOCUMENT_LABELS.no}: {doc.id}
      </Text>
    </>
  )
}

interface ItemRow extends LineItem {
  key: string
}

const NUM = 'whitespace-nowrap tabular-nums'

const ITEM_COLUMNS: TableColumnsType<ItemRow> = [
  { title: 'Kalem', dataIndex: 'name', key: 'name' },
  {
    title: 'Miktar',
    key: 'qty',
    align: 'end',
    className: NUM,
    render: (_, it) => `${it.qty} ${it.unit}`,
  },
  {
    title: 'Birim fiyat',
    key: 'price',
    align: 'end',
    className: NUM,
    render: (_, it) => tl.format(it.price),
  },
  {
    title: 'Tutar',
    key: 'amount',
    align: 'end',
    className: NUM,
    render: (_, it) => tl.format(it.qty * it.price),
  },
]

/** Kalem tablosu (miktar, birim fiyat, tutar; altta toplam). Çizgisiz, düz başlık şeridi. */
export function ItemsTable({ items }: { items: LineItem[] }) {
  const total = items.reduce((s, it) => s + it.qty * it.price, 0)
  return (
    <Table<ItemRow>
      aria-label="Kalemler"
      size="middle"
      pagination={false}
      scroll={{ x: 'max-content' }}
      columns={ITEM_COLUMNS}
      dataSource={items.map((it, i) => ({ ...it, key: `i${i}` }))}
      summary={() => (
        <Table.Summary.Row>
          <Table.Summary.Cell index={0} colSpan={3}>
            <Text strong>Toplam</Text>
          </Table.Summary.Cell>
          <Table.Summary.Cell index={3} align="end">
            <Text className={cn(NUM, 'font-display text-lg font-bold')}>{tl.format(total)}</Text>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      )}
    />
  )
}

/**
 * Formun içindeki child form düğmesi (orijinalde form tasarımcısının koyduğu eylem düğmesi):
 * ilgili alanın hemen altında; basınca child talep açılır (`FormTabs.tsx`).
 */
function ChildButton({ link, onOpen }: { link: ChildLink; onOpen: (id: string) => void }) {
  const Icon = link.action === 'add' ? FilePlus2 : SquareArrowOutUpRight
  return (
    <Button
      variant="filled"
      color="default"
      icon={<Icon {...IC} />}
      onClick={() => onOpen(link.id)}
      className="self-start"
    >
      {link.label}
    </Button>
  )
}

export function FormBody({
  r,
  files,
  onOpenFile,
}: {
  r: WorkRequest
  files: FlowDocument[]
  onOpenFile: (d: FlowDocument) => void
}) {
  const t = r.template
  const fields = Object.entries(t.fields)
  // Child form düğmeleri yalnızca form sekmelerinin içinde (açacak yer varsa)
  const open = useOpenChild()
  const items = t.items ?? []
  const subject = useId()
  if (fields.length === 0 && !t.reason)
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={FLOW_TEXT.formEmpty} />
  return (
    // Form adı ve doküman numarası başlık kartında; form doğrudan alanlarla başlar
    <Form layout="vertical" component={false}>
      <Flex vertical gap={32}>
        <Section title="Konu">
          <Input id={subject} aria-label="Konu" readOnly value={t.title} />
        </Section>
        {fields.length > 0 && (
          <Section title="Form bilgileri">
            {/* Salt okunur alanlar (FormFields.tsx); sütun sayısı kabın (bölmenin) genişliğine göre */}
            <Flex className="grid grid-cols-1 gap-x-6 gap-y-4 @xl:grid-cols-2">
              {fields.map(([label, value]) => {
                const links = open ? (t.children ?? []).filter((c) => c.after === label) : []
                if (!links.length) return <FormField key={label} label={label} value={value} />
                return (
                  <Flex key={label} vertical gap={8} className="min-w-0">
                    <FormField label={label} value={value} />
                    {links.map((l) => (
                      <ChildButton key={l.id} link={l} onOpen={(id) => open?.(r.id, id)} />
                    ))}
                  </Flex>
                )
              })}
            </Flex>
          </Section>
        )}
        {items.length > 0 && (
          <Section title="Kalemler">
            <ItemsTable items={items} />
          </Section>
        )}
        {t.reason && (
          <Section title="Açıklama">
            <LongField label="Açıklama" value={t.reason} rows={5} hideLabel />
          </Section>
        )}
        {files.length > 0 && (
          <Section title="Ekler">
            <Flex wrap gap={8}>
              {files.map((f) => (
                <Button
                  key={f.id}
                  variant="filled"
                  color="default"
                  icon={<Paperclip {...IC} />}
                  onClick={() => onOpenFile(f)}
                >
                  {f.name}
                </Button>
              ))}
            </Flex>
          </Section>
        )}
      </Flex>
    </Form>
  )
}

/* --- Yükleniyor ------------------------------------------------------------------------------- */

/** İskeletin bir parçası: parıldayan yuvarlak köşeli şerit (antd Skeleton); boyu sınıfla. */
function Bone({ className, active }: { className?: string; active: boolean }) {
  return (
    <Skeleton.Button
      active={active}
      block
      className={cn(
        '[&_.ant-skeleton-button]:min-w-0! [&_.ant-skeleton-button]:rounded-lg!',
        className,
      )}
    />
  )
}

/** İskelette bir form alanı: etiket ve kutu. */
function BoneField({ active, tall }: { active: boolean; tall?: boolean }) {
  return (
    <Flex vertical gap={8} className="min-w-0">
      <Bone active={active} className="w-24 [&_.ant-skeleton-button]:h-3!" />
      <Bone
        active={active}
        className={cn(
          '[&_.ant-skeleton-button]:rounded-2xl!',
          tall ? '[&_.ant-skeleton-button]:h-24!' : '[&_.ant-skeleton-button]:h-9!',
        )}
      />
    </Flex>
  )
}

/**
 * Form sunucudan gelene kadar (maket: form sekmeleri yeni giren formu bir süre bekletir) yerinde
 * duran iskelet: talep ayrıntısının yerleşimi — başlık bandı, form alanları ve bölme yeterince
 * genişse yan bilgiler. Genişlik bölmeye göre (kap sorgusu). Animasyon kapalıysa parıltı yok.
 */
export function FormSkeleton() {
  const active = useLook().motion !== 'off'
  return (
    <Flex vertical gap={12} role="status" aria-busy aria-label="Form yükleniyor">
      {/* Başlık bandı: süreç ikonu, proje ve süreç adı, olaylar */}
      <Card className={CARD} classNames={{ body: 'flex flex-col gap-5 p-6' }}>
        <Flex align="center" gap={16}>
          <Bone
            active={active}
            className="w-12 shrink-0 [&_.ant-skeleton-button]:size-12! [&_.ant-skeleton-button]:rounded-2xl!"
          />
          <Flex vertical gap={10} className="min-w-0 flex-1">
            <Bone active={active} className="w-32 [&_.ant-skeleton-button]:h-3!" />
            <Bone active={active} className="w-full max-w-72 [&_.ant-skeleton-button]:h-6!" />
          </Flex>
        </Flex>
        <Flex wrap gap={8}>
          {['w-24', 'w-20', 'w-28', 'w-24'].map((w, i) => (
            <Bone
              key={i}
              active={active}
              className={cn(
                w,
                '[&_.ant-skeleton-button]:h-8! [&_.ant-skeleton-button]:rounded-full!',
              )}
            />
          ))}
        </Flex>
      </Card>
      {/* Form ve yan bilgiler (yan bilgiler sütun yerleşimindeki gibi 52rem'den geniş bölmede) */}
      <Flex className="flex flex-col gap-3 @[52rem]:flex-row @[52rem]:items-start">
        <Card
          className={cn(CARD, 'min-w-0 flex-1')}
          classNames={{ body: 'flex flex-col gap-6 p-6 sm:p-8' }}
        >
          <BoneField active={active} />
          <Flex className="grid grid-cols-1 gap-x-6 gap-y-5 @xl:grid-cols-2">
            {Array.from({ length: 6 }, (_, i) => (
              <BoneField key={i} active={active} />
            ))}
          </Flex>
          <BoneField active={active} tall />
        </Card>
        <Flex
          vertical
          gap={12}
          className="hidden w-[calc((100%-0.75rem)/3)] shrink-0 @[52rem]:flex"
        >
          <Card className={CARD} classNames={{ body: 'flex flex-col gap-3 p-5' }}>
            <Bone active={active} className="w-28 [&_.ant-skeleton-button]:h-4!" />
            {[0, 1].map((i) => (
              <Bone
                key={i}
                active={active}
                className="[&_.ant-skeleton-button]:h-12! [&_.ant-skeleton-button]:rounded-xl!"
              />
            ))}
          </Card>
          <Card className={CARD} classNames={{ body: 'flex flex-col gap-3 p-5' }}>
            <Bone active={active} className="[&_.ant-skeleton-button]:h-8!" />
            {Array.from({ length: 6 }, (_, i) => (
              <Bone key={i} active={active} className="[&_.ant-skeleton-button]:h-4!" />
            ))}
          </Card>
        </Flex>
      </Flex>
    </Flex>
  )
}

export function FileBody({ doc, onShowForm }: { doc: FlowDocument; onShowForm: () => void }) {
  return (
    <Flex vertical align="center" gap={12} className="py-12 text-center">
      <TintIcon icon={Paperclip} size={56} />
      <DocTitle doc={doc} />
      <Button type="primary" icon={<FileText {...IC} />} onClick={onShowForm} className="mt-2">
        {FLOW_TEXT.showForm}
      </Button>
    </Flex>
  )
}

/* --- Akış özellikleri -------------------------------------------------------------------------- */

export function PropertiesList({ items }: { items: FlowProperty[] }) {
  if (!items.length) return <Text type="secondary">{VIEWER_LABELS.propertiesEmpty}</Text>
  return (
    <Descriptions
      column={1}
      size="small"
      colon={false}
      classNames={{ label: 'w-2/5 text-muted', content: 'break-words' }}
      items={items.map((it) => ({
        key: it.name,
        label: it.name,
        children: (
          <Text className={cn(['Süreç No', 'Form No'].includes(it.name) && 'font-mono')}>
            {it.value ?? '-'}
          </Text>
        ),
      }))}
    />
  )
}

/* --- Dokümanlar -------------------------------------------------------------------------------- */

/** Doküman satırları iki satırlı (ad + numara): menü öğeleri buna göre yüksek. */
const DOC_MENU_THEME = { components: { Menu: { itemHeight: 52 } } }

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
  if (!documents.length) return <Text type="secondary">{DOCUMENT_LABELS.empty}</Text>
  const notViewed = documents.filter((d) => d.mustView && !viewed.has(d.id))
  const rest = documents.filter((d) => !notViewed.includes(d))
  const item = (d: FlowDocument) => {
    const Icon = d.kind === 'form' ? FileText : Paperclip
    return {
      key: String(d.id),
      icon: <Icon {...IC} />,
      label: (
        <Flex vertical className="min-w-0 py-2 leading-tight">
          <Text ellipsis className="text-current">
            {d.name}
          </Text>
          <Text className="font-mono text-xs text-current opacity-70">
            {DOCUMENT_LABELS.no}: {d.id}
          </Text>
        </Flex>
      ),
    }
  }
  return (
    <Flex vertical gap={8}>
      {showWarning && notViewed.length > 0 && (
        <Alert type="warning" showIcon title={DOCS_REQUIRED} className="font-medium" />
      )}
      <ConfigProvider theme={DOC_MENU_THEME}>
        <Menu
          aria-label={DOCUMENT_LABELS.title}
          mode="inline"
          selectedKeys={[String(activeId)]}
          onClick={({ key }) => {
            const doc = documents.find((d) => String(d.id) === key)
            if (doc) onOpen(doc)
          }}
          items={
            notViewed.length
              ? [
                  {
                    type: 'group',
                    key: 'must',
                    label: DOCUMENT_LABELS.mustView,
                    children: notViewed.map(item),
                  },
                  {
                    type: 'group',
                    key: 'other',
                    label: DOCUMENT_LABELS.other,
                    children: rest.map(item),
                  },
                ]
              : rest.map(item)
          }
          className="border-e-0 bg-transparent"
        />
      </ConfigProvider>
    </Flex>
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
  const selected = (['notify', 'rawDate'] as const).filter((k) => options[k])
  const toggle = (key: string) => {
    const k = key as keyof HistoryViewOptions
    onChange({ ...options, [k]: !options[k] })
  }
  return (
    // İpucu kabın üstünde: antd'de iç içe iki tetikleyici (ipucu + menü) aynı düğmede çalışmıyor
    <Tip label={FLOW_TEXT.viewOptions}>
      <Flex className="inline-flex shrink-0">
        <Dropdown
          placement="bottomRight"
          trigger={['click']}
          menu={{
            selectable: true,
            multiple: true,
            selectedKeys: selected,
            onSelect: ({ key }) => toggle(key),
            onDeselect: ({ key }) => toggle(key),
            items: [
              { key: 'notify', label: FLOW_TEXT.showNotify },
              { key: 'rawDate', label: FLOW_TEXT.showRawDate },
            ],
            className: 'min-w-60',
          }}
        >
          <Button type="text" icon={<Settings2 {...IC} />} aria-label={FLOW_TEXT.viewOptions} />
        </Dropdown>
      </Flex>
    </Tip>
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

/** Adımın durum metni; vekaleten yanıtlandıysa ayrıca "Vekaleten" etiketi çizilir. */
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
    <Flex vertical gap={16}>
      <Flex wrap align="center" gap={8}>
        <Text strong>{FLOW_TEXT.mainFlow}</Text>
        <StatusTag status={r.status} />
        {!compact && <Text>{processCaption(processOf(r))}</Text>}
        <Text type="secondary" className="ms-auto font-mono text-xs">
          {FLOW_TEXT.processNo}: {r.processNo}
        </Text>
      </Flex>
      <Timeline
        aria-label={VIEWER_LABELS.history}
        // Başlık ayrı sütunda değil: adım adı, tarih ve ayrıntılar ikonun sağında tek blokta
        classNames={{ itemContent: 'min-w-0 flex-1 pb-4' }}
        items={items.map((h, i) => {
          const waiting = !h.responseDate && h.type === 'approver'
          return {
            key: h.id,
            icon: (
              <StepIcon h={h} icon={iconOf(h, isDone, i === items.length - 1)} waiting={waiting} />
            ),
            content: (
              <Flex vertical>
                <StepHead h={h} waiting={waiting} rawDate={options.rawDate} />
                <StepBody h={h} waiting={waiting} />
              </Flex>
            ),
          }
        })}
      />
    </Flex>
  )
}

/** Adımın ikonu: tamamlanan adım dolu birincil, bekleyen yalnızca halka (nabız gibi atar), ret kırmızı. */
function StepIcon({
  h,
  icon: Icon,
  waiting,
}: {
  h: HistoryEntry
  icon: LucideIcon
  waiting: boolean
}) {
  return (
    <Avatar
      size={32}
      aria-hidden
      icon={<Icon {...IC} size={15} />}
      className={cn(
        'inline-flex! shrink-0 items-center justify-center',
        h.eventText === 'Reddet'
          ? 'bg-danger text-danger-foreground'
          : waiting
            ? 'animate-[halo_calc(1.8s*var(--motion-time,1))_ease-out_infinite] bg-surface text-muted ring-2 ring-accent'
            : 'bg-accent text-accent-foreground',
      )}
    />
  )
}

/** Adım başlığı: adım adı ve tarih(ler); tarihin üstünde istek / yanıt tarihleri. */
function StepHead({
  h,
  waiting,
  rawDate,
}: {
  h: HistoryEntry
  waiting: boolean
  rawDate: boolean
}) {
  const res = h.responseDate
  const dates =
    res && res.getTime() !== h.requestDate.getTime() ? [h.requestDate, res] : [h.requestDate]
  return (
    <Flex justify="space-between" align="start" gap={12} className="w-full">
      <Text type={waiting ? 'secondary' : undefined} className="text-sm font-medium">
        {h.step}
      </Text>
      <Tooltip
        mouseEnterDelay={0.3}
        title={
          <Flex vertical>
            <Text strong className="text-xs text-current">
              {FLOW_TEXT.detail}
            </Text>
            <Text className="text-xs text-current">
              {VIEWER_LABELS.requestDate}: {formatDateTime(h.requestDate)}
            </Text>
            <Text className="text-xs text-current">
              {VIEWER_LABELS.responseDate}: {h.responseDate ? formatDateTime(h.responseDate) : '-'}
            </Text>
          </Flex>
        }
      >
        <Flex vertical align="end" className="shrink-0">
          {dates.map((d) => (
            <Text key={d.getTime()} type="secondary" className="text-xs font-normal">
              {rawDate ? formatDateTime(d) : relative(d)}
            </Text>
          ))}
        </Flex>
      </Tooltip>
    </Flex>
  )
}

function StepBody({ h, waiting }: { h: HistoryEntry; waiting: boolean }) {
  const status = statusText(h)
  return (
    <Flex vertical gap={2}>
      {h.approver && <Text className="text-sm">({h.approver.name})</Text>}
      {status && (
        <Flex wrap align="center" gap={6}>
          <Text type="secondary" className={cn('text-sm', waiting && 'opacity-80')}>
            {status}
          </Text>
          {h.actionerType === 'delegated' && <Tag className="me-0">{VIEWER_LABELS.delegated}</Tag>}
        </Flex>
      )}
      {h.reason && <ReasonQuote h={h} reason={h.reason} />}
    </Flex>
  )
}

/** Sebep: kısa ise alıntı olarak satırda; uzunsa kırpılmış alıntı + tamamı açılır pencerede. */
function ReasonQuote({ h, reason }: { h: HistoryEntry; reason: string }) {
  const long = reason.length > 90
  return (
    <>
      <Flex vertical className="mt-1 rounded-xl bg-surface-secondary px-3 py-2">
        <Text type="secondary" className="text-xs font-medium">
          {VIEWER_LABELS.reason}
        </Text>
        <Typography.Paragraph ellipsis={long ? { rows: 2 } : false} className="mb-0 text-sm">
          “{reason}”
        </Typography.Paragraph>
      </Flex>
      {long && (
        <Popover
          trigger="click"
          placement="top"
          title={
            <Text strong>
              {VIEWER_LABELS.reason}:{' '}
              {h.approver && (
                <Text type="secondary" className="font-normal">
                  ({h.approver.name})
                </Text>
              )}
            </Text>
          }
          content={
            <Flex vertical gap={8} className="w-80 max-w-[calc(100vw-2rem)]">
              <Text className="text-sm">{reason}</Text>
              {h.responseDate && (
                <Text type="secondary" className="text-xs">
                  {formatDateTime(h.responseDate)}
                </Text>
              )}
            </Flex>
          }
        >
          <Button
            size="small"
            type="text"
            className="mt-1 self-start"
            aria-label={`${VIEWER_LABELS.reason}: ${h.step}`}
          >
            {FLOW_TEXT.detail}
          </Button>
        </Popover>
      )}
    </>
  )
}
