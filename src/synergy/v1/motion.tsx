import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, animate, motion, useIsPresent, type Transition } from 'framer-motion'
import { useOutlet } from 'react-router'
import { Typography, cn } from '@heroui/react'
import { inline } from '@/synergy/shared/tokens'
import { Box } from '@/synergy/shared/ui'
import { useLook } from '@/synergy/shared/themeSettings'

/* -------------------------------------------------------------------------------------------------
 * Karo animasyonları
 *
 * İki araç: CSS anahtarları (`index.css` › `animate-rise`, `animate-pop`…; giriş, çıkış, sayaç
 * kayması) ve framer-motion (seçim göstergelerinin `layoutId` kayması, liste yerleşimi, sayma).
 * Düzey tema panelinden (`useLook().motion`): CSS tarafı `--motion-*` değişkenleriyle, framer
 * tarafı `MotionScope` ve aşağıdaki geçişlerle ona uyar.
 * ------------------------------------------------------------------------------------------------- */

/** Görünmez yerleşim kutusunun hareketli sürümü. */
export const MotionBox = motion.create(Box)

/** Seçim göstergesi yayı (hızlı, hafif esnek). */
const SPRING: Transition = { type: 'spring', stiffness: 520, damping: 40, mass: 0.9 }
const INSTANT: Transition = { duration: 0 }

/** Kabukta: framer-motion'ı düzeye bağlar (az / kapalıda yerleşim ve kayma yok). */
export function MotionScope({ children }: { children: ReactNode }) {
  const level = useLook().motion
  return (
    <MotionConfig
      reducedMotion={level === 'full' ? 'never' : 'always'}
      transition={level === 'off' ? INSTANT : undefined}
    >
      {children}
    </MotionConfig>
  )
}

/** Düzeye göre geçiş: kapalıda anında. */
export function useTransition(t: Transition = SPRING): Transition {
  return useLook().motion === 'off' ? INSTANT : t
}

/* --- Giriş ------------------------------------------------------------------------------------ */

/** Yukarı kayarak beliren giriş (içerik değişince, öğe takıldığında bir kez). */
export const RISE = 'animate-rise'

/* --- Liste çıkışı ------------------------------------------------------------------------------ */

const LEAVE_MS = 280

/**
 * Tek satır listeden düşünce (karar, taslak silme) 280 ms yerinde kalır ve sağa kayarak çıkar.
 * Birden çok satır birden değişirse (arama, sayfa) beklemeden güncellenir.
 */
export function useLeaving<T extends { id: string }>(rows: T[]) {
  const [snap, setSnap] = useState<{ rows: T[]; gone: { item: T; index: number } | null }>({
    rows,
    gone: null,
  })
  if (snap.rows !== rows) {
    const removed = snap.rows.filter((r) => !rows.some((x) => x.id === r.id))
    const one = removed.length === 1 && rows.length === snap.rows.length - 1
    setSnap({
      rows,
      gone: one ? { item: removed[0]!, index: snap.rows.indexOf(removed[0]!) } : null,
    })
  }
  const gone = snap.gone
  useEffect(() => {
    if (!gone) return
    const t = window.setTimeout(() => setSnap((s) => ({ ...s, gone: null })), LEAVE_MS)
    return () => window.clearTimeout(t)
  }, [gone])
  const shown =
    gone && !rows.some((x) => x.id === gone.item.id)
      ? [...rows.slice(0, gone.index), gone.item, ...rows.slice(gone.index)]
      : rows
  /** Çıkmakta olan satırın sınıfı. */
  const leaving = (id: string) => gone?.item.id === id && 'pointer-events-none animate-leave'
  return [shown, leaving] as const
}

/* --- Sayılar ----------------------------------------------------------------------------------- */

/**
 * Sayı: ilk görünüşte 0'dan sayarak gelir; sonra değişince yeni değer yukarı (artış) ya da aşağı
 * (azalış) kayarak girer. Üst öğenin yazı tipini ve rengini alır.
 */
export function Count({ value, className }: { value: number; className?: string }) {
  const level = useLook().motion
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
      duration: Math.min(1.1, 0.5 + value / 400),
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
  }, [value, level])

  return (
    <Typography
      {...inline}
      key={dir ? shown : 'count'}
      className={cn(
        'inline-block text-current [font:inherit] tabular-nums',
        dir === 'up' && 'animate-tick-up',
        dir === 'down' && 'animate-tick-down',
        className,
      )}
    >
      {shown}
    </Typography>
  )
}

/* --- Seçim göstergesi -------------------------------------------------------------------------- */

/**
 * Seçili öğenin zemini: aynı `id`'li gösterge öğeden öğeye kayar (layoutId). Öğe `relative`
 * olmalı; içerik göstergenin üstünde kalsın diye `relative` (ya da `z-10`).
 */
export function Indicator({ id, className }: { id: string; className?: string }) {
  const transition = useTransition()
  return (
    <MotionBox
      aria-hidden
      layoutId={id}
      transition={transition}
      className={cn('pointer-events-none absolute inset-0 rounded-[inherit]', className)}
    />
  )
}

/* --- Sayfa geçişi ------------------------------------------------------------------------------ */

/** Çıkan sayfa son hâlinde donar (yoksa çıkarken yeni adresin içeriğini gösterirdi). */
function PageOutlet() {
  const outlet = useOutlet()
  const present = useIsPresent()
  const last = useRef(outlet)
  if (present) last.current = outlet
  return last.current
}

const PAGE_IN: Transition = { duration: 0.34, ease: [0.22, 1, 0.36, 1] }
const PAGE_OUT: Transition = { duration: 0.16, ease: [0.55, 0, 1, 0.45] }

/**
 * Sayfa geçişi: ekran tümüyle değişince (`page` değişince; ör. Başlangıç → İş Akış → talep) eski
 * sayfa hafifçe yukarı kayıp söner, sonra yenisi aşağıdan gelir. Aynı sayfa içindeki gezinme
 * (kutu, süreç değişimi) geçiş oynatmaz. Geçiş arasında sayfa başa kaydırılır.
 */
export function PageTransition({ page, className }: { page: string; className?: string }) {
  const off = useLook().motion === 'off'
  return (
    <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
      <MotionBox
        key={page}
        initial={{ opacity: 0, y: 18, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1, transition: off ? INSTANT : PAGE_IN }}
        exit={{ opacity: 0, y: -10, scale: 0.995, transition: off ? INSTANT : PAGE_OUT }}
        className={className}
      >
        <PageOutlet />
      </MotionBox>
    </AnimatePresence>
  )
}
