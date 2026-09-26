import type { ComponentProps, ReactNode } from 'react'
import { Surface, Typography, cn } from '@heroui/react'
import { inline, tone } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Yumuşak kabuk yardımcıları
 *
 * Kabuk ve iş akışı sayfaları HeroUI bileşenlerini doğrudan kullanır (`Tabs`, `ListBox`, `Button`,
 * `Chip`, `Avatar`, `SearchField`, `Breadcrumbs`, `EmptyState`...); burada yalnızca iki yerleşim
 * yardımcısı var: `Box` ve `Text`. Buraya yeni, HeroUI'de karşılığı olan bir yapı taşı eklenmez.
 * ------------------------------------------------------------------------------------------------- */

type BoxProps = Omit<ComponentProps<typeof Surface>, 'variant' | 'children'> & { children?: ReactNode }

/**
 * Görünmez yerleşim kutusu; içeriksiz süs öğeleri (nokta, çizgi) için de kullanılır. `Surface`
 * kendi metin rengini verir; yerleşim kutusu bunu yapmasın, rengi üstünden alsın (örn. siyah
 * seçili satırın içindeki metin beyaz kalsın).
 */
export function Box({ children = null, className, ...props }: BoxProps) {
  return (
    <Surface variant="transparent" className={cn('text-inherit', className as string)} {...props}>
      {children}
    </Surface>
  )
}

interface TextProps extends Omit<ComponentProps<typeof Typography>, 'color'> {
  tone?: keyof typeof tone
}

/** Satır içi metin. */
export function Text({ tone: t = 'secondary', className, ...props }: TextProps) {
  return <Typography {...inline} className={cn(tone[t], className)} {...props} />
}
