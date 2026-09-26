import { useCallback, useMemo, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import type { CalendarDateTime } from '@internationalized/date'
import { Surface } from '@heroui/react'
import { DateTimePicker } from '@/components/DateTimePicker'
import { useBufferedValue } from '@/components/useBufferedValue'
import { fromCalendarDateTime } from '../../functions/fromCalendarDateTime'
import { toCalendarDateTime } from '../../functions/toCalendarDateTime'
import { toDate } from '../../functions/toDate'
import type { EditorOptions } from '../../types/EditorOptions'
import type { KeyHandler } from '../../types/KeyHandler'

export interface DateBoxEditorProps {
  label: string
  /** A `Date` (or ISO string); the picker works with `CalendarDateTime` internally. */
  value: unknown
  onValueChange: (value: Date | null) => void
  options: EditorOptions
  prefix?: ReactNode | ((flush: () => void) => ReactNode)
  className?: string
  delay: number
  flushOnUnmount?: boolean
  syncKey?: unknown
  onKeyDown?: KeyHandler
  locale: string
}

/**
 * Date editor (dxDateBox). Typing digits into segments fires a change per key, so the value is
 * buffered like text; clearing is a single action and does not wait.
 */
export function DateBoxEditor({
  label,
  value,
  onValueChange,
  options,
  prefix,
  className,
  delay,
  flushOnUnmount = false,
  syncKey,
  onKeyDown,
  locale,
}: DateBoxEditorProps) {
  const time = toDate(value)?.getTime()
  // One object per moment: a new one per render would reset what is being typed
  const external = useMemo(() => toCalendarDateTime(time === undefined ? null : new Date(time)), [time])
  const commit = useCallback(
    (v: CalendarDateTime | null) => onValueChange(fromCalendarDateTime(v)),
    [onValueChange],
  )
  const { value: date, set, flush } = useBufferedValue(external, commit, delay, {
    flushOnUnmount,
    syncKey: syncKey ?? external,
  })
  const change = useCallback(
    (v: CalendarDateTime | null) => {
      set(v)
      if (v === null) flush()
    },
    [flush, set],
  )
  const keyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter') flush()
      onKeyDown?.(e)
    },
    [flush, onKeyDown],
  )
  // Write once focus leaves the whole field (segments + buttons); moving between segments does not count
  const blur = useCallback(
    (e: FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node | null)) flush()
    },
    [flush],
  )
  return (
    <Surface variant="transparent" className="w-full min-w-0" onKeyDown={keyDown} onBlur={blur}>
      <DateTimePicker
        aria-label={label}
        className={className}
        compact
        prefix={typeof prefix === 'function' ? prefix(flush) : prefix}
        value={date}
        onChange={change}
        showTime={options.type === 'datetime'}
        isClearable={options.showClearButton !== false}
        isReadOnly={options.readOnly}
        isDisabled={options.disabled}
        locale={locale}
      />
    </Surface>
  )
}
