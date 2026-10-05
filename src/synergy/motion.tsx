import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, MotionConfig, useIsPresent, type Transition } from 'framer-motion'
import { useOutlet } from 'react-router'
import { MotionFlex, cn } from '@/synergy/ant/ui'
import { useLook } from '@/synergy/shared/themeSettings'

/* -------------------------------------------------------------------------------------------------
 * Animasyon düzeni
 *
 * İki araç: CSS anahtarları (`index.css` › `animate-rise`, `animate-pop`…; giriş, çıkış, sayaç
 * kayması) ve framer-motion (seçim göstergelerinin `layoutId` kayması, liste yerleşimi, sayma;
 * bileşenleri `ant/motion.tsx`'te).
 * Düzey tema panelinden (`useLook().motion`): CSS tarafı `--motion-*` değişkenleriyle, framer
 * tarafı `MotionScope` ve aşağıdaki geçişlerle ona uyar.
 * ------------------------------------------------------------------------------------------------- */

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

/**
 * Geçişi hız çarpanıyla ölçekler (tema paneli › Animasyon hızı): süre ve gecikme bölünür; yayda
 * sertlik hızın karesiyle, sönüm hızla çarpılır (yayın karakteri korunur, süresi ölçeklenir).
 */
function scaleTransition(t: Transition, speed: number): Transition {
  if (speed === 1) return t
  const out = { ...t } as Record<string, unknown>
  if (out.type === 'spring' && out.duration == null) {
    out.stiffness = ((out.stiffness as number) ?? 100) * speed * speed
    out.damping = ((out.damping as number) ?? 10) * speed
  }
  if (typeof out.duration === 'number') out.duration = out.duration / speed
  if (typeof out.delay === 'number') out.delay = out.delay / speed
  return out as Transition
}

/** Düzeye ve hıza göre geçiş: kapalıda anında. */
export function useTransition(t: Transition = SPRING): Transition {
  const { motion: level, speed } = useLook()
  return level === 'off' ? INSTANT : scaleTransition(t, speed)
}

/* --- Liste çıkışı ------------------------------------------------------------------------------ */

const LEAVE_MS = 280

/**
 * Tek satır listeden düşünce (karar, taslak silme) 280 ms yerinde kalır ve sağa kayarak çıkar.
 * Birden çok satır birden değişirse (arama, sayfa) beklemeden güncellenir.
 */
export function useLeaving<T extends { id: string }>(rows: T[]) {
  const look = useLook()
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
    // Çıkış animasyonu kadar bekler (hız çarpanı ve kapalı animasyon dahil)
    const ms = look.motion === 'off' ? 0 : LEAVE_MS / look.speed
    const t = window.setTimeout(() => setSnap((s) => ({ ...s, gone: null })), ms)
    return () => window.clearTimeout(t)
  }, [gone, look.motion, look.speed])
  const shown =
    gone && !rows.some((x) => x.id === gone.item.id)
      ? [...rows.slice(0, gone.index), gone.item, ...rows.slice(gone.index)]
      : rows
  /** Çıkmakta olan satırın sınıfı. */
  const leaving = (id: string) => gone?.item.id === id && 'pointer-events-none animate-leave'
  return [shown, leaving] as const
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
 * sayfa söner, sonra yenisi belirir. Aynı sayfa içindeki gezinme (kutu, süreç değişimi) geçiş
 * oynatmaz. Geçiş arasında sayfa başa kaydırılır.
 */
export function PageTransition({ page, className }: { page: string; className?: string }) {
  const pageIn = useTransition(PAGE_IN)
  const pageOut = useTransition(PAGE_OUT)
  return (
    <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
      <MotionFlex
        key={page}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: pageIn }}
        exit={{ opacity: 0, transition: pageOut }}
        className={cn('block', className)}
      >
        <PageOutlet />
      </MotionFlex>
    </AnimatePresence>
  )
}
