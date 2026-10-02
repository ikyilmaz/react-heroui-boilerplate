import { useEffect, useState } from 'react'
import { usePresence, type Transition, type Variants } from 'framer-motion'
import { Modal, type ModalProps } from 'antd'
import { useTransition } from '@/synergy/motion'
import { MotionFlex, cn } from '@/synergy/ant/ui'

/*
 * Yumuşak açılıp kapanan pencere (antd `Modal` + Motion). antd'nin kendi geçişi (%20'den büyüyen
 * yakınlaşma) kapalı (`transitionName=""`); pencere `modalRender` ile Motion'a sarılır:
 * - Açılış: hafif küçük (%96) ve biraz aşağıdan, sönümlü bir yayla yerine oturur (neredeyse hiç
 *   sekmez); arka perde aynı anda solarak gelir (`@starting-style`).
 * - Kapanış: kısa, hızlanan bir solma ve küçülme; pencere çıkış bitene kadar açık kalır, sonra antd
 *   kapatır. `open` ile kapanınca da, üst bileşen pencereyi kaldırınca da (`AnimatePresence` içinde;
 *   `usePresence`) aynı çıkış oynar.
 * Hız tema panelinden (`useTransition`); azaltılmış animasyonda yalnızca solma (MotionScope),
 * kapalıyken anında.
 */

/** Açılış yayı: sönüm oranı ~0.9 (neredeyse hiç sekmez), ~0.35 sn. */
const ENTER: Transition = { type: 'spring', stiffness: 300, damping: 30, mass: 0.9 }
/** Kapanış: kısa ve hızlanan (çıkışta easeIn). */
const LEAVE: Transition = { duration: 0.16, ease: [0.4, 0, 1, 1] }

const panel = (enter: Transition, leave: Transition): Variants => ({
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  shown: { opacity: 1, scale: 1, y: 0, transition: enter },
  leave: { opacity: 0, scale: 0.98, y: 6, transition: leave },
})

export function SoftModal({ open = false, classNames, ...props }: ModalProps) {
  const enter = useTransition(ENTER)
  const leave = useTransition(LEAVE)
  // Üst bileşen kaldırınca (AnimatePresence içinde) çıkış oynar, bitince kaldırılır
  const [isPresent, safeToRemove] = usePresence()
  const visible = open && isPresent
  // antd'ye "açık" bilgisi çıkış bitene kadar sürer
  const [shown, setShown] = useState(visible)
  if (visible && !shown) setShown(true)
  // Kapalı pencere çıkışı bekletmez: üst bileşen (sayfa, form bölmesi) kalkarken pencere zaten
  // kapalıysa hemen "bitti" der; yoksa `AnimatePresence` onu sonsuza dek bekler (sayfa boş kalır)
  useEffect(() => {
    if (!isPresent && !shown) safeToRemove?.()
  }, [isPresent, shown, safeToRemove])
  const cls = typeof classNames === 'function' ? undefined : classNames

  return (
    <Modal
      {...props}
      open={shown}
      transitionName=""
      maskTransitionName=""
      classNames={{
        ...cls,
        // Perde: belirince solarak gelir, kapanırken solar
        mask: cn(
          cls?.mask,
          'transition-opacity duration-[calc(240ms*var(--motion-time,1))] ease-out starting:opacity-0',
          !visible && 'opacity-0 duration-[calc(160ms*var(--motion-time,1))] ease-in',
        ),
      }}
      modalRender={(node) => (
        <MotionFlex
          variants={panel(enter, leave)}
          initial="hidden"
          animate={visible ? 'shown' : 'leave'}
          onAnimationComplete={(name) => {
            if (name !== 'leave') return
            setShown(false)
            safeToRemove?.()
          }}
          // Kapanırken ikinci bir tıklama düğmelere gitmesin
          className={cn('block', !visible && 'pointer-events-none')}
        >
          {node}
        </MotionFlex>
      )}
    />
  )
}
