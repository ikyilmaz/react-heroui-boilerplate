import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  Header,
  Link,
  ListBox,
  Popover,
  SearchField,
  Surface,
  Table,
  Tag,
  TagGroup,
  Tooltip,
  Typography,
  buttonVariants,
  cn,
} from '@heroui/react'
import { ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronRight, Maximize2, Paperclip, Undo2, X, Zap } from 'lucide-react'
import { undoDecision, useBoxRequests, useDecisions } from '@/pages/workflows/decisions'
import {
  avatarColor,
  findBox,
  findProcess,
  groupOf,
  initials,
  relative,
  requestsOf,
  type Box as WorkBox,
  type Group,
  type Process,
} from '@/pages/workflows/workflowData'
import { Box, Text } from '@/pages/workspace/ui'
import { usePageCrumbs } from '@/pages/workspace/crumbs'
import { ICON, edge, inline, tile } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Bir sürecin talepleri
 *
 * Tamamen HeroUI bileşenleriyle: filtreler seçilebilir `TagGroup`, talepler zamana göre
 * bölümlenmiş (Bugün / Bu hafta / Bu ay / Daha eski) bir `ListBox` — her bölüm `ListBox.Section`
 * + `Header`, her satır talep detayına giden bağlantı öğesi (`href`; ok tuşlarıyla gezilir, Enter
 * açar). Arama `SearchField`, ikon düğmeleri `Button isIconOnly` + `Tooltip`, bu oturumda karar
 * verilenler "Geri al" düğmeli bir `Table`. Liste `ProcessRequests` olarak ayrı; kutu sayfasındaki
 * kartlar onu popover içinde de gösteriyor.
 *
 * Satırlarda `slot="label"` / `slot="description"` yok: yuvalar öğenin erişilebilir adını başlığa,
 * açıklamasını tek satıra indirir; "Okunmadı", ek, "Acil", tutar ve zaman ekran okuyucuya
 * ulaşmaz. Yuvasız metinle ad, eskiden satırın bağlantısında olduğu gibi tüm içerikten hesaplanır.
 * ------------------------------------------------------------------------------------------------- */

type Filter = 'all' | 'unread' | 'urgent'

const groupOrder: Group[] = ['Bugün', 'Bu hafta', 'Bu ay', 'Daha eski']
const filterLabels: Record<Filter, string> = { all: 'Tümü', unread: 'Okunmamış', urgent: 'Acil' }

/**
 * Kenar halkası (`edge` / `tile`) de bir `ring`; yardımcı sınıf olduğu için HeroUI'nin klavye
 * odak halkasını ezer. Odakta HeroUI'nin kendi `status-focused` görünümünü geri veriyoruz.
 */
const focusRing = 'data-[focus-visible]:status-focused'

interface ProcessRequestsProps {
  box: WorkBox
  process: Process
  /** Açılır pencere içinde: iz yolu yok, başlık `Popover.Heading`, kapatma ve "sayfada aç" var. */
  embedded?: boolean
  onClose?: () => void
}

/** Sürecin talep listesi; hem kendi sayfasında hem kutu kartından açılan popover'da kullanılır. */
export function ProcessRequests({ box, process, embedded, onClose }: ProcessRequestsProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [newestFirst, setNewestFirst] = useState(true)
  const all = useBoxRequests(box.id)
  const decisions = useDecisions()

  const own = useMemo(() => all.filter((r) => r.processId === process.id), [all, process])
  const visible = useMemo(() => {
    const q = query.toLocaleLowerCase('tr')
    return own
      .filter((r) => (filter === 'unread' ? !r.read : filter === 'urgent' ? r.template.urgent : true))
      .filter((r) => `${r.no} ${r.template.title} ${r.requester.name} ${r.requester.department}`.toLocaleLowerCase('tr').includes(q))
      .sort((a, b) => (newestFirst ? b.createdAt.getTime() - a.createdAt.getTime() : a.createdAt.getTime() - b.createdAt.getTime()))
  }, [own, query, filter, newestFirst])

  const decided = requestsOf(box.id).filter((r) => r.processId === process.id && decisions.has(r.id))
  const groups = (newestFirst ? groupOrder : [...groupOrder].reverse())
    .map((g) => ({ group: g, items: visible.filter((r) => groupOf(r.createdAt) === g) }))
    .filter((g) => g.items.length > 0)
  const Icon = process.icon
  const base = `/is-akislari/${box.id}/${process.id}`
  usePageCrumbs(
    embedded
      ? null
      : [
          { label: 'Ana Sayfa', href: '/calisma-alani' },
          { label: 'İş Akış Yönetimi', href: '/is-akislari' },
          { label: box.label, href: `/is-akislari/${box.id}` },
          { label: process.name },
        ],
  )
  const counts: Record<Filter, number> = {
    all: own.length,
    unread: own.filter((r) => !r.read).length,
    urgent: own.filter((r) => r.template.urgent).length,
  }
  const sortLabel = newestFirst ? 'Eskiden yeniye sırala' : 'Yeniden eskiye sırala'

  return (
    <Box className={cn('flex flex-col', embedded ? 'gap-4' : 'gap-5')}>
      {/* Başlık, arama ve ikon düğmeleri */}
      <Box className="flex flex-col gap-3">
        <Box className="flex items-end justify-between gap-4">
          <Box className="flex items-center gap-4">
            <Surface variant="tertiary" className={cn('grid place-items-center rounded-pill text-foreground', embedded ? 'size-10' : 'size-12', tile)}>
              <Icon size={embedded ? 22 : 26} strokeWidth={1.5} aria-hidden />
            </Surface>
            <Box>
              {embedded ? (
                <Popover.Heading className="text-2xl leading-tight font-bold tracking-tight text-foreground">{process.name}</Popover.Heading>
              ) : (
                <Typography.Heading level={1} weight="bold" className="text-[1.75rem] leading-tight">
                  {process.name}
                </Typography.Heading>
              )}
              <Typography.Paragraph size="sm" className="mt-0.5 text-foreground/65">
                {process.department} · {box.label.toLocaleLowerCase('tr')} kutunuzda {own.length} talep
              </Typography.Paragraph>
            </Box>
          </Box>
          <Box className="flex items-center gap-2">
            <SearchField value={query} onChange={setQuery} aria-label="Talep ara" className={embedded ? 'w-64' : 'w-80'}>
              <SearchField.Group className="px-2">
                <SearchField.SearchIcon />
                <SearchField.Input placeholder="Talep no, konu veya kişi ara…" />
                <SearchField.ClearButton />
              </SearchField.Group>
            </SearchField>
            <Tooltip delay={400}>
              <Button isIconOnly variant="secondary" aria-label={sortLabel} onPress={() => setNewestFirst((v) => !v)} className={cn(tile, focusRing)}>
                {newestFirst ? <ArrowDownWideNarrow {...ICON} /> : <ArrowUpNarrowWide {...ICON} />}
              </Button>
              <Tooltip.Content>{sortLabel}</Tooltip.Content>
            </Tooltip>
            {embedded && (
              <>
                {/* Bağlantı, HeroUI düğme görünümünü `buttonVariants` ile alıyor */}
                <Tooltip delay={400}>
                  <Link href={base} aria-label="Tam sayfada aç" className={cn(buttonVariants({ variant: 'secondary', isIconOnly: true }), tile, focusRing)}>
                    <Maximize2 {...ICON} />
                  </Link>
                  <Tooltip.Content>Tam sayfada aç</Tooltip.Content>
                </Tooltip>
                <Tooltip delay={400}>
                  <Button isIconOnly variant="secondary" aria-label="Kapat" onPress={onClose} className={cn(tile, focusRing)}>
                    <X {...ICON} />
                  </Button>
                  <Tooltip.Content>Kapat</Tooltip.Content>
                </Tooltip>
              </>
            )}
          </Box>
        </Box>

        {/*
         * Filtreler: tek seçimli etiket grubu; sayılar etiketin içinde çip. HeroUI `Tag` adı ilk metin
         * çocuğundan türetir (sayı düşer); `textValue` sayıyı da ada katar.
         */}
        <TagGroup
          aria-label="Filtre"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[filter]}
          onSelectionChange={(keys) => {
            const [k] = keys === 'all' ? [] : [...keys]
            if (k) setFilter(k as Filter)
          }}
          size="lg"
        >
          <TagGroup.List className="gap-2">
            {(Object.keys(filterLabels) as Filter[]).map((f) => (
              <Tag
                key={f}
                id={f}
                textValue={`${filterLabels[f]}, ${counts[f]}`}
                className={cn('gap-2 py-1.5 pr-1.5 pl-3.5 text-[0.8125rem]', tile, focusRing)}
              >
                {filterLabels[f]}
                <Chip size="sm" className="min-w-5 justify-center bg-current/10 font-semibold text-current tabular-nums">
                  {counts[f]}
                </Chip>
              </Tag>
            ))}
          </TagGroup.List>
        </TagGroup>
      </Box>

      {/* Talepler: zaman gruplarına bölünmüş bağlantı listesi */}
      {groups.length > 0 ? (
        // `-m-1`: liste kendi `p-1` iç boşluğunu korur (satırların odak halkası `overflow-clip`e
        // takılmasın) ama satırlar yine de başlık ve filtrelerle aynı hizada kalır
        <ListBox aria-label={`${process.name} talepleri`} className="-m-1">
          {groups.map(({ group, items }) => (
            <ListBox.Section key={group} id={group} className="gap-2 not-first:mt-5">
              <Header className="flex items-center gap-2 px-4 pt-0 pb-1 text-[0.8125rem] text-foreground/65">
                {group}
                <Text tone="muted">{items.length}</Text>
              </Header>
              {items.map((r) => (
                <ListBox.Item
                  key={r.id}
                  id={r.id}
                  href={`${base}/${r.id}`}
                  textValue={r.template.title}
                  className={cn(
                    'group grid grid-cols-[0.5rem_2.5rem_1fr_auto_7rem_1.25rem] gap-4 rounded-pill bg-(--surface) px-4 py-2 transition duration-200 hover:bg-(--surface-hover)',
                    edge,
                    focusRing,
                  )}
                >
                  <Box role={r.read ? undefined : 'img'} aria-label={r.read ? undefined : 'Okunmadı'} className={cn('size-2 rounded-pill', !r.read && 'bg-(--success)')} />
                  {/* Baş harfler adın içinde tekrar etmesin; kişinin adı alt satırda */}
                  <Avatar color={avatarColor(r.requester.name)} aria-hidden className="shrink-0">
                    <Avatar.Fallback className="font-semibold">{initials(r.requester.name)}</Avatar.Fallback>
                  </Avatar>
                  <Box className="min-w-0">
                    <Box className="flex items-center gap-2">
                      <Typography {...inline} truncate weight={r.read ? 'medium' : 'semibold'} className="text-sm">
                        {r.template.title}
                      </Typography>
                      {r.template.attachments && <Paperclip size={13} strokeWidth={1.5} role="img" aria-label="Ekli dosya var" className="shrink-0 text-foreground/45" />}
                    </Box>
                    <Typography {...inline} truncate color="muted" className="block text-xs">
                      {r.no} · {r.requester.name}, {r.requester.department}
                    </Typography>
                  </Box>
                  <Box className="flex items-center gap-2">
                    {r.template.urgent && (
                      <Chip size="sm" variant="primary" color="danger">
                        <Zap size={11} strokeWidth={2} aria-hidden />
                        Acil
                      </Chip>
                    )}
                    {r.template.highlight && (
                      <Chip size="sm" variant="secondary" className={cn('font-semibold text-foreground tabular-nums', tile)}>
                        {r.template.highlight}
                      </Chip>
                    )}
                  </Box>
                  <Text className="text-right text-xs">{relative(r.createdAt)}</Text>
                  <ChevronRight size={18} strokeWidth={1.5} className="text-foreground/45 transition group-hover:translate-x-0.5" aria-hidden />
                </ListBox.Item>
              ))}
            </ListBox.Section>
          ))}
        </ListBox>
      ) : (
        <EmptyState className="flex flex-col items-center gap-2 py-12 text-center">
          <Typography weight="semibold" className="text-base">
            {own.length === 0 ? 'Bu süreçte bekleyen talep kalmadı' : 'Bu filtreyle eşleşen talep yok'}
          </Typography>
          <Typography color="muted" className="text-sm">
            {own.length === 0 ? 'Hepsine karar verdiniz. ' : 'Filtreyi veya aramayı değiştirin. '}
            {/* Popover içinde bağlantı pencereyi kapatır; sayfada kutuya döner */}
            <Link {...(embedded ? { onPress: onClose } : { href: `/is-akislari/${box.id}` })} className="text-foreground/65 underline">
              Diğer süreçlere dönün
            </Link>
          </Typography>
        </EmptyState>
      )}

      {/* Bu oturumda verilen kararlar; "Geri al" talebi listeye geri koyar */}
      {decided.length > 0 && (
        <Box role="region" aria-label="Bu oturumda karar verdikleriniz">
          <Typography.Heading level={2} weight="medium" className="mb-3 px-4 text-[0.8125rem] text-foreground/65">
            Bu oturumda karar verdikleriniz
          </Typography.Heading>
          <Table variant="secondary" className="bg-transparent p-0">
            <Table.ScrollContainer>
              <Table.Content aria-label="Bu oturumda karar verdikleriniz" className="text-[0.8125rem]">
                <Table.Header>
                  <Table.Column className="w-32">Karar</Table.Column>
                  <Table.Column isRowHeader>Talep</Table.Column>
                  <Table.Column className="w-32">
                    <Text className="sr-only">İşlem</Text>
                  </Table.Column>
                </Table.Header>
                <Table.Body>
                  {decided.map((r) => {
                    const approved = decisions.get(r.id)!.decision === 'approved'
                    return (
                      <Table.Row key={r.id} id={r.id}>
                        <Table.Cell>
                          <Chip size="sm" variant="primary" color={approved ? 'success' : 'danger'}>
                            {approved ? 'Onaylandı' : 'Reddedildi'}
                          </Chip>
                        </Table.Cell>
                        <Table.Cell className="text-foreground/65">
                          {r.no} · {r.template.title}
                        </Table.Cell>
                        <Table.Cell className="text-end">
                          <Button size="sm" variant="ghost" onPress={() => undoDecision(r.id)} className="text-foreground/65">
                            <Undo2 size={14} strokeWidth={1.5} aria-hidden />
                            Geri al
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Content>
            </Table.ScrollContainer>
          </Table>
        </Box>
      )}
    </Box>
  )
}

export function ProcessRequestsPage() {
  const params = useParams()
  const box = findBox(params.box)
  const process = findProcess(params.processId)
  if (!box || !process) return <Navigate to="/is-akislari" replace />
  return <ProcessRequests key={`${box.id}/${process.id}`} box={box} process={process} />
}
