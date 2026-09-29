import { useMemo } from 'react'
import { Navigate, useParams } from 'react-router'
import { Card, Chip, Link, ListBox, ScrollShadow, Separator, Typography, cn } from '@heroui/react'
import { ArrowUpRight } from 'lucide-react'
import { useBoxCounts, useBoxRequests } from '@/synergy/shared/decisions'
import { useRemembered } from '@/synergy/shared/remembered'
import {
  DEFAULT_SORT,
  HISTORY_GROUP_LABEL,
  defaultRange,
  findBox,
  findProcess,
  formatDateTime,
  historyBoxes,
  mainBoxes,
  boxProcessCaption,
  processCaption,
  processGroups,
  relative,
  type Box as WorkBox,
  type DateRange,
  type ProcessGroup,
} from '@/synergy/shared/workflowData'
import { inline, timeOf } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { START_CRUMB, WF_CRUMB, boxLink, processLink, useCrumbs } from '@/synergy/v2/paths'
import { DISPLAY, Empty, FILL, ACCENT_TEXT, IC, IconTile, PANEL, RangeFields, Search, SortMenu, useHero, type SortValue } from '@/synergy/v2/parts'
import { BentoRequestGrid } from '@/synergy/v2/RequestGrid'

/*
 * İş Akış Yönetimi (/v2/is-akislari/:box[/:processId]) bento ızgarada:
 *   Üstte tam genişlik açık tonlu başlık karosu: bağlam ve gezinme (kutu adı, arama, sıralama,
 *   kutular sayılı haplar halinde, "Geçmiş" ayrı grup; geçmişte tarih aralığı).
 *   Süreç seçili değilse içerik kartları (proje etiketi, süreç, altta sayı + son tarih şeridi);
 *   seçiliyse solda süreç listesi, sağda talep ızgarası.
 */

interface ListSettings {
  search: string
  sort: SortValue
  range: DateRange
}

export function BentoWorkflow() {
  const params = useParams()
  const box = findBox(params.box)
  if (!box) return <Navigate to={boxLink('bekleyen')} replace />
  return <BoxView key={box.id} box={box} processId={params.processId} />
}

function BoxView({ box, processId }: { box: WorkBox; processId: string | undefined }) {
  const process = findProcess(processId)
  const [settings, setSettings] = useRemembered<ListSettings>(`bento:list:${box.id}`, () => ({ search: '', sort: DEFAULT_SORT, range: defaultRange(box) }))
  const requests = useBoxRequests(box.id)
  const groups = useMemo(
    () => processGroups(box, requests, { search: settings.search, sort: settings.sort, range: box.history ? settings.range : undefined }),
    [box, requests, settings],
  )

  useCrumbs([START_CRUMB, WF_CRUMB, ...(process ? [{ label: box.title, href: boxLink(box.id) }, { label: boxProcessCaption(box, process) }] : [{ label: box.title }])])

  const { hero, fill, reset } = useHero()
  if (processId && !process) return <Navigate to={boxLink(box.id)} replace />
  const Icon = box.icon

  return (
    <Box className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Başlık karosu (açık ton): bağlam ve gezinme — kutu adı, arama / sıralama, kutu hapları */}
      <Card className={cn('relative gap-5 overflow-hidden rounded-3xl p-5 sm:p-6 lg:col-span-12', hero)}>
        <Box className="relative flex flex-wrap items-center gap-4">
          <Box className="flex min-w-0 flex-1 items-center gap-3">
            <Box aria-hidden className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', fill)}>
              <Icon {...IC} size={20} />
            </Box>
            <Box className="flex min-w-0 flex-col">
              <Text tone="muted" className="text-xs font-medium">
                İş Akış Yönetimi
              </Text>
              <Typography.Heading level={1} truncate className={cn(DISPLAY, 'text-2xl text-current! sm:text-3xl')}>
                {box.title}
              </Typography.Heading>
            </Box>
          </Box>
          {/* Denetimler beyaz yüzeyde; alan rengi yüzeyden */}
          <Box className={cn('flex w-full flex-wrap items-center gap-2 [--field-background:var(--surface)] sm:w-auto', reset)}>
            <Search value={settings.search} onChange={(search) => setSettings({ ...settings, search })} className="min-w-48 flex-1 sm:w-64" />
            <SortMenu box={box} sort={settings.sort} onSort={(sort) => setSettings({ ...settings, sort })} className="rounded-full text-foreground" />
          </Box>
        </Box>
        <BoxNav current={box} />
        {box.history && (
          <Box className={cn('relative w-fit rounded-2xl bg-surface p-3 text-foreground', reset)}>
            <RangeFields value={settings.range} onChange={(range) => setSettings({ ...settings, range })} />
          </Box>
        )}
      </Card>

      {process ? (
        <>
          <ProcessRail box={box} groups={groups} selectedId={process.id} />
          <Box className="min-w-0 lg:col-span-9">
            <BentoRequestGrid key={`${box.id}/${process.id}`} box={box} process={process} range={box.history ? settings.range : undefined} />
          </Box>
        </>
      ) : (
        <ProcessTiles box={box} groups={groups} />
      )}
    </Box>
  )
}

/* --- Kutu gezinmesi (başlık karosunda haplar) ------------------------------------------------- */

const PILL = 'h-9 shrink-0 gap-2 rounded-full px-3.5 text-sm font-semibold whitespace-nowrap no-underline transition-colors'

function BoxNav({ current }: { current: WorkBox }) {
  const counts = useBoxCounts()
  const { glass, fill } = useHero()
  const pill = (b: WorkBox, withCount: boolean) => {
    const on = b.id === current.id
    const Icon = b.icon
    return (
      <Link
        key={b.id}
        href={boxLink(b.id)}
        aria-current={on ? 'page' : undefined}
        className={cn(PILL, on ? fill : cn(glass, 'text-foreground/75 hover:text-foreground'))}
      >
        <Icon {...IC} />
        {b.label}
        {withCount && (
          <Typography {...inline} className={cn('font-mono text-xs text-current!', !on && 'opacity-60')}>
            {counts.get(b.id) ?? 0}
          </Typography>
        )}
      </Link>
    )
  }
  return (
    <ScrollShadow orientation="horizontal" hideScrollBar className="relative -mx-1">
      <Box role="navigation" aria-label="İş Akış Yönetimi" className="flex w-max items-center gap-2 px-1">
        {mainBoxes.map((b) => pill(b, true))}
        <Separator orientation="vertical" className="mx-1 h-6" />
        <Text tone="muted" className="text-xs font-semibold">
          {HISTORY_GROUP_LABEL}
        </Text>
        {historyBoxes.map((b) => pill(b, false))}
      </Box>
    </ScrollShadow>
  )
}

/* --- Süreç karoları (süreç seçili değil) ------------------------------------------------------- */

function ProcessTiles({ box, groups }: { box: WorkBox; groups: ProcessGroup[] }) {
  const isDraft = box.id === 'taslaklar'
  const countLabel = isDraft ? 'Taslak Sayısı' : 'Talep Sayısı'
  if (!groups.length)
    return (
      <Card className={cn(PANEL, 'lg:col-span-12')}>
        <Empty text="Gösterilecek veri yok." />
      </Card>
    )
  return (
    <Box role="list" aria-label={box.title} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-12 xl:grid-cols-3 2xl:grid-cols-4">
      {groups.map(({ process: p, count, latest }) => (
        <Box role="listitem" key={p.id} className="flex">
          {/* İçerik kartı: proje etiketi, süreç, altta ölçü şeridi (sayı + son tarih); bağlantı kartın tamamı */}
          <Link
            href={processLink(box.id, p.id)}
            aria-label={`${processCaption(p)}, ${countLabel} ${count}`}
            className={cn(PANEL, 'group w-full flex-col items-stretch gap-0 overflow-hidden text-foreground no-underline transition-shadow hover:shadow-(--overlay-shadow)')}
          >
            <Box className="flex flex-col gap-4 p-5">
              <Box className="flex items-center justify-between gap-2">
                <Chip size="sm" variant="soft" className="max-w-full truncate rounded-full">
                  {p.project}
                </Chip>
                <ArrowUpRight {...IC} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-soft-foreground" />
              </Box>
              <Box className="flex items-center gap-3">
                <IconTile icon={p.icon} solid />
                <Text tone="primary" className="min-w-0 text-base leading-snug font-bold">
                  {isDraft ? p.form : p.name}
                </Text>
              </Box>
            </Box>
            {/* Ölçü şeridi */}
            <Box className="mt-auto flex items-end justify-between gap-3 border-t border-border bg-surface-secondary px-5 py-3">
              <Box className="flex flex-col">
                <Text tone="muted" className="text-[0.6875rem] font-medium">
                  {countLabel}
                </Text>
                <Typography {...inline} className={cn(DISPLAY, 'text-2xl leading-none tabular-nums', ACCENT_TEXT)}>
                  {count}
                </Typography>
              </Box>
              <Box className="flex flex-col items-end">
                <Text tone="muted" className="text-[0.6875rem] font-medium">
                  Son tarih
                </Text>
                <Typography {...inline} {...timeOf(latest)} title={formatDateTime(latest)} className="text-sm font-medium text-foreground/80!">
                  {relative(latest)}
                </Typography>
              </Box>
            </Box>
          </Link>
        </Box>
      ))}
    </Box>
  )
}

/* --- Süreç karosu (süreç seçili) --------------------------------------------------------------- */

function ProcessRail({ box, groups, selectedId }: { box: WorkBox; groups: ProcessGroup[]; selectedId: string }) {
  const isDraft = box.id === 'taslaklar'
  return (
    <Card className={cn(PANEL, 'gap-0 p-3 lg:sticky lg:top-20 lg:col-span-3 lg:self-start')}>
      <Typography className="px-2 pt-1 pb-2 text-xs font-semibold text-muted">Süreçler</Typography>
      <ListBox aria-label={box.title} selectionMode="single" selectedKeys={[selectedId]} className="max-h-[32rem] gap-1 overflow-y-auto p-0">
        {groups.map(({ process: p, count }) => {
          const on = p.id === selectedId
          return (
            <ListBox.Item
              key={p.id}
              id={p.id}
              href={processLink(box.id, p.id)}
              textValue={processCaption(p)}
              className={cn('gap-3 rounded-2xl px-3 py-2', on ? FILL : 'data-hovered:bg-surface-secondary')}
            >
              <Box className="min-w-0 flex-1">
                <Text truncate className="block text-[0.6875rem] text-current! opacity-70">
                  {p.project}
                </Text>
                <Text truncate className="block text-sm font-semibold text-current!">
                  {isDraft ? p.form : p.name}
                </Text>
              </Box>
              <Typography {...inline} className={cn(DISPLAY, 'text-base text-current! tabular-nums')}>
                {count}
              </Typography>
            </ListBox.Item>
          )
        })}
      </ListBox>
    </Card>
  )
}
