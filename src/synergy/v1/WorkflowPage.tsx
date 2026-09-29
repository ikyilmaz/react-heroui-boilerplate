import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router'
import {
  Button,
  Card,
  Chip,
  Dropdown,
  Header,
  Link,
  ListBox,
  Tabs,
  Typography,
  cn,
} from '@heroui/react'
import { ChevronDown } from 'lucide-react'
import { useBoxRequests } from '@/synergy/shared/decisions'
import { useRemembered } from '@/synergy/shared/remembered'
import {
  DEFAULT_SORT,
  HISTORY_GROUP_LABEL,
  defaultRange,
  findBox,
  findProcess,
  historyBoxes,
  mainBoxes,
  boxProcessCaption,
  processCaption,
  processGroups,
  type Box as WorkBox,
  type DateRange,
  type ProcessGroup,
} from '@/synergy/shared/workflowData'
import { card, inline } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { START_CRUMB, WF_CRUMB, boxLink, processLink, useFrame } from '@/synergy/v1/paths'
import {
  EmptyNote,
  IC,
  IC_BLOCK,
  KaroSearch,
  RangeFields,
  SortMenu,
  TintIcon,
  useBand,
  type SortValue,
  Scroll,
} from '@/synergy/v1/parts'
import { RequestGrid } from '@/synergy/v1/RequestGrid'
import { Count, Indicator, RISE } from '@/synergy/v1/motion'

/*
 * İş Akış Yönetimi (/is-akislari/:box[/:processId]). Solda kutu sütunu (dar ekranda bandda kutu
 * seçici), sağda birincil renkte kutu bandı. Süreç seçili değilse süreç karoları; seçiliyse band
 * daralır, süreçler bandda sekmelere döner ve altında talep ızgarası çıkar.
 */

interface ListSettings {
  search: string
  sort: SortValue
  range: DateRange
}

export function WorkflowPage() {
  const params = useParams()
  const box = findBox(params.box)
  if (!box) return <Navigate to={boxLink('bekleyen')} replace />
  // Kutu sütunu kutu değişince yeniden takılmaz (seçim göstergesi kayar); sağdaki görünüm yeniden takılıp belirir
  return (
    <Box className="flex items-start gap-3">
      <BoxColumn current={box} />
      <BoxView key={box.id} box={box} processId={params.processId} />
    </Box>
  )
}

function BoxView({ box, processId }: { box: WorkBox; processId: string | undefined }) {
  const process = findProcess(processId)
  const [settings, setSettings] = useRemembered<ListSettings>(`karo:list:${box.id}`, () => ({
    search: '',
    sort: DEFAULT_SORT,
    range: defaultRange(box),
  }))
  const requests = useBoxRequests(box.id)
  const groups = useMemo(
    () =>
      processGroups(box, requests, {
        search: settings.search,
        sort: settings.sort,
        range: box.history ? settings.range : undefined,
      }),
    [box, requests, settings],
  )

  useFrame([
    START_CRUMB,
    WF_CRUMB,
    ...(process
      ? [
          { label: box.title, href: boxLink(box.id), icon: `box:${box.id}` },
          { label: boxProcessCaption(box, process), icon: `process:${process.id}` },
        ]
      : [{ label: box.title, icon: `box:${box.id}` }]),
  ])

  if (processId && !process) return <Navigate to={boxLink(box.id)} replace />

  return (
    <Box className="flex min-w-0 flex-1 flex-col gap-3">
      <Band
        box={box}
        compact={!!process}
        settings={settings}
        onChange={setSettings}
        groups={groups}
        processId={process?.id}
      />
      {process ? (
        <RequestGrid
          key={`${box.id}/${process.id}`}
          box={box}
          process={process}
          range={box.history ? settings.range : undefined}
        />
      ) : (
        <ProcessBento box={box} groups={groups} />
      )}
    </Box>
  )
}

/* --- Kutu sütunu ------------------------------------------------------------------------------- */

/** Seçili kutunun zemini kutudan kutuya kayar (geçmiş kutularında açık ton + halka). */
function BoxItem({ b, washed }: { b: WorkBox; washed?: boolean }) {
  const Icon = b.icon
  return (
    <ListBox.Item
      id={b.id}
      href={boxLink(b.id)}
      textValue={b.label}
      className={cn(
        // Ana ve geçmiş kutuları aynı yükseklikte; ana kutular kalın yazıyla ayrışır
        'relative h-11 bg-surface px-4 transition-colors data-hovered:bg-surface-hover',
        !washed && 'data-selected:text-accent-foreground',
      )}
    >
      {({ isSelected }) => (
        <>
          {isSelected && (
            <Indicator
              id="box-column"
              className={
                washed
                  ? 'bg-accent-soft ring-2 ring-accent-soft-foreground ring-inset'
                  : 'bg-accent'
              }
            />
          )}
          <Icon {...IC} size={washed ? 16 : 18} className="relative" />
          <Text
            slot="label"
            truncate
            className={cn('relative text-current', washed ? 'text-sm' : 'font-semibold')}
          >
            {b.label}
          </Text>
        </>
      )}
    </ListBox.Item>
  )
}

function BoxColumn({ current }: { current: WorkBox }) {
  return (
    <Box className="sticky top-0 hidden w-60 xl:block">
      <ListBox
        aria-label="İş Akış Yönetimi"
        selectionMode="single"
        selectedKeys={[current.id]}
        className="p-0"
      >
        <ListBox.Section className="gap-2">
          {mainBoxes.map((b) => (
            <BoxItem key={b.id} b={b} />
          ))}
        </ListBox.Section>
        <ListBox.Section className="mt-4 gap-2">
          <Header>{HISTORY_GROUP_LABEL}</Header>
          {historyBoxes.map((b) => (
            <BoxItem key={b.id} b={b} washed />
          ))}
        </ListBox.Section>
      </ListBox>
    </Box>
  )
}

/** Dar ekran: bandın başında kutu seçici (kutular ikonlarıyla). */
function BoxSwitcher({ current }: { current: WorkBox }) {
  const Icon = current.icon
  const band = useBand()
  const items = (boxes: WorkBox[]) =>
    boxes.map((b) => (
      <Dropdown.Item key={b.id} id={b.id} href={boxLink(b.id)} textValue={b.label}>
        <b.icon {...IC} className="text-muted" />
        {b.label}
        <Dropdown.ItemIndicator />
      </Dropdown.Item>
    ))
  return (
    <Dropdown>
      <Button
        variant="secondary"
        aria-label={`Kutu: ${current.label}`}
        className={cn(band.on, 'xl:hidden')}
      >
        <Icon {...IC} />
        {current.label}
        <ChevronDown {...IC} size={14} />
      </Button>
      <Dropdown.Popover placement="bottom start">
        <Dropdown.Menu
          aria-label="İş Akış Yönetimi"
          selectionMode="single"
          selectedKeys={[current.id]}
        >
          <Dropdown.Section>{items(mainBoxes)}</Dropdown.Section>
          <Dropdown.Section>
            <Header>{HISTORY_GROUP_LABEL}</Header>
            {items(historyBoxes)}
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}

/* --- Kutu bandı -------------------------------------------------------------------------------- */

function Band({
  box,
  compact,
  settings,
  onChange,
  groups,
  processId,
}: {
  box: WorkBox
  compact: boolean
  settings: ListSettings
  onChange: (s: ListSettings) => void
  groups: ProcessGroup[]
  processId: string | undefined
}) {
  const Icon = box.icon
  // Vurgu gücüne göre band (tema paneli)
  const band = useBand()
  return (
    // Band yerinde durur (kutu değişince yalnızca altındaki içerik belirir); süreç seçilince iç boşluğu yumuşakça daralır
    <Card
      className={cn(
        'gap-4 transition-[padding] duration-300 [--field-background:var(--surface)]',
        band.band,
        compact ? 'p-4' : 'p-6',
      )}
    >
      <Box className="flex flex-wrap items-center gap-3">
        <BoxSwitcher current={box} />
        {/* `min-w-48`: telefonda geçiş düğmesinin yanında "Bekleye…" diye kırpılıyordu; sığmazsa alt satıra iner */}
        <Box className="flex min-w-48 flex-1 items-center gap-3">
          {!compact && <Icon {...IC_BLOCK} size={26} />}
          {compact ? (
            <Link href={boxLink(box.id)} className="min-w-0 text-current">
              <Typography
                {...inline}
                truncate
                weight="bold"
                className="font-display text-2xl text-current"
              >
                {box.title}
              </Typography>
            </Link>
          ) : (
            <Typography.Heading
              level={1}
              truncate
              weight="bold"
              className="font-display text-2xl text-current sm:text-[2rem]"
            >
              {box.title}
            </Typography.Heading>
          )}
        </Box>
        <Box className="flex flex-wrap items-end gap-2">
          <KaroSearch
            value={settings.search}
            onChange={(search) => onChange({ ...settings, search })}
            className="w-64"
          />
          <SortMenu
            box={box}
            sort={settings.sort}
            onSort={(sort) => onChange({ ...settings, sort })}
            trigger="label"
            className={band.on}
          />
        </Box>
      </Box>
      {box.history && (
        <RangeFields
          value={settings.range}
          onChange={(range) => onChange({ ...settings, range })}
        />
      )}

      {/* Süreç sekmeleri: kap birincil rengin üstünde yarı saydam, seçili sekme beyaz */}
      {compact && (
        <Tabs selectedKey={processId ?? ''} className="min-w-0 animate-rise">
          <Scroll orientation="horizontal" hideScrollBar className="min-w-0">
            <Tabs.ListContainer
              className={cn('w-max', band.light ? 'bg-surface/70' : 'bg-current/10')}
            >
              <Tabs.List aria-label={box.title}>
                {groups.map(({ process: p, count }) => (
                  <Tabs.Tab
                    key={p.id}
                    id={p.id}
                    href={processLink(box.id, p.id)}
                    className={cn(
                      'gap-2 whitespace-nowrap data-selected:text-foreground',
                      band.light ? 'text-foreground/75' : 'text-current',
                    )}
                  >
                    <Tabs.Indicator />
                    <Typography
                      {...inline}
                      className="relative text-sm text-current"
                      title={processCaption(p)}
                    >
                      {box.id === 'taslaklar' ? p.form : p.name}
                    </Typography>
                    <Chip size="sm" variant="soft" className="relative min-w-6 justify-center">
                      <Count value={count} />
                    </Chip>
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Scroll>
        </Tabs>
      )}
    </Card>
  )
}

/* --- A: süreç karoları ------------------------------------------------------------------------- */

function ProcessBento({ box, groups }: { box: WorkBox; groups: ProcessGroup[] }) {
  if (!groups.length)
    return (
      <Card className={RISE}>
        <EmptyNote text="Gösterilecek veri yok." />
      </Card>
    )
  const countLabel = box.id === 'taslaklar' ? 'Taslak Sayısı' : 'Talep Sayısı'
  return (
    // Kompakt kartlar: geniş ekranda satırda 6
    <Box
      role="list"
      aria-label={box.title}
      className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
    >
      {/* Karo üzerine gelince kalkar, gölge derinleşir, ikon büyür */}
      {groups.map(({ process: p, count }) => (
        <Box role="listitem" key={p.id} className="flex">
          <Link
            href={processLink(box.id, p.id)}
            aria-label={`${processCaption(p)}, ${countLabel} ${count}`}
            className="w-full no-underline"
          >
            <Card
              className={cn(
                'group/tile h-full min-h-28 w-full gap-3 p-4 transition duration-200 hover:-translate-y-1 hover:bg-surface-secondary hover:shadow-[0_12px_28px_-14px_oklch(0_0_0/0.3)]',
                card,
              )}
            >
              <Box className="flex items-start justify-between gap-2">
                <TintIcon
                  icon={p.icon}
                  size="sm"
                  className="transition-transform duration-200 group-hover/tile:scale-110"
                />
                <Typography
                  {...inline}
                  weight="bold"
                  className="font-display text-2xl leading-none"
                >
                  <Count value={count} />
                </Typography>
              </Box>
              <Box className="mt-auto min-w-0">
                <Text tone="muted" truncate className="block text-xs">
                  {p.project}
                </Text>
                <Typography {...inline} weight="semibold" className="line-clamp-2 text-sm">
                  {box.id === 'taslaklar' ? p.form : p.name}
                </Typography>
              </Box>
            </Card>
          </Link>
        </Box>
      ))}
    </Box>
  )
}
