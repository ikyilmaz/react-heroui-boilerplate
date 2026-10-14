import type { CSSProperties } from 'react'
import { Flex } from 'antd'
import { cn } from '@/synergy/ant/ui'

/*
 * Yükleyici (antd `Spin`'in yerine; tasarım diline göre: düz, tek renk): birincil rengin çok açık
 * tonunda bir halka (iz) ve üzerinde dönen kuyruklu bir yay; kuyruk şeffaftan başlar, başa doğru
 * birincil renge koyulaşır, baş yuvarlaktır. Sabit hızla, hiç durmadan döner (tur 0.8 s ×
 * `--motion-time`; animasyon kapalıyken yay durur). Kalınlık kutunun %11'i (`--w`).
 */

/** Tam daire (`rounded-full` hap yarıçapına, köşe biçimi temaya bağlı). */
const ROUND = 'rounded-[50%] [corner-shape:round]'

export function Loader({
  size = 32,
  label = 'Yükleniyor',
  className,
}: {
  /** Kutunun eni ve boyu (px). */
  size?: number
  /** Ekran okuyucuda okunan. */
  label?: string
  className?: string
}) {
  return (
    <Flex
      component="span"
      role="status"
      aria-label={label}
      // Boyut ve kalınlık çalışma anında
      style={{ width: size, height: size, '--w': `${Math.max(2, size * 0.11)}px` } as CSSProperties}
      className={cn('relative inline-block shrink-0', className)}
    >
      {/* İz */}
      <Flex
        component="span"
        aria-hidden
        className={cn('absolute inset-0 block border-(length:--w) border-accent/15', ROUND)}
      />
      {/* Dönen yay: konik geçiş halkaya kırpılır; baş solda (270°), saat yönünde ilerler */}
      <Flex
        component="span"
        aria-hidden
        className="absolute inset-0 block animate-[spin_calc(0.8s*var(--motion-time,1))_linear_infinite]"
      >
        <Flex
          component="span"
          className={cn(
            'absolute inset-0 block bg-[conic-gradient(transparent_0deg,var(--accent)_270deg,transparent_270deg)] [mask:radial-gradient(farthest-side,transparent_calc(100%-var(--w)),#000_calc(100%-var(--w)+0.5px))]',
            ROUND,
          )}
        />
        {/* Yuvarlak baş */}
        <Flex
          component="span"
          className={cn(
            'absolute start-0 top-[calc(50%-var(--w)/2)] block size-(--w) bg-accent',
            ROUND,
          )}
        />
      </Flex>
    </Flex>
  )
}
