import { Button, Chip, EmptyState, Surface, Table, Tooltip, Typography, cn } from '@heroui/react'
import { History, RotateCcw } from 'lucide-react'
import { dateTime, processOf, relative } from '@/pages/workflows/workflowData'
import { undoDecisionWithFocus } from '@/pages/workspace/home/actions'
import { useHome } from '@/pages/workspace/home/HomeContext'
import { fitRows, flatRows, type RowSection } from '@/pages/workspace/home/metrics'
import type { WidgetBodyProps } from '@/pages/workspace/home/types'
import { useDecided, type DecidedRow } from '@/pages/workspace/home/useTriage'
import { Box, Text } from '@/pages/workspace/ui'
import { ICON, inline, tile, timeOf } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * "Son kararlarınız": bu oturumda verilen kararlar, her biri "Geri al"lı
 *
 * Bildirim kaybolduktan sonra da geri alma elinizin altında durur; tek tıkla onay bu yüzden
 * güvenli hissettirir. `Table` (başlık yalnızca ekran okuyucuya): talep, karar çipi ve zamanı,
 * "Geri al". Geri alınan talep kuyruğa öncelik yerinde döner ve bu listeden çıkar; odak kuyruktaki
 * satırına, çizilmiyorsa buradaki bir sonraki satıra gider (`undoDecisionWithFocus`).
 *
 * Kararlar bellekte tutulur (maket); sayfa yenilenince liste boşalır. Satır sayısı kart
 * yüksekliğinden hesaplanır (`fitRows`); en yeni üstte.
 * ------------------------------------------------------------------------------------------------- */

/** Bu iç genişliğin altında "Geri al" yalnızca ikon olur (ad `aria-label`'da). */
const NARROW_PX = 340

export function DecidedWidget({ title, budgetPx, cap, m, hc, innerWidthPx, stacked }: WidgetBodyProps) {
  const home = useHome()
  const decided = useDecided()

  if (decided.length === 0) {
    // Öğreten boş satır: kararların burada, geri alınabilir durduğunu söyler
    return (
      <EmptyState className={cn('flex h-full items-center gap-3 p-0 text-start', stacked && 'py-3')}>
        <Surface variant="tertiary" className={cn('grid size-10 shrink-0 place-items-center rounded-pill text-foreground/65', tile)}>
          <History {...ICON} />
        </Surface>
        <Typography data-empty-heading tabIndex={-1} className="text-[0.8125rem] leading-[1.25rem] text-foreground/65 outline-none focus-visible:status-focused">
          Henüz karar vermediniz. Verdiğiniz kararlar burada, geri alınabilir şekilde durur.
        </Typography>
      </EmptyState>
    )
  }

  const sections: RowSection<DecidedRow>[] = [{ id: 'kararlar', label: title, headed: false, rows: decided }]
  const shown = flatRows(fitRows(sections, budgetPx, { row: m.decidedRow, heading: m.heading }, cap))
  const narrow = innerWidthPx < NARROW_PX

  return (
    // `-mx-3`: satır şeridi kart dolgusuna taşar, metin yine başlıkla aynı hizada kalır
    <Table variant="secondary" className="-mx-3 w-auto bg-transparent p-0">
      <Table.ScrollContainer>
        <Table.Content aria-label={title} onRowAction={(key) => home.openPeek(String(key), 'decided')}>
          <Table.Header className="sr-only">
            <Table.Column isRowHeader>Talep</Table.Column>
            <Table.Column>Karar</Table.Column>
            <Table.Column>İşlem</Table.Column>
          </Table.Header>
          <Table.Body>
            {shown.map(({ r, record }) => {
              const process = processOf(r)
              const approved = record.decision === 'approved'
              const chip = (
                <Chip color={approved ? 'success' : 'danger'} variant="primary" size="sm">
                  {approved ? 'Onaylandı' : 'Reddedildi'}
                </Chip>
              )
              return (
                <Table.Row key={r.id} id={r.id} data-row-id={r.id} className={hc.decidedRow}>
                  {/* `w-full max-w-0`: hücre kalan genişliği alır ve içindeki metin kesilebilir */}
                  <Table.Cell className="w-full max-w-0 py-0 ps-3 pe-2">
                    <Box className="flex min-w-0 flex-col">
                      <Typography {...inline} data-item-title truncate weight="medium" className="text-[0.875rem] leading-[1.25rem]">
                        {r.template.title}
                      </Typography>
                      <Text truncate className="text-[0.8125rem] leading-[1.25rem]">
                        {process.name} · {r.requester.name}
                      </Text>
                    </Box>
                  </Table.Cell>

                  <Table.Cell className="w-px px-2 py-0 whitespace-nowrap">
                    <Box className="flex flex-col items-start gap-0.5">
                      {!approved && record.note ? (
                        <Tooltip delay={400}>
                          {/* Yalnızca konum veren tetikleyici: satırın odağı ve rolü bozulmasın */}
                          <Tooltip.Trigger role="presentation" tabIndex={-1} className="flex">
                            {chip}
                          </Tooltip.Trigger>
                          <Tooltip.Content>{record.note}</Tooltip.Content>
                        </Tooltip>
                      ) : (
                        chip
                      )}
                      <Tooltip delay={600}>
                        <Tooltip.Trigger role="presentation" tabIndex={-1} className="flex">
                          <Text tone="muted" {...timeOf(record.at)} className="text-[0.75rem] leading-[1rem]">
                            {relative(record.at)}
                          </Text>
                        </Tooltip.Trigger>
                        <Tooltip.Content>{dateTime(record.at)}</Tooltip.Content>
                      </Tooltip>
                    </Box>
                  </Table.Cell>

                  <Table.Cell className="w-px py-0 ps-2 pe-3 text-end whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly={narrow}
                      aria-label={`Kararı geri al: ${r.template.title}`}
                      onPress={() => undoDecisionWithFocus(r, 'decided')}
                      className={cn('h-9 text-foreground/65', narrow && 'w-9')}
                    >
                      <RotateCcw size={16} strokeWidth={1.5} aria-hidden />
                      {!narrow && 'Geri al'}
                    </Button>
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
