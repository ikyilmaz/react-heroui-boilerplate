import { cn } from '@heroui/react'
import ReactGridLayout from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { bodyPropsOf, useHome } from '@/pages/workspace/home/HomeContext'
import { COLS, densities } from '@/pages/workspace/home/metrics'
import type { WidgetId } from '@/pages/workspace/home/registry'
import { WidgetFrame } from '@/pages/workspace/home/WidgetFrame'
import { widgetBodies } from '@/pages/workspace/home/widgets'
import { Box } from '@/pages/workspace/ui'

/* -------------------------------------------------------------------------------------------------
 * Ana sayfa panosu
 *
 * Izgara görünümü react-grid-layout; kullanım kipinde kilitli (sürükleme ve boyutlandırma yalnızca
 * "Sayfayı düzenle" ile açılır). Kayıtlı konumlar yalnızca düzenleme kipinde güncellenir: kullanım
 * kipinde "boşken gizle" widget'larının çevresindeki geçici sıkıştırma kayıtlı düzeni ezmez.
 *
 * Tek sütun görünümü (ya da pano 760px'ten darsa) react-grid-layout kullanmaz: widget'lar
 * `state.order` sırasıyla, ortada en fazla 46rem genişliğinde, doğal yükseklikte dizilir; listeler
 * kendi tek sütun sınırı (`stackCap`) kadar satır gösterir. Hangi widget'ın çizildiği
 * `HomeContext › useBoardModel`'de (gizli, boşken gizli, bastırılmış olanlar çizilmez).
 * ------------------------------------------------------------------------------------------------- */

/** Tek bir widget: çerçeve + gövde. Boyutlar ızgara biriminden hesaplanır, DOM ölçülmez. */
function HomeWidget({ id, width }: { id: WidgetId; width: number }) {
  const home = useHome()
  const body = bodyPropsOf(id, home, width)
  const Body = widgetBodies[id]
  return (
    <WidgetFrame id={id} body={body}>
      <Body {...body} />
    </WidgetFrame>
  )
}

export interface HomeBoardProps {
  /** Pano genişliği (px; `useContainerWidth`). */
  width: number
  /** Genişlik en az bir kez ölçüldü mü; ölçülmeden ızgara çizilmez. */
  mounted: boolean
}

export function HomeBoard({ width, mounted }: HomeBoardProps) {
  const { board, actions, editing, stacked, density } = useHome()

  if (stacked) {
    return (
      <Box
        className={cn(
          'home-board mx-auto flex w-full max-w-[46rem] flex-col',
          density === 'compact' ? 'gap-[12px]' : 'gap-[20px]',
          editing && 'is-editing',
        )}
      >
        {board.rendered.map((id) => (
          <HomeWidget key={id} id={id} width={width} />
        ))}
      </Box>
    )
  }

  if (!mounted) return null

  const { rowHeight, margin } = densities[density]
  return (
    <ReactGridLayout
      className={cn('home-board', editing && 'is-editing')}
      width={width}
      layout={board.layout}
      gridConfig={{ cols: COLS, rowHeight, margin, containerPadding: [0, 0] }}
      dragConfig={{ enabled: editing, handle: '.widget-handle', cancel: '.no-drag' }}
      resizeConfig={{ enabled: editing, handles: ['se'] }}
      onLayoutChange={actions.setGridFromRGL}
      onDragStop={() => actions.markCustom()}
      onResizeStop={() => actions.markCustom()}
    >
      {board.rendered.map((id) => (
        <Box key={id}>
          <HomeWidget id={id} width={width} />
        </Box>
      ))}
    </ReactGridLayout>
  )
}
