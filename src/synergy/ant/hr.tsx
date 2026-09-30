import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { App, Flex } from 'antd'
import { useTransition } from '@/synergy/motion'
import { MotionFlex, cn } from '@/synergy/ant/ui'

/* İK sayfalarının antd yardımcıları: bildirim ve yönlü sekme geçişi. */

/** Bildirim (antd `notification`): başlık + açıklama. */
export function useNotify() {
  const { notification } = App.useApp()
  const show = (kind: 'success' | 'warning' | 'info') => (title: string, description?: ReactNode) =>
    notification[kind]({ title, description, placement: 'bottomRight' })
  return { success: show('success'), warning: show('warning'), info: show('info') }
}

/** Sekmeler arası kayma mesafesi (px). */
const TAB_SHIFT = 24

/**
 * Sekme içeriği geçişi, sekmenin yönüyle orantılı: sağdaki sekmeye geçince yeni içerik sağdan
 * gelir, eskisi sola çıkar; soldakine geçince tersi.
 */
export function DirectionalPanels<T extends string>({
  ids,
  active,
  render,
  className,
}: {
  ids: readonly T[]
  active: T
  render: (id: T) => ReactNode
  className?: string
}) {
  const index = ids.indexOf(active)
  const prev = useRef(index)
  const dir = index >= prev.current ? 1 : -1
  useEffect(() => {
    prev.current = index
  }, [index])
  const transition = useTransition({ duration: 0.26, ease: [0.22, 1, 0.36, 1] })
  return (
    <Flex vertical role="tabpanel" className={cn('relative overflow-clip', className)}>
      <AnimatePresence initial={false} mode="popLayout" custom={dir}>
        <MotionFlex
          key={active}
          vertical
          custom={dir}
          variants={{
            enter: (d: number) => ({ x: d * TAB_SHIFT, opacity: 0 }),
            center: { x: 0, opacity: 1 },
            exit: (d: number) => ({ x: -d * TAB_SHIFT, opacity: 0 }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
        >
          {render(active)}
        </MotionFlex>
      </AnimatePresence>
    </Flex>
  )
}
