import { EmptyState, ListBox, Surface, Tooltip, Typography, cn } from '@heroui/react'
import { BellRing } from 'lucide-react'
import { markRead, toggleRead } from '@/pages/workflows/triage'
import { dateTime, processOf, relative } from '@/pages/workflows/workflowData'
import { triageKey } from '@/pages/workspace/home/actions'
import { useHome } from '@/pages/workspace/home/HomeContext'
import { fitRows, flatRows, type RowSection } from '@/pages/workspace/home/metrics'
import type { WidgetBodyProps } from '@/pages/workspace/home/types'
import { useFyi, type FyiRow } from '@/pages/workspace/home/useTriage'
import { Box, Text } from '@/pages/workspace/ui'
import { ICON, inline, tile, timeOf } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * "Bilginize sunulanlar": karar gerektirmeyen bilgilendirmeler
 *
 * Onay kuyruğundan ayrı ve ondan sessiz tutulur, onu sulandırmasın. `ListBox`: oklarla gezilir,
 * Enter / tıklama talebi okundu sayar ve önizlemeyi açar; odaktaki satırda E okundu / okunmadı
 * arasında geçiş yapar (tek tuş kısayolları açıkken). Okunmamış satırın başında mavi bir nokta ve
 * ekran okuyucu için "Okunmadı" yazısı var; okunmuşta nokta yuvası boş kalır ama yerini korur, satır
 * metni kaymaz. Rozet, sayı, hap yok.
 *
 * Satır sayısı kart yüksekliğinden hesaplanır (`fitRows`); en yeni üstte.
 * ------------------------------------------------------------------------------------------------- */

/** İkinci satırın yazı boyutu ve satır yüksekliği. */
const line2 = 'text-[0.8125rem] leading-[1.25rem]'

/** Satır üzerine gelince / klavyeyle odaklanınca yuvarlak şerit; odak halkası içeride. */
const rowStrip = cn(
  'gap-3 rounded-tile px-3 py-0 ring-inset transition-colors duration-150 ease-out motion-reduce:transition-none',
  'data-[hovered=true]:bg-foreground/5 data-[focus-visible=true]:bg-foreground/5',
)

export function FyiWidget({ title, budgetPx, cap, m, hc, stacked }: WidgetBodyProps) {
  const home = useHome()
  const rows = useFyi()

  if (rows.length === 0) {
    return (
      <EmptyState className={cn('flex h-full items-center gap-3 p-0 text-start', stacked && 'py-3')}>
        <Surface variant="tertiary" className={cn('grid size-10 shrink-0 place-items-center rounded-pill text-foreground/65', tile)}>
          <BellRing {...ICON} />
        </Surface>
        <Typography data-empty-heading tabIndex={-1} className="text-[0.8125rem] leading-[1.25rem] text-foreground/65 outline-none focus-visible:status-focused">
          Bilginize sunulan yeni bir şey yok.
        </Typography>
      </EmptyState>
    )
  }

  const sections: RowSection<FyiRow>[] = [{ id: 'bilgilendirmeler', label: title, headed: false, rows }]
  const shown = flatRows(fitRows(sections, budgetPx, { row: m.linkRow, heading: m.heading }, cap))

  const open = (id: string) => {
    markRead(id)
    home.openPeek(id, 'fyi')
  }

  return (
    // `-mx-3`: şerit kart dolgusuna taşar, metin başlıkla aynı hizada kalır. Liste kendi dolgusunu
    // ve öğeler arası boşluğunu bırakır; satırlar tam `m.linkRow` yüksekliğinde üst üste durur.
    <ListBox aria-label={title} className="-mx-3 w-auto overflow-visible p-0 [&>*+*]:mt-0">
      {shown.map(({ r, unread }) => {
        const process = processOf(r)
        const Icon = process.icon
        return (
          <ListBox.Item
            key={r.id}
            id={r.id}
            textValue={r.template.title}
            data-row-id={r.id}
            onAction={() => open(r.id)}
            onKeyDown={(e) => {
              // E: okundu / okunmadı. Diğer tuşlar listeye geçsin (oklar, harfle arama)
              if (triageKey(e, home.keysOn, 'list') !== 'toggleRead') {
                e.continuePropagation()
                return
              }
              toggleRead(r)
              home.announce(unread ? 'Okundu olarak işaretlendi' : 'Okunmadı olarak işaretlendi')
            }}
            className={cn(hc.linkRow, rowStrip)}
          >
            {/* Nokta yuvası: okunmuşta da yerini korur */}
            <Box className="flex w-2 shrink-0 justify-center">
              {unread && (
                <>
                  <Box className="size-2 rounded-pill bg-(--success)" />
                  <Text className="sr-only">Okunmadı</Text>
                </>
              )}
            </Box>
            <Surface variant="tertiary" className={cn('grid size-9 shrink-0 place-items-center rounded-pill', tile)}>
              <Icon {...ICON} size={16} />
            </Surface>
            <Box className="flex min-w-0 flex-1 flex-col">
              <Typography
                {...inline}
                data-item-title
                truncate
                weight={unread ? 'medium' : 'normal'}
                className={cn('text-[0.875rem] leading-[1.25rem]', !unread && 'text-foreground/65')}
              >
                {r.template.title}
              </Typography>
              {/* Typography kendi yazı boyutunu verir (üstten almaz); boyut her parçada ayrı */}
              <Box className="flex min-w-0 items-center gap-1">
                <Text truncate className={cn('min-w-0', line2)}>
                  {process.name} · {r.requester.name} bilginize sundu
                </Text>
                <Text aria-hidden className={cn('shrink-0', line2)}>
                  ·
                </Text>
                <Tooltip delay={600}>
                  {/* Yalnızca konum veren tetikleyici: odak, tıklama ve rol seçenek öğesinde kalsın */}
                  <Tooltip.Trigger role="presentation" tabIndex={-1} className="flex shrink-0">
                    <Text {...timeOf(r.createdAt)} className={cn('whitespace-nowrap', line2)}>
                      {relative(r.createdAt)}
                    </Text>
                  </Tooltip.Trigger>
                  <Tooltip.Content>{dateTime(r.createdAt)}</Tooltip.Content>
                </Tooltip>
              </Box>
            </Box>
          </ListBox.Item>
        )
      })}
    </ListBox>
  )
}
