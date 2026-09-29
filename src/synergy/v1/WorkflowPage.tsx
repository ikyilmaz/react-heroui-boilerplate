import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router'
import { Card, Chip, Link, Typography, cn } from '@heroui/react'
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
  Scroll,
  SortMenu,
  useBand,
  type SortValue,
} from '@/synergy/v1/parts'
import { RequestGrid } from '@/synergy/v1/RequestGrid'
import { AgendaTabs, type AgendaTab } from '@/synergy/v1/AgendaTabs'
import { Count, Indicator, TabEnter } from '@/synergy/v1/motion'

/*
 * İş Akış Yönetimi (/is-akislari/:box/:processId). Kutular üstte ajanda sekmeleri (geçmiş kutuları
 * "Geçmiş" başlığıyla şeridin sağında); seçili sekme içeriği saran kaba kaynaşır. Kabın içinde
 * kutu bandı (başlık, arama, sıralama, geçmişte tarih aralığı), altında solda süreç listesi (%20),
 * sağda seçili sürecin talep ızgarası. Kutuya girince listedeki ilk süreç seçilir. Kutu değişince
 * içerik anında değişir, yalnızca başlık kısa kayar (form sekmelerindeki gibi).
 */

interface ListSettings {
  search: string
  sort: SortValue
  range: DateRange
}

const TABS: AgendaTab[] = [
  ...mainBoxes.map((b) => ({ id: b.id, label: b.label, href: boxLink(b.id), icon: b.icon })),
  ...historyBoxes.map((b) => ({
    id: b.id,
    label: b.label,
    href: boxLink(b.id),
    icon: b.icon,
    group: HISTORY_GROUP_LABEL,
  })),
]

export function WorkflowPage() {
  const params = useParams()
  const box = findBox(params.box)
  if (!box) return <Navigate to={boxLink('bekleyen')} replace />
  return (
    <AgendaTabs label="İş Akış Yönetimi" tabs={TABS} active={box.id}>
      <TabEnter active={box.id} className="flex flex-col lg:min-h-0 lg:flex-1">
        <BoxView key={box.id} box={box} processId={params.processId} />
      </TabEnter>
    </AgendaTabs>
  )
}

function BoxView({ box, processId }: { box: WorkBox; processId: string | undefined }) {
  const navigate = useNavigate()
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
  // Süreç seçili değilse (ya da adresteki süreç yoksa) listedeki ilk süreç seçilir. İçerik hemen
  // ilk süreçle çizilir, adres arkadan düzeltilir (araya boş kare ve ikinci kurulum girmez).
  const first = groups[0]?.process.id
  const process = findProcess(processId) ?? (first ? findProcess(first) : undefined)
  const fix = !findProcess(processId) && first ? processLink(box.id, first) : null
  useEffect(() => {
    if (fix) navigate(fix, { replace: true })
  }, [fix, navigate])

  useFrame([
    START_CRUMB,
    WF_CRUMB,
    { label: box.title, href: boxLink(box.id), icon: `box:${box.id}` },
    ...(process ? [{ label: boxProcessCaption(box, process), icon: `process:${process.id}` }] : []),
  ])

  return (
    <Box className="flex flex-col gap-3 lg:min-h-0 lg:flex-1">
      <Band box={box} settings={settings} onChange={setSettings} />
      {groups.length === 0 && !process ? (
        <Card className={cn(card, 'lg:flex-1')}>
          <EmptyNote text="Gösterilecek veri yok." />
        </Card>
      ) : (
        // Süreç kartı ızgarayla aynı boyda (aşağıya kadar uzanır)
        <Box className="flex flex-col gap-3 lg:min-h-0 lg:flex-1 lg:flex-row lg:items-stretch">
          <ProcessList box={box} groups={groups} selectedId={process?.id} />
          {process && (
            <Box className="flex w-full min-w-0 flex-1 flex-col lg:min-h-0">
              <RequestGrid
                key={`${box.id}/${process.id}`}
                box={box}
                process={process}
                range={box.history ? settings.range : undefined}
              />
            </Box>
          )}
        </Box>
      )}
    </Box>
  )
}

/* --- Kutu bandı -------------------------------------------------------------------------------- */

function Band({
  box,
  settings,
  onChange,
}: {
  box: WorkBox
  settings: ListSettings
  onChange: (s: ListSettings) => void
}) {
  const Icon = box.icon
  // Vurgu gücüne göre band (tema paneli)
  const band = useBand()
  return (
    <Card className={cn('shrink-0 gap-4 p-5 [--field-background:var(--surface)]', band.band)}>
      <Box className="flex flex-wrap items-center gap-3">
        <Box className="flex min-w-48 flex-1 items-center gap-3">
          <Icon {...IC_BLOCK} size={26} />
          <Typography.Heading
            level={1}
            truncate
            weight="bold"
            // `data-tab-cue`: kutu değişince kısa kayarak yenilenir (TabEnter)
            data-tab-cue
            className="font-display text-2xl text-current"
          >
            {box.title}
          </Typography.Heading>
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
    </Card>
  )
}

/* --- Süreç listesi ----------------------------------------------------------------------------- */

/**
 * Soldaki süreç listesi (%20): proje üstte küçük, süreç adı, talep sayısı; seçili süreç dolu
 * birincil renkte ve seçim zemini süreçten sürece kayar. Uzun listede kendi içinde kayar.
 */
function ProcessList({
  box,
  groups,
  selectedId,
}: {
  box: WorkBox
  groups: ProcessGroup[]
  selectedId: string | undefined
}) {
  const isDraft = box.id === 'taslaklar'
  const countLabel = isDraft ? 'Taslak Sayısı' : 'Talep Sayısı'
  return (
    <Card className={cn(card, 'w-full shrink-0 gap-1 p-2 lg:min-h-0 lg:w-1/5 lg:min-w-56')}>
      <Box aria-hidden className="flex justify-between px-3 pt-1 pb-1.5">
        {['Süreç', countLabel].map((t) => (
          <Text key={t} tone="muted" className="text-xs">
            {t}
          </Text>
        ))}
      </Box>
      <Scroll
        className="flex max-h-[60dvh] flex-col gap-0.5 lg:max-h-none lg:min-h-0 lg:flex-1"
        role="navigation"
        aria-label={box.title}
      >
        {groups.length === 0 && (
          <Text tone="muted" className="px-3 py-6 text-center text-sm">
            Gösterilecek veri yok.
          </Text>
        )}
        {groups.map(({ process: p, count }) => {
          const on = p.id === selectedId
          const Icon = p.icon
          return (
            <Link
              key={p.id}
              href={processLink(box.id, p.id)}
              aria-current={on ? 'page' : undefined}
              aria-label={`${processCaption(p)}, ${countLabel} ${count}`}
              className={cn(
                'relative flex w-full items-center gap-3 rounded-xl px-3 py-2 no-underline transition-colors hover:no-underline',
                on ? 'text-accent-foreground' : 'text-foreground hover:bg-surface-secondary',
              )}
            >
              {on && <Indicator id="wf-process" className="bg-accent" />}
              <Icon {...IC} className="relative shrink-0 opacity-80" />
              <Box className="relative min-w-0 flex-1">
                <Typography {...inline} truncate className="block text-xs text-current! opacity-65">
                  {p.project}
                </Typography>
                <Typography
                  {...inline}
                  truncate
                  weight="medium"
                  className="block text-sm text-current!"
                >
                  {isDraft ? p.form : p.name}
                </Typography>
              </Box>
              <Chip
                size="sm"
                className={cn(
                  'relative min-w-7 justify-center font-semibold',
                  on ? 'bg-accent-foreground text-accent' : 'bg-surface-secondary',
                )}
              >
                <Count value={count} />
              </Chip>
            </Link>
          )
        })}
      </Scroll>
    </Card>
  )
}
