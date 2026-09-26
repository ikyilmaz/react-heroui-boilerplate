import { Navigate, useNavigate, useParams } from 'react-router'
import { Card, Chip, EmptyState, Pagination, Surface, Typography, buttonVariants, cn } from '@heroui/react'
import { ChevronLeft, ChevronRight, Hourglass } from 'lucide-react'
import { findBox, findProcess, requestsOf } from '@/pages/workflows/workflowData'
import { Box } from '@/pages/workspace/ui'
import { usePageCrumbs } from '@/pages/workspace/crumbs'
import { ICON, card, tile } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Talep detayı
 *
 * Talebin içeriği (bilgiler, karar, onay akışı) henüz yok; yerinde HeroUI `EmptyState` ile bir
 * "Yakında" kartı duruyor. Başlık `Typography.Heading`; aynı süreçteki talepler arasında önceki /
 * sonraki gezinmesi HeroUI `Pagination` (özet "3 / 12" + önceki / sonraki düğmeleri).
 * ------------------------------------------------------------------------------------------------- */

/**
 * Önceki / sonraki: sayfalamanın hayalet oklarını yuvarlak beyaz karo ikon düğmesine çevirir
 * (HeroUI `buttonVariants`, `.button` stilleri `.pagination__link`'ten sonra gelir). Kenar halkası
 * (`tile`) yardımcı sınıf olduğu için HeroUI'nin odak halkasını ezer; odakta `status-focused` geri
 * verilir.
 */
const navButton = cn(buttonVariants({ variant: 'secondary', isIconOnly: true }), 'size-9', tile, 'data-[focus-visible]:status-focused')

export function RequestDetailPage() {
  const params = useParams()
  const navigate = useNavigate()
  const box = findBox(params.box)
  const process = findProcess(params.processId)

  const siblings = box && process ? requestsOf(box.id).filter((x) => x.processId === process.id) : []
  const index = siblings.findIndex((x) => x.id === params.requestId)
  const r = siblings[index]

  usePageCrumbs(
    box && process && r
      ? [
          { label: 'Ana Sayfa', href: '/calisma-alani' },
          { label: 'İş Akış Yönetimi', href: '/is-akislari' },
          { label: box.label, href: `/is-akislari/${box.id}` },
          { label: process.name, href: `/is-akislari/${box.id}/${process.id}` },
          { label: r.no },
        ]
      : null,
  )

  if (!box || !process) return <Navigate to="/is-akislari" replace />
  if (!r) return <Navigate to={`/is-akislari/${box.id}/${process.id}`} replace />

  const base = `/is-akislari/${box.id}/${process.id}`
  const prev = siblings[index - 1]
  const next = siblings[index + 1]

  return (
    <Box className="flex flex-col gap-5">
      <Box className="flex items-center justify-between gap-4">
        <Typography.Heading level={1} weight="bold" className="text-[1.75rem] leading-tight">
          {r.template.title}
        </Typography.Heading>
        {/* Aynı süreçteki talepler arasında gezinme */}
        <Pagination aria-label="Talepler arasında gezinme" className="w-auto shrink-0 flex-row gap-2">
          <Pagination.Summary className="px-2 tabular-nums">
            {index + 1} / {siblings.length}
          </Pagination.Summary>
          <Pagination.Content className="gap-2">
            <Pagination.Item>
              <Pagination.Previous
                aria-label="Önceki talep"
                isDisabled={!prev}
                onPress={() => prev && navigate(`${base}/${prev.id}`)}
                className={navButton}
              >
                <Pagination.PreviousIcon>
                  <ChevronLeft {...ICON} />
                </Pagination.PreviousIcon>
              </Pagination.Previous>
            </Pagination.Item>
            <Pagination.Item>
              <Pagination.Next
                aria-label="Sonraki talep"
                isDisabled={!next}
                onPress={() => next && navigate(`${base}/${next.id}`)}
                className={navButton}
              >
                <Pagination.NextIcon>
                  <ChevronRight {...ICON} />
                </Pagination.NextIcon>
              </Pagination.Next>
            </Pagination.Item>
          </Pagination.Content>
        </Pagination>
      </Box>

      {/* Henüz yapılmamış bölüm: "Yakında" */}
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
  )
}
