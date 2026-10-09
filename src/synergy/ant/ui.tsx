import type { ReactElement, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Avatar, Flex, Tag, Tooltip } from 'antd'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Sınıf birleştirme (tailwind-merge ile; çakışan Tailwind sınıflarında sonuncusu kalır). */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
import type { RequestStatus } from '@/synergy/shared/workflowData'

/*
 * antd sayfalarının küçük yapı taşları (form sayfası ve devamı). Ham HTML öğesi yok: yerleşim
 * kutusu antd `Flex` (Tailwind sınıflarıyla `grid` / `block` olabilir), metin `Typography`.
 */

/** Lucide ikonlarının ortak ayarı. */
export const IC = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

/** framer-motion ile canlandırılabilen yerleşim kutusu. */
export const MotionFlex = motion.create(Flex)

/** İpucu (kısa gecikmeyle). */
export function Tip({
  label,
  children,
  placement = 'top',
  disabled,
}: {
  label: ReactNode
  children: ReactElement
  placement?: 'top' | 'bottom' | 'left' | 'right'
  disabled?: boolean
}) {
  return (
    <Tooltip title={disabled ? undefined : label} placement={placement} mouseEnterDelay={0.4}>
      {children}
    </Tooltip>
  )
}

/** Birincil rengin açık tonunda ikon rozeti. */
export function TintIcon({
  icon: Icon,
  size = 40,
  className,
}: {
  icon: LucideIcon
  size?: number
  className?: string
}) {
  return (
    <Avatar
      size={size}
      shape="circle"
      aria-hidden
      icon={<Icon {...IC} size={Math.round(size * 0.45)} />}
      className={cn(
        'inline-flex! items-center justify-center bg-accent/12! text-accent-soft-foreground!',
        className,
      )}
    />
  )
}

/** Talep durumu: bitenler dolu (onay yeşil, ret kırmızı), süren açık sarı. */
export function StatusTag({ status }: { status: RequestStatus }) {
  const done = status === 'Tamamlandı'
  const final = done || status === 'Reddedildi'
  return (
    <Tag
      variant={final ? 'solid' : 'filled'}
      color={final ? (done ? 'success' : 'error') : 'warning'}
      className="me-0"
    >
      {status}
    </Tag>
  )
}

/** Kayan alan (dikey ya da yatay). */
export function Scroll({
  className,
  horizontal = false,
  children,
  ...rest
}: {
  className?: string
  horizontal?: boolean
  children: ReactNode
  role?: string
  'aria-label'?: string
}) {
  return (
    <Flex
      vertical={!horizontal}
      {...rest}
      className={cn(
        horizontal ? 'overflow-x-auto overflow-y-hidden' : 'overflow-y-auto',
        className,
      )}
    >
      {children}
    </Flex>
  )
}

/**
 * Kart çerçevesi (tüm kartlar): tema paneli › Kontur (`--border-width`) ve Kart gölgesi / Kart
 * stili (`--surface-shadow`; düz varsayılanda boş). Dolguyu kart stili `--surface`'le verir.
 */
export const CARD = 'ring-(length:--border-width) ring-border shadow-(--surface-shadow)'

/**
 * Yüzen panelin yüzeyi (tüm uygulamalar paneli, form destesinin kartları): raf ve başlat kutusuyla
 * aynı yüzey ve köşe (StartMenu › `CHROME_PANEL`; köşe tema panelinden, kartınkiyle aynı).
 */
export const FLOATING_SURFACE =
  'rounded-[min(calc(32px*var(--corner-scale,1)),calc(var(--radius)*3))] border border-border bg-surface shadow-(--overlay-shadow)'

/**
 * Yüzen drawer (antd `Drawer` `classNames`): kutu kenardan 12px boşluklu şeffaf kabın içinde;
 * kayarak çıkarken boşlukla birlikte tamamen ekran dışına gider.
 */
export const FLOATING_DRAWER = { wrapper: 'p-3 shadow-none', section: FLOATING_SURFACE }

/**
 * Kartın köşesi (CSS): AntTheme › Card `borderRadiusLG` ile aynı (temel yarıçapın 3 katı, en çok
 * 32px; squircle'da tavan da `--corner-scale` kadar büyür). Raf ve başlat kutusu da bunu kullanır.
 */
export const CARD_RADIUS = 'min(calc(32px * var(--corner-scale, 1)), calc(var(--radius) * 3))'
