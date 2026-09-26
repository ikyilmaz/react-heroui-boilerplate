import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { TooltipTriggerStateContext } from 'react-aria-components'
import { Tooltip } from '@heroui/react'

const TEXT_DELAY = 500
const HINT_DELAY = 700

/**
 * The grid's single HeroUI tooltip. A tooltip per cell text and per button (about 70 per page,
 * each a trigger with its own hover / focus hooks and a content component) re-rendered with every
 * grid change; now one `Tooltip.Content` is pointed at the hovered element through `triggerRef`.
 *
 * Elements opt in with `data-dx-tip="hint"` (buttons) or `data-dx-truncate` (texts, shown only
 * when actually cut off). Listeners are delegated on the grid root.
 */
export function GridTooltip({ rootRef }: { rootRef: RefObject<HTMLElement | null> }) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const [text, setText] = useState<string | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    let timer: ReturnType<typeof setTimeout> | undefined
    let current: Element | null = null
    const hide = () => {
      clearTimeout(timer)
      current = null
      setText((t) => (t === null ? t : null))
    }
    const show = (el: HTMLElement) => {
      const hint = el.dataset.dxTip
      const value = hint ?? (el.scrollWidth > el.clientWidth ? el.textContent : null)
      if (!value || !el.isConnected) return
      triggerRef.current = el
      setText(value)
    }
    const schedule = (el: HTMLElement | null) => {
      if (el === current) return
      hide()
      current = el
      if (el) timer = setTimeout(() => show(el), el.dataset.dxTip ? HINT_DELAY : TEXT_DELAY)
    }
    const onOver = (e: PointerEvent) =>
      schedule((e.target as Element).closest?.<HTMLElement>('[data-dx-tip],[data-dx-truncate]') ?? null)
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement
      if (el.matches?.('[data-dx-tip]:focus-visible')) schedule(el)
    }
    root.addEventListener('pointerover', onOver)
    root.addEventListener('pointerleave', hide)
    root.addEventListener('pointerdown', hide, true)
    root.addEventListener('keydown', hide, true)
    root.addEventListener('focusin', onFocus)
    root.addEventListener('focusout', hide)
    window.addEventListener('scroll', hide, { capture: true, passive: true })
    return () => {
      clearTimeout(timer)
      root.removeEventListener('pointerover', onOver)
      root.removeEventListener('pointerleave', hide)
      root.removeEventListener('pointerdown', hide, true)
      root.removeEventListener('keydown', hide, true)
      root.removeEventListener('focusin', onFocus)
      root.removeEventListener('focusout', hide)
      window.removeEventListener('scroll', hide, true)
    }
  }, [rootRef])

  // A tooltip normally gets its open state from its trigger; the shared one is given it here
  const state = useMemo(
    () => ({ isOpen: true, shouldSkipAnimation: false, open: () => {}, close: () => setText(null) }),
    [],
  )
  if (text === null) return null
  return (
    <TooltipTriggerStateContext.Provider value={state}>
      <Tooltip.Content triggerRef={triggerRef} isOpen placement="top">
        {text}
      </Tooltip.Content>
    </TooltipTriggerStateContext.Provider>
  )
}
