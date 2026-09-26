import { useCallback, type KeyboardEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button, InputGroup, TextField, cn } from '@heroui/react'
import { FIELD_AFFIX, FIELD_ICON_BUTTON, FIELD_ICON_SIZE } from '@/components/fieldIconButton'
import { useBufferedValue } from '@/components/useBufferedValue'
import type { EditorOptions } from '../../types/EditorOptions'
import type { KeyHandler } from '../../types/KeyHandler'

export interface TextBoxEditorProps {
  label: string
  value: string
  onValueChange: (value: string) => void
  options: EditorOptions
  /** Content at the start of the field; a function receives `flush` for the buffered text. */
  prefix?: ReactNode | ((flush: () => void) => ReactNode)
  className?: string
  /** How long typed text waits before `onValueChange`. */
  delay: number
  flushOnUnmount?: boolean
  /** Outside writes are noticed through this identity (see `useBufferedValue`). */
  syncKey?: unknown
  onKeyDown?: KeyHandler
  clearLabel: string
}

/**
 * Text editor (dxTextBox). Typed text waits in the field itself and is written on pause, blur or
 * Enter — the field lives in the table's real DOM tree, so typing never rebuilds React Aria's
 * collection (see README "Performans").
 */
export function TextBoxEditor({
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
  clearLabel,
}: TextBoxEditorProps) {
  const { value: text, set, flush } = useBufferedValue(value, onValueChange, delay, {
    flushOnUnmount,
    syncKey: syncKey ?? value,
  })
  // Enter saves; the pending text must be written first
  const keyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === 'Enter') flush()
      onKeyDown?.(e)
    },
    [flush, onKeyDown],
  )
  // Clearing is a single action; it does not wait
  const clear = useCallback(() => {
    set('')
    flush()
  }, [flush, set])
  const start = typeof prefix === 'function' ? prefix(flush) : prefix
  return (
    <TextField
      fullWidth
      className={className}
      aria-label={label}
      value={text}
      onChange={set}
      onKeyDown={onKeyDown ? keyDown : undefined}
      onBlur={flush}
      isReadOnly={options.readOnly}
      isDisabled={options.disabled}
    >
      <InputGroup className="h-8 min-h-0 w-full">
        {/* The divider comes from the chooser's own end border; the prefix draws none */}
        {start && <InputGroup.Prefix className="border-0 px-0">{start}</InputGroup.Prefix>}
        {/*
          `min-w-0 flex-1`: must be able to shrink, or the suffix (clear button) overflows.
          `ps-3`: HeroUI drops the input's start padding when there is a prefix, since the
          prefix's own `px-3` normally provides it — ours is `px-0`, so the padding comes back.
        */}
        <InputGroup.Input
          className={cn('min-w-0 flex-1 py-1', start ? 'ps-3' : undefined)}
          placeholder={options.placeholder}
          maxLength={options.maxLength}
        />
        {options.showClearButton !== false && !options.readOnly && text !== '' && (
          <InputGroup.Suffix className={FIELD_AFFIX}>
            <Button
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={clearLabel}
              className={FIELD_ICON_BUTTON}
              onPress={clear}
            >
              <X size={FIELD_ICON_SIZE} aria-hidden />
            </Button>
          </InputGroup.Suffix>
        )}
      </InputGroup>
    </TextField>
  )
}
