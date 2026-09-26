import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Avatar, Card, Chip, EmptyState, Header, ListBox, ScrollShadow, SearchField, Separator, Surface, Typography, cn } from '@heroui/react'
import { Hourglass, Inbox as InboxIcon } from 'lucide-react'
import { useBoxCounts, useBoxRequests } from '@/pages/workflows/decisions'
import { BoxHeader } from '@/pages/workflows/layouts/BoxHeader'
import { avatarColor, boxes, byPriority, initials, processOf, processes, relative, type Box as WorkBox } from '@/pages/workflows/workflowData'
import { Box, Text } from '@/pages/workspace/ui'
import { card, inline, panel, tile } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Yerleşim · Gelen Kutusu
 *
 * E-posta istemcisi kurgusu: üç sütun (kutular + süreçler · talep listesi · talep detayı) aynı
 * ekranda. Hiyerarşi düzleşir; sayfa değişmez, bağlam hiç kaybolmaz. Talep ayrıntısı henüz yok;
 * detay sütununda başlık ve "Yakında" durumu duruyor.
 *
 * Her şey doğrudan HeroUI: sütunlar `Surface` (kutular ve liste `secondary`, detay `default`),
 * kaydırma içlerindeki `ScrollShadow`; soldaki gezinme ve süreç filtresi bölümlü `ListBox`
 * (kutular bağlantı öğesi, süreçler tekli seçim), arama `SearchField`, talepler `ListBox` +
 * `Avatar` + `Chip`, detay `Typography.Heading` + `EmptyState`.
 *
 * Liste öğelerinde `slot="label"` / `slot="description"` kullanılmıyor: yuvalar öğenin erişilebilir
 * adını başlığa, açıklamasını tek satıra indirir; sayaç, "Okunmadı", "Acil" ve zaman ekran
 * okuyucuya ulaşmaz. Yuvasız metinle ad öğenin tüm içeriğinden hesaplanır.
 * ------------------------------------------------------------------------------------------------- */

const ALL = '__all__'

/** Sütun: katman 1 paneli (`panel`); iç boşluk kaydırılan içerikte, kenarlar yuvarlak kırpılır. */
const pane = cn(panel, 'flex min-h-0 flex-col overflow-hidden p-0')

/**
 * Üç sütunun yüksekliği: ızgaranın üst kenarından ekranın altına, kabuğun alt boşluğu (`pb-5`)
 * kadar içeride biter; böylece sütunlar soldaki rayla aynı hizada kalır. Üstteki başlığın
 * yüksekliği yazı boyutu / sarma ile değiştiği için sabit bir `calc` yerine ölçülür.
 */
function useFillHeight() {
  const ref = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setTop(Math.round(el.getBoundingClientRect().top + window.scrollY))
    measure()
    const ro = new ResizeObserver(measure)
    if (el.parentElement) ro.observe(el.parentElement)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])
  return { ref, style: top == null ? undefined : { height: `calc(100vh - ${top}px - 1.25rem)` } }
}

export function InboxLayout({ box }: { box: WorkBox }) {
  const requests = useBoxRequests(box.id)
  const [processId, setProcessId] = useState<string>(ALL)
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const { ref: fillRef, style: fillStyle } = useFillHeight()

  const boxCounts = useBoxCounts()

  const visible = useMemo(() => {
    const q = query.toLocaleLowerCase('tr')
    return requests
      .filter((r) => processId === ALL || r.processId === processId)
      .filter((r) => `${r.no} ${r.template.title} ${r.requester.name}`.toLocaleLowerCase('tr').includes(q))
      .sort(byPriority)
  }, [requests, processId, query])

  // Seçili talep filtreden düşerse ya da hiç seçilmediyse ilkini göster
  const selected = visible.find((r) => r.id === selectedId) ?? visible[0]

  const processItems = [
    { id: ALL, name: 'Tüm süreçler', n: requests.length, icon: InboxIcon },
    ...processes
      .map((p) => ({ id: p.id, name: p.name, n: requests.filter((r) => r.processId === p.id).length, icon: p.icon }))
      .filter((x) => x.n > 0),
  ]

  return (
    <Box className="flex flex-col gap-4">
      <BoxHeader box={box} showTabs={false} summary={`${requests.length} talep · aciller ve en eskiler üstte`} />

      <Box ref={fillRef} style={fillStyle} className="grid min-h-[34rem] grid-cols-[15rem_24rem_minmax(0,1fr)] gap-4">
        {/* 1 · Kutular ve süreçler */}
        <Surface variant="secondary" className={pane}>
          <ScrollShadow className="flex min-h-0 flex-1 flex-col gap-4 p-3">
            {/*
             * Kutular bağlantı öğesi: RAC seçimli listede bağlantıyı seçime değil gezinmeye bağlar
             * (`linkBehavior="override"`); seçim yalnızca rotadan gelir, bulunulan kutu siyah.
             */}
            <ListBox aria-label="İş kutuları" selectionMode="single" selectedKeys={[box.id]} className="p-0">
              <ListBox.Section className="gap-1">
                <Header className="px-4">Kutular</Header>
                {boxes.map(({ id, label, icon: Icon }) => (
                  <ListBox.Item
                    key={id}
                    id={id}
                    href={`/is-akislari/${id}`}
                    textValue={label}
                    className="gap-2.5 rounded-pill py-2 pr-2 pl-4 text-sm data-[selected]:bg-(--accent) data-[selected]:text-(--accent-foreground)"
                  >
                    <Icon size={16} strokeWidth={1.5} aria-hidden />
                    <Text className="flex-1 truncate text-sm text-current!">{label}</Text>
                    {/* Seçili (siyah) öğedeki görünümü `index.css`'te (`.soft-theme .list-box-item[data-selected] .chip`) */}
                    <Chip size="sm" className="min-w-5 justify-center tabular-nums">
                      {boxCounts.get(id) ?? 0}
                    </Chip>
                  </ListBox.Item>
                ))}
              </ListBox.Section>
            </ListBox>

            <Separator className="mx-3 w-auto" />

            <ListBox
              aria-label="Süreç filtresi"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[processId]}
              onSelectionChange={(keys) => {
                const [k] = [...keys]
                if (k) setProcessId(String(k))
              }}
              className="p-0"
            >
              <ListBox.Section className="gap-0.5">
                <Header className="px-4">Süreçler</Header>
                {processItems.map(({ id, name, n, icon: Icon }) => (
                  <ListBox.Item
                    key={id}
                    id={id}
                    textValue={name}
                    className="gap-2.5 rounded-pill px-4 py-2 text-sm data-[selected]:bg-(--surface-tertiary) data-[selected]:font-semibold"
                  >
                    <Icon size={15} strokeWidth={1.5} aria-hidden />
                    <Text tone="primary" className="flex-1 truncate text-sm">
                      {name}
                    </Text>
                    <Chip size="sm" variant="soft" className="tabular-nums">
                      {n}
                    </Chip>
                  </ListBox.Item>
                ))}
              </ListBox.Section>
            </ListBox>
          </ScrollShadow>
        </Surface>

        {/* 2 · Talep listesi */}
        <Surface variant="secondary" className={cn(pane, 'gap-3 p-3')}>
          <SearchField value={query} onChange={setQuery} aria-label="Talep ara">
            <SearchField.Group className="px-2">
              <SearchField.SearchIcon />
              <SearchField.Input placeholder="Talep ara…" />
              <SearchField.ClearButton />
            </SearchField.Group>
          </SearchField>
          <ScrollShadow className="-mx-1 min-h-0 flex-1 px-1">
            <ListBox
              aria-label="Talepler"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={selected ? [selected.id] : []}
              onSelectionChange={(keys) => {
                const [k] = [...keys]
                if (k) setSelectedId(String(k))
              }}
              renderEmptyState={() => <EmptyState className="p-5 text-center">Bu filtrede talep yok.</EmptyState>}
              className="gap-1 p-0"
            >
              {visible.map((r) => (
                <ListBox.Item
                  key={r.id}
                  id={r.id}
                  textValue={r.template.title}
                  className="items-start gap-3 rounded-tile px-3 py-2 data-[selected]:bg-(--accent) data-[selected]:text-(--accent-foreground)"
                >
                  {/* Baş harfler adın içinde tekrar etmesin; kişinin adı alt satırda */}
                  <Avatar size="sm" color={avatarColor(r.requester.name)} aria-hidden className="mt-0.5 size-7 rounded-pill">
                    <Avatar.Fallback className="font-semibold">{initials(r.requester.name)}</Avatar.Fallback>
                  </Avatar>
                  <Box className="min-w-0 flex-1">
                    <Box className="flex items-baseline gap-2">
                      <Typography {...inline} truncate weight={r.read ? 'medium' : 'semibold'} className="flex-1 text-sm text-current!">
                        {r.template.title}
                      </Typography>
                      <Text className="shrink-0 text-[0.6875rem] text-current! opacity-60">{relative(r.createdAt)}</Text>
                    </Box>
                    <Typography {...inline} truncate className="block text-xs text-current! opacity-60">
                      {processOf(r).name} · {r.requester.name}
                    </Typography>
                    <Box className="mt-1.5 flex items-center gap-1.5">
                      {!r.read && <Box role="img" aria-label="Okunmadı" className="size-1.5 rounded-pill bg-(--success)" />}
                      {r.template.urgent && (
                        <Chip size="sm" variant="primary" color="danger">
                          Acil
                        </Chip>
                      )}
                      {r.template.highlight && <Text className="text-xs font-semibold text-current! tabular-nums">{r.template.highlight}</Text>}
                    </Box>
                  </Box>
                </ListBox.Item>
              ))}
            </ListBox>
          </ScrollShadow>
        </Surface>

        {/* 3 · Detay: listeden bir kat daha açık yüzey */}
        <Surface variant="default" className={pane}>
          <ScrollShadow className="flex min-h-0 flex-1 flex-col p-5">
            {selected ? (
              <Box className="flex flex-col gap-4">
                <Typography.Heading level={2} weight="bold" className="text-[1.75rem] leading-tight">
                  {selected.template.title}
                </Typography.Heading>
                <Card variant="default" role="note" className={cn(card, 'px-6 py-12')}>
                  <EmptyState className="flex flex-col items-center gap-3 p-0 text-center">
                    <Surface variant="tertiary" className={cn('grid size-12 place-items-center rounded-pill', tile)}>
                      <Hourglass size={20} strokeWidth={1.5} className="text-foreground/60" aria-hidden />
                    </Surface>
                    <Chip size="sm" variant="primary" color="accent">
                      Yakında
                    </Chip>
                    <Typography type="body-sm" color="muted" align="center" className="max-w-sm">
                      Talep ayrıntıları, karar ve onay akışı yakında burada olacak.
                    </Typography>
                  </EmptyState>
                </Card>
              </Box>
            ) : (
              <EmptyState className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <Typography weight="semibold">Gelen kutunuz boş</Typography>
                <Typography type="body-sm" color="muted">
                  Bu kutuda bekleyen talep kalmadı.
                </Typography>
              </EmptyState>
            )}
          </ScrollShadow>
        </Surface>
      </Box>
    </Box>
  )
}
