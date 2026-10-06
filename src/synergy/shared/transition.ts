import type { Transition } from 'framer-motion'

/** Anında geçiş (tema paneli › Animasyon kapalı). */
export const INSTANT: Transition = { duration: 0 }

/**
 * Geçişi hız çarpanıyla ölçekler (tema paneli › Animasyon hızı): süre ve gecikme bölünür; görsel
 * süreli yayda (`visualDuration`) o süre bölünür (aynı eğri, kısa süre); fiziksel yayda sertlik
 * hızın karesiyle, sönüm hızla çarpılır (yayın karakteri korunur, süresi ölçeklenir). Alt anahtarlar
 * (ör. `{ layout: … }`) da ölçeklenir.
 */
export function scaleTransition(t: Transition, speed: number): Transition {
  if (speed === 1) return t
  const out = { ...t } as Record<string, unknown>
  if (typeof out.visualDuration === 'number') out.visualDuration = out.visualDuration / speed
  else if (out.type === 'spring' && out.duration == null) {
    out.stiffness = ((out.stiffness as number) ?? 100) * speed * speed
    out.damping = ((out.damping as number) ?? 10) * speed
  }
  if (typeof out.duration === 'number') out.duration = out.duration / speed
  if (typeof out.delay === 'number') out.delay = out.delay / speed
  for (const [k, v] of Object.entries(out))
    if (v && typeof v === 'object' && !Array.isArray(v))
      out[k] = scaleTransition(v as Transition, speed)
  return out as Transition
}
