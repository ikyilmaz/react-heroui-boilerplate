import { Button, Chip, EmptyState, ScrollShadow, Surface, Table, Tabs, Tooltip, Typography, cn } from '@heroui/react'
import { BellRing, Check, Plus, Reply, Rocket } from 'lucide-react'
import { dateTime, sinceWords } from '@/pages/workflows/workflowData'
import { afterPaint, focusRow, remindWithToast, widgetEl } from '@/pages/workspace/home/actions'
import { useHome } from '@/pages/workspace/home/HomeContext'
import { fitRows, flatRows, type RowSection } from '@/pages/workspace/home/metrics'
import type { WidgetBodyProps } from '@/pages/workspace/home/types'
import { followScopes, type FollowScope } from '@/pages/workspace/home/useHomeState'
import { useFollowing, type FollowRow } from '@/pages/workspace/home/useTriage'
import { Box, Text } from '@/pages/workspace/ui'
import { ICON, inline, tile, timeOf } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * "Takip ettikleriniz": talebim nerede, kimde, ne zamandır orada?
 *
 * Üstte kapsam sekmeleri (`Tabs`: Başlattıklarım / Dahil olduklarım; sayı yok), altında seçili
 * sekmenin panelinde bir `Table`. Her satır sözle anlatır: şu anki adım, adımı elinde tutan kişi
 * ve o adımda ne zamandır beklediği (`sinceWords`). Aynı adımda uzun süre kalan talepte
 * "Hatırlat", sizden bilgi istenen talepte "Yanıtla" çıkar. Satıra basmak (ya da Enter) sağdan
 * önizlemeyi açar.
 *
 * Satır sayısı DOM ölçülmeden hesaplanır: kart yüksekliğinden (`budgetPx`) sekme şeridi düşülür,
 * kalan alana kaç sabit yükseklikte satır sığıyorsa o kadarı çizilir (`fitRows`); satır yarıda
 * kesilmez, kart içinde kaydırma olmaz. Tek sütunda en fazla `cap` satır.
 * ------------------------------------------------------------------------------------------------- */

/** Sekme şeridinin kendi yüksekliği (px): 32px sekme + üstte ve altta 4px ray dolgusu. */
const TAB_LIST_PX = 40

/** Bu iç genişliğin altında satır sonundaki düğmeler yalnızca ikon olur (ad `aria-label`'da). */
const NARROW_PX = 360

/** Kenar halkası (`tile`) HeroUI'nin odak halkasını ezer; klavye odağında geri verilir. */
const focusRing = 'data-[focus-visible]:status-focused'

const scopeLabel = (scope: FollowScope) => followScopes.find((s) => s.id === scope)?.label ?? ''

export function FollowingWidget(props: WidgetBodyProps) {
  const home = useHome()
  const scope = home.state.followScope

  return (
    <Tabs
      selectedKey={scope}
      onSelectionChange={(key) => home.actions.setFollowScope(key as FollowScope)}
      className="h-full min-h-0 gap-0"
    >
      {/*
       * Şerit tam `m.tabs` yer kaplasın (satır sığdırma buna güvenir): ray yüksekliği sabit, kalan
       * boşluk rayın altına eklenir. Sabit yükseklik, satır içi (`inline-flex`) listenin satır
       * kutusundan gelebilecek piksel oynamalarını da keser.
       */}
      <Tabs.ListContainer className="h-[40px] w-fit max-w-full shrink-0" style={{ marginBottom: Math.max(0, props.m.tabs - TAB_LIST_PX) }}>
        <Tabs.List aria-label="Takip kapsamı" className="p-[4px]">
          {followScopes.map((s) => (
            <Tabs.Tab key={s.id} id={s.id} className="h-[32px] w-auto px-3.5 text-[0.8125rem]">
              <Tabs.Indicator />
              {s.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {/* Yalnızca seçili sekmenin paneli çizilir; kancalar da yalnızca onun için çalışır */}
      {followScopes.map((s) => (
        <Tabs.Panel key={s.id} id={s.id} className="mt-0 min-h-0 flex-1 rounded-card p-0 data-[focus-visible]:status-focused">
          <FollowList {...props} scope={s.id} />
        </Tabs.Panel>
      ))}
    </Tabs>
  )
}

/** Seçili kapsamın satırları: sığdırılmış tablo ya da boş durum. */
function FollowList({ scope, mode, budgetPx, cap, m, hc, innerWidthPx, stacked }: WidgetBodyProps & { scope: FollowScope }) {
  const home = useHome()
  const rows = useFollowing(scope)
  const label = scopeLabel(scope)
  const steps = mode === 'adimlar'
  const available = budgetPx - m.tabs

  if (rows.length === 0) return <FollowEmpty scope={scope} available={available} innerWidthPx={innerWidthPx} stacked={stacked} />

  const sections: RowSection<FollowRow>[] = [{ id: scope, label, headed: false, rows }]
  const shown = flatRows(fitRows(sections, available, { row: steps ? m.followStepsRow : m.followRow, heading: m.heading }, cap))
  const narrow = innerWidthPx < NARROW_PX

  const remind = (row: FollowRow) => {
    remindWithToast(row.r)
    // "Hatırlat" düğmesi "Hatırlatıldı" yazısına dönüşür; odak boşa düşmesin, satırda kalsın
    afterPaint(() => void focusRow(row.r.id, widgetEl('following') ?? document))
  }

  return (
    // `-mx-3`: satır şeridi kart dolgusuna taşar, metin yine başlıkla aynı hizada kalır
    <Table variant="secondary" className="-mx-3 w-auto bg-transparent p-0">
      <Table.ScrollContainer>
        <Table.Content aria-label={label} onRowAction={(key) => home.openPeek(String(key), 'following')}>
          <Table.Header className="sr-only">
            <Table.Column isRowHeader>Talep</Table.Column>
            <Table.Column>İşlem</Table.Column>
          </Table.Header>
          <Table.Body>
            {shown.map((row) => {
              const { r, process, progress } = row
              const Icon = process.icon
              const title = r.template.title
              return (
                <Table.Row key={r.id} id={r.id} data-row-id={r.id} className={steps ? hc.followStepsRow : hc.followRow}>
                  {/* `w-full max-w-0`: hücre kalan genişliği alır ve içindeki metin kesilebilir */}
                  <Table.Cell className="w-full max-w-0 py-0 ps-3 pe-2">
                    <Box className="flex items-center gap-3">
                      <Surface variant="tertiary" className={cn('grid size-10 shrink-0 place-items-center rounded-pill', tile)}>
                        <Icon {...ICON} />
                      </Surface>
                      <Box className="flex min-w-0 flex-1 flex-col">
                        <Typography {...inline} data-item-title truncate weight="medium" className="text-[0.875rem] leading-[1.25rem]">
                          {title}
                        </Typography>

                        {steps ? (
                          <StepPath row={row} />
                        ) : (
                          // Ek almayan ayrı "adımında" sözcüğü: kişi adına Türkçe ek eklemek gerekmez
                          <Text truncate className="text-[0.8125rem] leading-[1.25rem]">
                            {row.stepLabel} adımında · {progress.holder.name}
                          </Text>
                        )}

                        {row.state === 'bilgi-istendi' ? (
                          <Chip color="danger" variant="primary" size="sm" className="mt-0.5">
                            Sizden bilgi istendi
                          </Chip>
                        ) : (
                          <Tooltip delay={600}>
                            {/* Yalnızca konum veren tetikleyici: satırın odağı ve rolü bozulmasın */}
                            <Tooltip.Trigger role="presentation" tabIndex={-1} className="mt-0.5 w-fit max-w-full">
                              <Text tone="muted" truncate {...timeOf(progress.since)} className="text-[0.75rem] leading-[1rem]">
                                {sinceWords(progress.since)}
                              </Text>
                            </Tooltip.Trigger>
                            <Tooltip.Content>{dateTime(progress.since)}</Tooltip.Content>
                          </Tooltip>
                        )}
                      </Box>
                    </Box>
                  </Table.Cell>

                  <Table.Cell className="w-px py-0 ps-2 pe-3 text-end whitespace-nowrap">
                    {row.trailing === 'yanitla' && (
                      <Button
                        size="sm"
                        variant="secondary"
                        isIconOnly={narrow}
                        aria-label={`Yanıtla: ${title}`}
                        onPress={() => home.openPeek(r.id, 'following')}
                        className={cn('h-9', narrow && 'w-9', tile, focusRing)}
                      >
                        <Reply size={16} strokeWidth={1.5} aria-hidden />
                        {!narrow && 'Yanıtla'}
                      </Button>
                    )}
                    {row.trailing === 'hatirlat' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        isIconOnly={narrow}
                        aria-label={`Hatırlat: ${title}`}
                        onPress={() => remind(row)}
                        className={cn('h-9', narrow && 'w-9')}
                      >
                        <BellRing size={16} strokeWidth={1.5} aria-hidden />
                        {!narrow && 'Hatırlat'}
                      </Button>
                    )}
                    {row.trailing === 'hatirlatildi' && (
                      <Text tone="muted" className="px-1 text-[0.8125rem] leading-[1.25rem]">
                        Hatırlatıldı
                      </Text>
                    )}
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
        </Table.Content>
      </Table.ScrollContainer>
    </Table>
  )
}

/**
 * "Adımlar" kipinde ikinci satır: sürecin tüm yolu tek satırlık çipler (yükseklik sabit kalsın diye
 * kaydırılır, kaydırma çubuğu gizli). Biten adımlar soluk ve tikli, şu anki adım siyah ve adımı
 * tutan kişiyi de söyler, sıradakiler daha soluk. Sayı yok.
 */
function StepPath({ row }: { row: FollowRow }) {
  const { process, progress } = row
  return (
    <ScrollShadow orientation="horizontal" hideScrollBar size={24} className="mt-1 flex min-w-0 flex-nowrap items-center gap-1 py-0.5">
      {process.steps.map((step, i) =>
        i < progress.step ? (
          <Chip key={step} variant="tertiary" size="sm" className="shrink-0 text-foreground/65">
            <Check size={14} strokeWidth={1.5} aria-hidden />
            <Text className="sr-only">Tamamlandı: </Text>
            {step}
          </Chip>
        ) : i === progress.step ? (
          <Chip key={step} color="accent" variant="primary" size="sm" className="shrink-0">
            <Text className="sr-only">Şu an: </Text>
            {progress.holder.name} · {step}
          </Chip>
        ) : (
          <Chip key={step} variant="secondary" size="sm" className="shrink-0 text-foreground/45">
            {step}
          </Chip>
        ),
      )}
    </ScrollShadow>
  )
}

/**
 * Boş durum. Başlattıklarım boşsa öğretir: ne göreceğinizi söyler ve yeni talebe yönlendirir; yer
 * darsa ikon yanda, genişse ortada ve alt alta. Dahil olduklarım boşsa tek soluk satır.
 */
function FollowEmpty({ scope, available, innerWidthPx, stacked }: { scope: FollowScope; available: number; innerWidthPx: number; stacked: boolean }) {
  const home = useHome()

  if (scope === 'devam-eden') {
    return (
      <EmptyState className={cn('flex h-full items-center p-0', stacked && 'py-4')}>
        <Typography data-empty-heading tabIndex={-1} className="text-[0.8125rem] leading-[1.25rem] text-foreground/65 outline-none focus-visible:status-focused">
          Dahil olduğunuz, süren bir iş yok.
        </Typography>
      </EmptyState>
    )
  }

  const roomy = available >= 200 && innerWidthPx >= 280
  return (
    <EmptyState
      className={cn(
        'flex h-full p-0',
        roomy ? 'flex-col items-center justify-center gap-3 text-center' : 'items-center gap-4 text-start',
        stacked && (roomy ? 'py-8' : 'py-4'),
      )}
    >
      <Surface variant="tertiary" className={cn('grid shrink-0 place-items-center rounded-pill', roomy ? 'size-13' : 'size-11', tile)}>
        <Rocket size={roomy ? 22 : 20} strokeWidth={1.5} aria-hidden />
      </Surface>
      <Box className={cn('flex min-w-0 flex-col', roomy ? 'items-center gap-1' : 'items-start gap-0.5')}>
        <Typography.Heading
          level={3}
          data-empty-heading
          tabIndex={-1}
          weight="semibold"
          className="text-[0.9375rem] leading-[1.375rem] tracking-tight outline-none focus-visible:status-focused"
        >
          Takip ettiğiniz bir talep yok
        </Typography.Heading>
        <Typography className={cn('text-[0.8125rem] leading-[1.25rem] text-foreground/65', roomy && 'max-w-[22rem]')}>
          Başlattığınız talepler burada, hangi adımda ve kimde olduklarıyla görünür.
        </Typography>
        <Button size="sm" variant="ghost" onPress={() => home.openStart()} className={cn('h-9', roomy ? 'mt-2' : '-ms-3 mt-1')}>
          <Plus size={16} strokeWidth={1.5} aria-hidden />
          Yeni talep başlat
        </Button>
      </Box>
    </EmptyState>
  )
}
