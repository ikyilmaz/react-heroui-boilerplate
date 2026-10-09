import { useMemo, useState } from 'react'
import type { Transition } from 'framer-motion'
import { useLook, type ContentMotion, type MotionLevel } from '@/synergy/shared/themeSettings'
import { INSTANT, scaleTransition } from '@/synergy/shared/transition'

/* -------------------------------------------------------------------------------------------------
 * Sekme sisteminin tek zamanlama tablosu (şerit, bölmeler, içerik geçişi). Göze yumuşak: her
 * geçişte tek baskın hareket, kısa yol, yaprak ve bölmelerde sekme (bounce) yok, sert kesme yerine
 * solma; hiçbir şey iki kez oynamaz, her geçiş yarıda kesilebilir. Tema paneli › Animasyon:
 * "Az" yalnızca solma (MotionConfig dönüşüm ve düzen animasyonlarını kapatır; elle sürülen
 * hareketler `level`'e bakar), "Kapalı" anında; hız çarpanı bütün süreleri böler.
 * ------------------------------------------------------------------------------------------------- */

/** Girişlerin eğrisi (ease-out-quint). */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const
/** Çıkışların eğrisi: hızlanarak gider. */
export const EASE_IN = [0.4, 0, 1, 1] as const
/** Sekmelerin yer değişimi (Chrome: 200 ms ease-in-out). */
export const EASE_IN_OUT = [0.42, 0, 0.58, 1] as const

const TABLE = {
  /** Seçili sekmenin yaprağı yeni sekmeye kayar. */
  sheet: { type: 'spring', visualDuration: 0.3, bounce: 0 },
  /** Yeni içerik sekmenin yönünden kısa kayıp solarak gelir. */
  contentIn: { duration: 0.3, ease: EASE_OUT },
  /** Eski içerik yerinde söner. */
  contentOut: { duration: 0.16, ease: EASE_IN },
  /** Bölmelerin düzeni: yan bölme açılır / kapanır, yer değiştirir, pay değişir. */
  pane: { duration: 0.42, ease: EASE_OUT },
  /** Tek başına görünen form kapanınca yerinde söner. */
  fade: { duration: 0.16, ease: EASE_OUT },
  /** Yeni sekme yuvasının solundan kayarak belirir. */
  tabIn: { duration: 0.2, ease: EASE_OUT },
  /** Kapanan sekmenin yazısı söner. */
  tabOut: { duration: 0.12, ease: EASE_IN },
  /** Komşu sekmeler yeni yerlerine kayar (FLIP). */
  shift: { duration: 0.2, ease: EASE_IN_OUT },
  /** Sürüklenen sekme bırakılınca yuvasına oturur (hız sürekliliği: fiziksel yay). */
  drop: { type: 'spring', visualDuration: 0.25, bounce: 0.1 },
  /** İskeletten forma geçiş. */
  reveal: { duration: 0.32, ease: EASE_OUT },
} satisfies Record<string, Transition>

/** İçerik geçişinin kayma yolu (px). */
export const TRAVEL = 30

export type TabMotion = Record<keyof typeof TABLE, Transition> & {
  /** Tema paneli › Animasyon düzeyi (elle sürülen hareketler için). */
  level: MotionLevel
  /** Sekme şeridinin hareketi (yaprak kayar, sekmeler kayarak yer değiştirir). */
  strip: boolean
  /** Sekme içeriğinin geçişi: kayarak, yalnızca solarak, hiç. */
  content: ContentMotion
}

/** Zamanlama tablosu, düzeye ve hıza göre; aynı ayarda aynı nesne (memo bileşenlerine verilebilir). */
export function useTabMotion(): TabMotion {
  const { motion: level, speed, anim } = useLook()
  const { strip, content } = anim
  return useMemo(() => {
    const out = { level, strip, content } as TabMotion
    for (const [key, t] of Object.entries(TABLE) as [keyof typeof TABLE, Transition][])
      out[key] = level === 'off' ? INSTANT : scaleTransition(t, speed)
    return out
  }, [level, speed, strip, content])
}

/** Değişimin yönü: sıra büyüdüyse 1 (sağdan gelir), küçüldüyse -1. Çizimde türetilir. */
export function useDirection(index: number): 1 | -1 {
  const [seen, setSeen] = useState<{ index: number; dir: 1 | -1 }>({ index, dir: 1 })
  if (seen.index !== index) {
    const dir = index > seen.index ? 1 : -1
    setSeen({ index, dir })
    return dir
  }
  return seen.dir
}
