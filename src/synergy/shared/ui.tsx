import type { ComponentProps, ReactNode } from 'react'
import { Surface, Typography, cn } from '@heroui/react'
import { inline, tone } from '@/synergy/shared/tokens'

/* Yalnızca iki yerleşim yardımcısı: `Box` ve `Text`. HeroUI'de karşılığı olan yapı taşı buraya eklenmez. */

type BoxProps = Omit<ComponentProps<typeof Surface>, 'variant' | 'children'> & { children?: ReactNode }

/** Görünmez yerleşim kutusu; `Surface`'ın metin rengini sıfırlar, rengi üstünden alır. */
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
