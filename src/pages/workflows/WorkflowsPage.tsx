import { useMemo, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import {
  Avatar,
  Card,
  Chip,
  EmptyState,
  Popover,
  SearchField,
  Surface,
  Typography,
  cn,
} from '@heroui/react'
import { ChevronDown, Zap } from 'lucide-react'
import { useBoxRequests } from '@/pages/workflows/decisions'
import { ProcessRequests } from '@/pages/workflows/ProcessRequestsPage'
import { BoxHeader } from '@/pages/workflows/layouts/BoxHeader'
import { InboxLayout } from '@/pages/workflows/layouts/InboxLayout'
import { useThemeTweaks } from '@/theme/tweaks'
import {
  avatarColor,
  findBox,
  initials,
  processes,
  relative,
  type Box as WorkBox,
  type Process,
  type WorkRequest,
} from '@/pages/workflows/workflowData'
import { Box, Text } from '@/pages/workspace/ui'
import { card, tile } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * İş Akış Yönetimi · kutu görünümü
 *
 * Orijinaldeki iki panelli kurgu (solda kutular, sağda süreç listesi) yerine panelsiz, tek akışlı
 * bir sayfa: kutular başlığın altında HeroUI `Tabs`, süreçler seçili sekmenin panelinde
 * (`Tabs.Panel`) zeminde duran `Card`'lar. Karta tıklamak sürecin taleplerini karta tutturulmuş
 * bir `Popover`'da açar (tam sayfa da mümkün).
 * Arama `SearchField`, sayılar `Chip`, talep sahipleri `Avatar`, boş durum `EmptyState`.
 * ------------------------------------------------------------------------------------------------- */

/** Popover'ın rahat açılması için kartın altında istenen boşluk (px). */
const POPOVER_ROOM = 560

/** Kart altındaki avatar yığınında gösterilen en fazla kişi. */
const MAX_AVATARS = 3

/** Yığındaki avatarlar birbirinin üstüne biner; zemin renginde halka araya boşluk koyar. */
const stacked = '-ml-1.5 ring-2 ring-(--background) first:ml-0'

/**
 * Süreç kartı. Tıklayınca yeni sayfaya gitmek yerine kartın hemen yanına tutturulmuş büyük bir
 * popover açılır ve sürecin talep listesini (`ProcessRequests`) içinde gösterir. Popover portal
 * ile `body`'ye basıldığı için kabuğun `.soft-theme`'i oraya ulaşmaz; sınıf içerikte yeniden
 * veriliyor. Zemin, gölge ve ok HeroUI'nin kendi `overlay` token'larından gelir.
 */
function ProcessCard({
  box,
  process: p,
  items,
}: {
  box: WorkBox
  process: Process
  items: WorkRequest[]
}) {
  const [isOpen, setOpen] = useState(false)
  const triggerRef = useRef<HTMLDivElement>(null)
  const Icon = p.icon

  // Büyük popover kartın altına sığsın diye önce kartı görünümün üstüne yaklaştır, sonra aç.
  // Açıkken RAC sayfa kaydırmayı kilitlediği için kaydırmanın açılmadan önce yapılması gerekiyor.
  const openChange = (open: boolean) => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!open || !rect || window.innerHeight - rect.bottom >= POPOVER_ROOM) return setOpen(open)
    window.scrollBy({ top: rect.top - 96, behavior: 'instant' })
    requestAnimationFrame(() => setOpen(true))
  }
  const urgent = items.filter((r) => r.template.urgent).length
  const unread = items.filter((r) => !r.read).length
  const oldest = items.reduce((a, b) => (a.createdAt < b.createdAt ? a : b))
  const requesters = [...new Set(items.map((r) => r.requester.name))]
  const hidden = requesters.length - MAX_AVATARS

  return (
    <Popover isOpen={isOpen} onOpenChange={openChange}>
      <Popover.Trigger
        ref={triggerRef}
        aria-label={`${p.name}, ${items.length} talep`}
        className="group h-full w-full cursor-default rounded-card outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-(--focus)"
      >
        <Card
          className={cn(
            card,
            'h-full gap-4 p-4 transition duration-200 group-hover:bg-(--surface-hover)',
            isOpen && 'bg-(--surface-hover) ring-2 ring-(--accent)',
          )}
        >
          <Card.Header className="flex-row items-start justify-between gap-3">
            <Surface
              variant="tertiary"
              className={cn('grid size-10 place-items-center rounded-pill text-foreground', tile)}
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden />
            </Surface>
            <Chip
              variant="primary"
              color={urgent ? 'danger' : 'success'}
              className="size-9 justify-center text-sm font-semibold tabular-nums"
            >
              {items.length}
            </Chip>
          </Card.Header>

          <Card.Content className="flex-1">
            <Card.Title className="text-base font-semibold">{p.name}</Card.Title>
            <Card.Description className="mt-0.5 text-[0.8125rem] text-foreground/45">
              {p.department}
            </Card.Description>
            <Box className="mt-2 flex flex-wrap gap-1.5">
              {urgent > 0 && (
                <Chip size="sm" variant="primary" color="danger">
                  <Zap size={11} strokeWidth={2} aria-hidden />
                  {urgent} acil
                </Chip>
              )}
              {unread > 0 && <Chip size="sm">{unread} okunmamış</Chip>}
            </Box>
          </Card.Content>

          <Card.Footer className="items-center justify-between gap-3">
            <Box className="flex items-center">
              {requesters.slice(0, MAX_AVATARS).map((n) => (
                <Avatar key={n} size="sm" color={avatarColor(n)} className={stacked}>
                  <Avatar.Fallback className="font-semibold">{initials(n)}</Avatar.Fallback>
                </Avatar>
              ))}
              {hidden > 0 && (
                <Avatar size="sm" className={stacked}>
                  <Avatar.Fallback className="font-semibold">+{hidden}</Avatar.Fallback>
                </Avatar>
              )}
            </Box>
            <Text tone="muted" className="flex items-center gap-1 text-xs">
              En eski talep {relative(oldest.createdAt)}
              <ChevronDown
                size={15}
                strokeWidth={1.5}
                className={cn(
                  'transition',
                  isOpen ? 'rotate-180 opacity-100' : 'opacity-0 group-hover:opacity-100',
                )}
                aria-hidden
              />
            </Text>
          </Card.Footer>
        </Card>
      </Popover.Trigger>

      <Popover.Content
        placement="bottom start"
        offset={14}
        containerPadding={24}
        maxHeight={720}
        className={cn(
          'soft-theme flex w-[min(60rem,calc(100vw-3rem))] flex-col rounded-panel',
          tile,
        )}
      >
        <Popover.Arrow />
        <Popover.Dialog
          aria-label={p.name}
          className="min-h-0 flex-1 overflow-y-auto rounded-panel p-5 outline-none"
        >
          <ProcessRequests box={box} process={p} embedded onClose={() => setOpen(false)} />
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

/** Pano: süreç önce. Süreç kartları; karta tıklamak talepleri popover'da açar. */
function PanoLayout({ box }: { box: WorkBox }) {
  const [query, setQuery] = useState('')
  const requests = useBoxRequests(box.id)

  const groups = useMemo(() => {
    const q = query.toLocaleLowerCase('tr')
    return processes
      .map((p) => ({ process: p, items: requests.filter((r) => r.processId === p.id) }))
      .filter((g) => g.items.length > 0)
      .filter((g) =>
        `${g.process.name} ${g.process.department}`.toLocaleLowerCase('tr').includes(q),
      )
  }, [requests, query])

  const summary = box.summary
    .replace('{n}', String(requests.length))
    .replace('{p}', String(groups.length))
  const hasAny = requests.length > 0

  // Kartlar (ya da boş durum) seçili kutu sekmesinin panelinde (`BoxHeader` › `Tabs.Panel`)
  return (
    <BoxHeader
      box={box}
      summary={summary}
      actions={
        <SearchField
          value={query}
          onChange={setQuery}
          aria-label="Süreç veya birim ara"
          className="w-72"
        >
          <SearchField.Group>
            <SearchField.SearchIcon />
            <SearchField.Input placeholder="Süreç veya birim ara…" />
            <SearchField.ClearButton />
          </SearchField.Group>
        </SearchField>
      }
    >
      {groups.length > 0 ? (
        <Box
          role="list"
          aria-label="Süreçler"
          className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4"
        >
          {groups.map(({ process: p, items }) => (
            <Box role="listitem" key={p.id}>
              <ProcessCard box={box} process={p} items={items} />
            </Box>
          ))}
        </Box>
      ) : (
        <EmptyState className="flex flex-col items-center gap-3 py-14 text-center">
          <Surface
            variant="tertiary"
            className={cn('grid size-14 place-items-center rounded-pill', tile)}
          >
            <box.icon size={28} strokeWidth={1.25} className="text-foreground/65" aria-hidden />
          </Surface>
          <Typography.Heading level={2} className="text-base font-semibold">
            {hasAny ? 'Aramanızla eşleşen süreç yok' : `${box.label} kutunuz boş`}
          </Typography.Heading>
          <Typography className="text-sm text-foreground/45">
            {hasAny
              ? 'Farklı bir süreç adı veya birim deneyin.'
              : 'Yeni bir şey geldiğinde burada göreceksiniz.'}
          </Typography>
        </EmptyState>
      )}
    </BoxHeader>
  )
}

/**
 * Kutu sayfası. Tema panelindeki "Yerleşim" ayarı aynı veriyi farklı bir hiyerarşiyle sunar:
 * süreç önce (pano) ya da talep önce (gelen kutusu).
 */
export function WorkflowsPage() {
  const params = useParams()
  const box = findBox(params.box ?? 'bekleyen')
  const { layout } = useThemeTweaks()

  // Kutu seçilmemişse varsayılan kutuya git; böylece kutu sekmeleri etkin olanı doğru gösterir
  if (!params.box || !box) return <Navigate to="/is-akislari/bekleyen" replace />

  // Kutu değişince yerleşimin yerel durumu (seçim) sıfırlansın
  return layout === 'gelen-kutusu' ? (
    <InboxLayout key={box.id} box={box} />
  ) : (
    <PanoLayout key={box.id} box={box} />
  )
}
