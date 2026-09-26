import type { ReactNode } from 'react'
import { useMatch } from 'react-router'
import { Button, Chip, Tabs, Typography } from '@heroui/react'
import { Plus } from 'lucide-react'
import { useBoxCounts } from '@/pages/workflows/decisions'
import { boxes, type Box as WorkBox } from '@/pages/workflows/workflowData'
import { Box } from '@/pages/workspace/ui'
import { usePageCrumbs } from '@/pages/workspace/crumbs'
import { ICON } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Kutu sayfasının ortak başlığı: iz yolunu kabuğa bildirir; başlık, özet, eylemler ve kutu
 * sekmeleri. Yerleşimler bunu kullanır; kutuları kendi gezinmesine taşıyanlar (gelen kutusu)
 * `showTabs={false}` verir. Kutunun içeriği `children` olarak verilir ve seçili sekmenin paneline
 * konur.
 * ------------------------------------------------------------------------------------------------- */

/**
 * Kutu sekmeleri: HeroUI `Tabs`, sekmeler bağlantı (`href`), seçili sekme rotadan gelir. İçerik
 * (`children`) tek bir `Tabs.Panel`'de, seçili kutunun kimliğiyle; böylece sekmenin
 * `aria-controls`'u gerçek bir sekme paneline işaret eder. Oklar yalnızca odağı taşır, Enter/Boşluk
 * kutuya gider (`keyboardActivation="manual"`), böylece ok tuşlarıyla gezinirken sayfa yeniden
 * kurulmaz. Sayaç kutunun canlı talep sayısı (`Chip`); seçili (siyah) sekmedeki görünümü, ray ve
 * vurgu renkli seçili dilim `index.css`'te (`.soft-theme .tabs`, HeroUI `--segment`).
 */
export function BoxTabs({ children = null }: { children?: ReactNode }) {
  // Sekmeler her zaman bir seçim ister; kutu rotası dışında kullanılırsa ilk kutu seçili görünür
  const selected = useMatch({ path: '/is-akislari/:box', end: false })?.params.box ?? boxes[0].id
  const counts = useBoxCounts()
  return (
    <Tabs selectedKey={selected} keyboardActivation="manual" className="min-w-0 gap-5">
      <Tabs.ListContainer className="w-fit max-w-full">
        <Tabs.List aria-label="İş kutuları">
          {boxes.map(({ id, label, icon: Icon }) => (
            <Tabs.Tab key={id} id={id} href={`/is-akislari/${id}`} className="w-auto gap-2 pr-1.5 pl-3.5">
              <Tabs.Indicator />
              <Icon {...ICON} size={16} />
              {label}
              <Chip size="sm" className="min-w-5 justify-center tabular-nums">
                {counts.get(id) ?? 0}
              </Chip>
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.ListContainer>
      {/* Panel içeriği odaklanabilir öğe içermiyorsa RAC paneli sekme durağı yapar; odak halkası HeroUI'nin */}
      <Tabs.Panel id={selected} className="mt-0 rounded-card p-0 data-[focus-visible]:status-focused">
        {children}
      </Tabs.Panel>
    </Tabs>
  )
}

export function BoxHeader({
  box,
  summary,
  actions,
  showTabs = true,
  children = null,
}: {
  box: WorkBox
  summary: ReactNode
  /** Sağ üstteki arama vb.; "Yeni talep başlat" her zaman sonda. */
  actions?: ReactNode
  showTabs?: boolean
  /** Kutunun içeriği; sekmeler açıkken seçili sekmenin panelinde, kapalıyken başlığın altında. */
  children?: ReactNode
}) {
  usePageCrumbs([
    { label: 'Ana Sayfa', href: '/calisma-alani' },
    { label: 'İş Akış Yönetimi', href: '/is-akislari' },
    { label: box.label },
  ])
  return (
    <Box className="flex flex-col gap-3">
      <Box className="flex items-end justify-between gap-4">
        <Box>
          <Typography.Heading
            level={1}
            weight="bold"
            className="text-[1.75rem] leading-tight tracking-tight"
          >
            {box.label}
          </Typography.Heading>
          <Typography className="mt-1 text-sm text-foreground/65">{summary}</Typography>
        </Box>
        <Box className="flex items-center gap-3">
          {actions}
          <Button variant="primary">
            <Plus {...ICON} size={16} strokeWidth={2} />
            Yeni talep başlat
          </Button>
        </Box>
      </Box>
      {showTabs ? <BoxTabs>{children}</BoxTabs> : children}
    </Box>
  )
}
