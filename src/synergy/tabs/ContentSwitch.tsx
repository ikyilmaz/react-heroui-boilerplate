import type { ReactNode } from 'react'
import { AnimatePresence, type Variants } from 'framer-motion'
import { MotionFlex } from '@/synergy/ant/ui'
import { TRAVEL, useTabMotion, type TabMotion } from '@/synergy/tabs/motion'

/* -------------------------------------------------------------------------------------------------
 * Yön bilgili içerik geçişi: bütün sekme içerikleri için tek parça ve tek zamanlama (`motion.ts`).
 * Yeni içerik değişimin yönünden kısa kayarak (30px) solarak gelir, eskisi yerinde söner. Ajanda
 * sekmeleri, Geri / İleri ve İK bölümleri bunu kullanır; form sekmelerinin bölmeleri DOM'da kalıcı
 * olduğundan aynı hareketi `Panes.tsx`'te MotionValue'larla yapar. Azaltılmış animasyonda
 * yalnızca solma (MotionScope dönüşümü kapatır), kapalıyken anında; ilk açılışta oynamaz.
 * ------------------------------------------------------------------------------------------------- */

const variants = (t: TabMotion, slide: boolean): Variants => ({
  enter: (dir: number) => ({ opacity: 0, x: slide ? dir * TRAVEL : 0 }),
  center: { opacity: 1, x: 0, transition: t.contentIn },
  exit: { opacity: 0, transition: t.contentOut },
})

/**
 * İçerik geçişi: `id` değişince eski içerik yerinde söner (`popLayout`: akıştan hemen çıkar, yeni
 * içerik beklemez; kap `relative` olmalı), yenisi `dir` yönünden gelir. `mode="fade"`: yalnızca
 * solma (yön anlamsızsa).
 */
export function ContentSwitch({
  id,
  dir,
  mode = 'slide',
  vertical,
  role,
  className,
  children,
}: {
  /** İçeriğin kimliği: değişince geçiş oynar. */
  id: string
  /** Değişimin yönü: 1 ileri (sağdan gelir), -1 geri (soldan gelir). */
  dir: number
  mode?: 'slide' | 'fade'
  vertical?: boolean
  role?: string
  className?: string
  children: ReactNode
}) {
  const t = useTabMotion()
  return (
    <AnimatePresence initial={false} mode="popLayout" custom={dir}>
      <MotionFlex
        key={id}
        vertical={vertical}
        role={role}
        custom={dir}
        variants={variants(t, mode === 'slide')}
        initial="enter"
        animate="center"
        exit="exit"
        className={className}
      >
        {children}
      </MotionFlex>
    </AnimatePresence>
  )
}
