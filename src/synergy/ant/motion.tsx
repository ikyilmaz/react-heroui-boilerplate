import { useEffect, useRef, useState } from 'react'
import { animate } from 'framer-motion'
import { Typography } from 'antd'
import { useLook } from '@/synergy/shared/themeSettings'
import { useTransition } from '@/synergy/motion'
import { MotionFlex, cn } from '@/synergy/ant/ui'

/*
 * antd sayfalarının animasyon parçaları (`motion.tsx`'teki karşılıklarının antd yapı taşlarıyla
 * yazılmışı): seçim göstergesi, sayan sayı. Yön bilgili içerik geçişi sekme sisteminde
 * (`tabs/ContentSwitch.tsx`). Zamanlama aynı kaynaktan
 * (`useTransition`, `--motion-time`), tema paneli › Animasyon hepsine uyar.
 */

/**
 * Seçili öğenin zemini: aynı `id`'li gösterge öğeden öğeye kayar (layoutId). Öğe `relative`
 * olmalı; içerik göstergenin üstünde kalsın diye `relative` (ya da `z-10`).
 */
export function Indicator({ id, className }: { id: string; className?: string }) {
  const transition = useTransition()
  return (
    <MotionFlex
      aria-hidden
      layoutId={id}
      transition={transition}
      // `block`: antd'de içi boş `Flex` gizlenir
      className={cn('pointer-events-none absolute inset-0 block rounded-[inherit]', className)}
    />
  )
}

/**
 * Sayı: ilk görünüşte 0'dan sayarak gelir; sonra değişince yeni değer yukarı (artış) ya da aşağı
 * (azalış) kayarak girer. Üst öğenin yazı tipini ve rengini alır.
 */
export function Count({ value, className }: { value: number; className?: string }) {
  const { motion: level, speed } = useLook()
  const [shown, setShown] = useState(level === 'full' ? 0 : value)
  const shownRef = useRef(shown)
  const counting = useRef(level === 'full')
  const [dir, setDir] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (shownRef.current === value) {
      counting.current = false
      return
    }
    if (!counting.current || level !== 'full') {
      counting.current = false
      setDir(value > shownRef.current ? 'up' : 'down')
      shownRef.current = value
      setShown(value)
      return
    }
    const run = animate(shownRef.current, value, {
      duration: Math.min(1.1, 0.5 + value / 400) / speed,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        shownRef.current = Math.round(v)
        setShown(shownRef.current)
      },
      onComplete: () => {
        counting.current = false
      },
    })
    return () => run.stop()
  }, [value, level, speed])

  return (
    <Typography.Text
      key={dir ? shown : 'count'}
      className={cn(
        'inline-block text-current [font:inherit] tabular-nums',
        dir === 'up' && 'animate-tick-up',
        dir === 'down' && 'animate-tick-down',
        className,
      )}
    >
      {shown}
    </Typography.Text>
  )
}
