import { useMemo } from 'react'
import { MousePointerClick } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { Card, Flex, Tag, Typography } from 'antd'
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
  processCaption,
  processGroups,
  type Box as WorkBox,
  type DateRange,
  type ProcessGroup,
} from '@/synergy/shared/workflowData'
import { WF_HOME, boxLink, processLink } from '@/synergy/paths'
import { START_LABELS } from '@/synergy/shared/startLabels'
import { CARD, IC, Scroll, cn } from '@/synergy/ant/ui'
import { EmptyNote, SearchField, RangeFields, SortMenu, type SortValue } from '@/synergy/ant/parts'
import { RequestGrid } from '@/synergy/RequestGrid'
import { AgendaTabs, type AgendaTab } from '@/synergy/AgendaTabs'
import { Count, Indicator } from '@/synergy/ant/motion'

/*
 * İş Akış Yönetimi (/is-akislari/:box/:processId), antd. Kutular üstte araç çubuğunda çipler
 * (`AgendaTabs`; geçmiş kutuları "Geçmiş" başlığıyla ayraçtan sonra). Ayrı bir başlık bandı yok
 * (kutunun adı seçili çipte); solda süreç listesi (%20; üstünde arama,
 * sıralama, geçmişte tarih aralığı), sağda seçili sürecin talep ızgarası. Hiçbir şey kendiliğinden
 * seçilmez: `/is-akislari`'de kutu, kutuda süreç seçili değildir (boş durum; raf ve uygulama
 * bağlantıları buraya gelir). Kutu değişince içerik seçilen çipin yönünden gelir. Talebe basınca
 * talep bu sekmede listenin üstünde açılır (liste altta kalır, "Kapat" ona döner).
 */

/** Kutu seçili değilken (104028). */
const PICK_ITEM = 'Görüntülemek için bir öğe seçin'

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
  const box = params.box ? findBox(params.box) : undefined
  // Adresteki kutu yoksa boş duruma
  if (params.box && !box) return <Navigate to={WF_HOME} replace />
  return (
    <AgendaTabs label="İş Akış Yönetimi" tabs={TABS} active={box?.id}>
      {box ? <BoxView key={box.id} box={box} processId={params.processId} /> : <Idle />}
    </AgendaTabs>
  )
}

/** Boş durum: hiçbir kutu seçili değil. */
function Idle() {
  return (
    <Card
      className={cn(CARD, '@4xl:flex-1')}
      classNames={{ body: 'flex h-full items-center justify-center' }}
    >
      <EmptyNote icon={MousePointerClick} text={PICK_ITEM} className="py-16" />
    </Card>
  )
}

function BoxView({ box, processId }: { box: WorkBox; processId: string | undefined }) {
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
  // Süreç kendiliğinden seçilmez; adresteki süreç yoksa kutunun boş durumuna dönülür (aşağıda)
  const process = findProcess(processId)

  if (processId && !process) return <Navigate to={boxLink(box.id)} replace />
  return (
    <Flex className="flex flex-col gap-3 @4xl:min-h-0 @4xl:flex-1">
      {/* Kutunun adı seçili çipte yazıyor; sayfa başlığı yalnızca ekran okuyucu için */}
      <Typography.Title level={1} className="sr-only">
        {box.title}
      </Typography.Title>
      {groups.length === 0 && !process ? (
        <Card className={cn(CARD, '@4xl:flex-1')}>
          <EmptyNote text="Gösterilecek veri yok." />
        </Card>
      ) : (
        // Süreç kartı ızgarayla aynı boyda (aşağıya kadar uzanır)
        <Flex className="flex flex-col gap-3 @4xl:min-h-0 @4xl:flex-1 @4xl:flex-row @4xl:items-stretch">
          <ProcessList
            box={box}
            groups={groups}
            selectedId={process?.id}
            settings={settings}
            onChange={setSettings}
          />
          <Flex className="flex w-full min-w-0 flex-1 flex-col @4xl:min-h-0">
            {process ? (
              <RequestGrid
                key={`${box.id}/${process.id}`}
                box={box}
                process={process}
                range={box.history ? settings.range : undefined}
              />
            ) : (
              // Boş durum: süreç seçilmedi (Başlangıç'taki iş bloğuyla aynı ileti)
              <Card
                className={cn(CARD, '@4xl:flex-1')}
                classNames={{ body: 'flex h-full items-center justify-center' }}
              >
                <EmptyNote
                  icon={MousePointerClick}
                  text={box.id === 'taslaklar' ? START_LABELS.pickDraft : START_LABELS.pickProcess}
                  className="py-16"
                />
              </Card>
            )}
          </Flex>
        </Flex>
      )}
    </Flex>
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
  settings,
  onChange,
}: {
  box: WorkBox
  groups: ProcessGroup[]
  selectedId: string | undefined
  settings: ListSettings
  onChange: (s: ListSettings) => void
}) {
  const isDraft = box.id === 'taslaklar'
  const countLabel = isDraft ? 'Taslak Sayısı' : 'Talep Sayısı'
  return (
    <Card
      className={cn(
        CARD,
        'w-full shrink-0 @4xl:flex @4xl:min-h-0 @4xl:w-1/5 @4xl:min-w-56 @4xl:flex-col',
      )}
      classNames={{ body: 'flex flex-col gap-1 p-2 @4xl:min-h-0 @4xl:flex-1' }}
    >
      {/* Üstte süzgeçler: arama ve sıralama (geçmiş kutularında tarih aralığı da) */}
      <Flex className="flex shrink-0 flex-col gap-2 p-1 pb-2">
        <Flex className="flex items-center gap-1.5">
          <SearchField
            value={settings.search}
            onChange={(search) => onChange({ ...settings, search })}
            className="min-w-0 flex-1"
          />
          <SortMenu
            box={box}
            sort={settings.sort}
            onSort={(sort) => onChange({ ...settings, sort })}
          />
        </Flex>
        {box.history && (
          <RangeFields
            stacked
            value={settings.range}
            onChange={(range) => onChange({ ...settings, range })}
          />
        )}
      </Flex>
      <Flex aria-hidden className="flex justify-between px-3 pt-1 pb-1.5">
        {['Süreç', countLabel].map((t) => (
          <Typography.Text key={t} type="secondary" className="text-xs">
            {t}
          </Typography.Text>
        ))}
      </Flex>
      <Scroll
        className="flex max-h-[60dvh] flex-col gap-0.5 @4xl:max-h-none @4xl:min-h-0 @4xl:flex-1"
        role="navigation"
        aria-label={box.title}
      >
        {groups.length === 0 && (
          <Typography.Text type="secondary" className="px-3 py-6 text-center text-sm">
            Gösterilecek veri yok.
          </Typography.Text>
        )}
        {groups.map(({ process: p, count }) => {
          const on = p.id === selectedId
          const Icon = p.icon
          return (
            <Link
              key={p.id}
              to={processLink(box.id, p.id)}
              aria-current={on ? 'page' : undefined}
              aria-label={`${processCaption(p)}, ${countLabel} ${count}`}
              className={cn(
                'relative flex w-full items-center gap-3 rounded-xl px-3 py-2 no-underline transition-colors hover:no-underline',
                on ? 'text-accent-foreground' : 'text-foreground hover:bg-surface-secondary',
              )}
            >
              {on && <Indicator id="wf-process" className="bg-accent" />}
              <Icon {...IC} className="relative shrink-0 opacity-80" />
              <Flex vertical className="relative min-w-0 flex-1">
                <Typography.Text className="block text-xs text-current opacity-65 truncate">
                  {p.project}
                </Typography.Text>
                <Typography.Text className="block text-sm font-medium text-current truncate">
                  {isDraft ? p.form : p.name}
                </Typography.Text>
              </Flex>
              <Tag
                variant="filled"
                className={cn(
                  'relative me-0 min-w-7 rounded-full border-0 text-center text-xs leading-5 font-semibold',
                  on ? 'bg-accent-foreground text-accent' : 'bg-surface-secondary text-foreground',
                )}
              >
                <Count value={count} />
              </Tag>
            </Link>
          )
        })}
      </Scroll>
    </Card>
  )
}
