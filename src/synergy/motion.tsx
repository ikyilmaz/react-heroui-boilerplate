import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { MotionConfig, type Transition } from 'framer-motion'
import { useLook } from '@/synergy/shared/themeSettings'
import { INSTANT, scaleTransition } from '@/synergy/shared/transition'

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
 * Düzeye ve hıza göre geçiş: kapalıda anında. Aynı girdide aynı nesne döner (geçişi prop olarak
 * alan `memo` bileşenleri her çizimde yeniden çizilmesin); girdi değerine göre (nesne kimliği değil)
 * karşılaştırılır, satır içi nesne de verilebilir.
 */
export function useTransition(t: Transition = SPRING): Transition {
  const { motion: level, speed } = useLook()
  const key = t === SPRING ? '' : JSON.stringify(t)
  return useMemo(
    () => (level === 'off' ? INSTANT : scaleTransition(t, speed)),
    // `t` değeriyle (`key`) izlenir
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [level, speed, key],
  )
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
