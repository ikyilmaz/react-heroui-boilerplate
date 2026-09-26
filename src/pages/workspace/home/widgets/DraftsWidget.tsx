import { EmptyState, ListBox, Surface, Typography, cn } from '@heroui/react'
import { ChevronRight, PenLine } from 'lucide-react'
import { processOf, savedWords } from '@/pages/workflows/workflowData'
import { useHome } from '@/pages/workspace/home/HomeContext'
import { fitRows, flatRows, type RowSection } from '@/pages/workspace/home/metrics'
import type { WidgetBodyProps } from '@/pages/workspace/home/types'
import { useDrafts } from '@/pages/workspace/home/useTriage'
import { Box, Text } from '@/pages/workspace/ui'
import { ICON, inline, tile } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * "Yarım kalanlar": gönderilmemiş taslaklar unutulmasın
 *
 * Sessiz, ikincil bir liste; onay işinin üstüne çıkmaz. Satırların içinde etkileşimli öğe
 * olmadığı için `ListBox`: oklarla gezilir, Enter / tıklama önizlemeyi açar ("Taslağa devam et"
 * önizlemenin altında). Satır `label` / `description` yuvalarını kullanmaz; yuvalar erişilebilir
 * adı başlığa indirir, yuvasız metinle ad satırın tüm içeriğinden hesaplanır.
 *
 * Satır sayısı kart yüksekliğinden hesaplanır (`fitRows`); en yeni taslak üstte. Kaydetme zamanı
 * sayı yerine sözle ("Dün kaydedildi").
 * ------------------------------------------------------------------------------------------------- */

/** Bu iç genişliğin altında satır sonundaki "Devam et" yazısı düşer, yalnızca ok kalır. */
const NARROW_PX = 320

/** Satır üzerine gelince / klavyeyle odaklanınca yuvarlak şerit; odak halkası içeride. */
const rowStrip = cn(
  'gap-3 rounded-tile px-3 py-0 ring-inset transition-colors duration-150 ease-out motion-reduce:transition-none',
  'data-[hovered=true]:bg-foreground/5 data-[focus-visible=true]:bg-foreground/5',
)

export function DraftsWidget({ title, budgetPx, cap, m, hc, innerWidthPx, stacked }: WidgetBodyProps) {
  const home = useHome()
  const drafts = useDrafts()

  if (drafts.length === 0) {
    return (
      <EmptyState className={cn('flex h-full items-center gap-3 p-0 text-start', stacked && 'py-3')}>
        <Surface variant="tertiary" className={cn('grid size-10 shrink-0 place-items-center rounded-pill text-foreground/65', tile)}>
          <PenLine {...ICON} />
        </Surface>
        <Typography data-empty-heading tabIndex={-1} className="text-[0.8125rem] leading-[1.25rem] text-foreground/65 outline-none focus-visible:status-focused">
          Yarım kalan talebiniz yok.
        </Typography>
      </EmptyState>
    )
  }

  const sections: RowSection<(typeof drafts)[number]>[] = [{ id: 'taslaklar', label: title, headed: false, rows: drafts }]
  const shown = flatRows(fitRows(sections, budgetPx, { row: m.linkRow, heading: m.heading }, cap))
  const narrow = innerWidthPx < NARROW_PX

  return (
    // `-mx-3`: şerit kart dolgusuna taşar, metin başlıkla aynı hizada kalır. Liste kendi dolgusunu
    // ve öğeler arası boşluğunu bırakır; satırlar tam `m.linkRow` yüksekliğinde üst üste durur.
    <ListBox aria-label={title} className="-mx-3 w-auto overflow-visible p-0 [&>*+*]:mt-0">
      {shown.map((r) => {
        const process = processOf(r)
        const Icon = process.icon
        return (
          <ListBox.Item
            key={r.id}
            id={r.id}
            textValue={r.template.title}
            data-row-id={r.id}
            onAction={() => home.openPeek(r.id, 'drafts')}
            className={cn(hc.linkRow, rowStrip)}
          >
            <Surface variant="tertiary" className={cn('grid size-10 shrink-0 place-items-center rounded-pill', tile)}>
              <Icon {...ICON} />
            </Surface>
            <Box className="flex min-w-0 flex-1 flex-col">
              <Typography {...inline} data-item-title truncate weight="medium" className="text-[0.875rem] leading-[1.25rem]">
                {r.template.title}
              </Typography>
              <Text truncate className="text-[0.8125rem] leading-[1.25rem]">
                {process.name} · {savedWords(r.createdAt)}
              </Text>
            </Box>
            <Box className="flex shrink-0 items-center gap-0.5 text-foreground/45">
              {!narrow && (
                <Text tone="muted" className="text-[0.8125rem] leading-[1.25rem]">
                  Devam et
                </Text>
              )}
              <ChevronRight size={16} strokeWidth={1.5} aria-hidden />
            </Box>
          </ListBox.Item>
        )
      })}
    </ListBox>
  )
}
