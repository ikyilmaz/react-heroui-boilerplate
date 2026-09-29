import type { ReactNode } from 'react'
import { Button, InputGroup, Popover, Surface, Typography, cn } from '@heroui/react'
import { formatValue } from '../../functions/formatValue'
import { getDefaultFormat } from '../../functions/getDefaultFormat'
import { isDateType } from '../../functions/isDateType'
import { toDate } from '../../functions/toDate'
import type { EditorOptions } from '../../types/EditorOptions'
import type { FilterRowTexts } from '../../types/FilterRowTexts'
import type { GridColumn } from '../../types/GridColumn'
import { DateBoxEditor } from '../editors/DateBoxEditor'
import { NumberBoxEditor } from '../editors/NumberBoxEditor'

export interface BetweenFilterEditorProps<TRow> {
  column: GridColumn<TRow>
  label: string
  value: unknown
  onValueChange: (value: [unknown, unknown]) => void
  options: EditorOptions
  prefix: ReactNode
  className: string
  texts: FilterRowTexts
  locale: string
}

/**
 * `between`: the cell shows the range; its two ends are edited in a popup, as DevExtreme's filter
 * row does (the cell is too narrow for two fields).
 */
export function BetweenFilterEditor<TRow>({
  column,
  label,
  value,
  onValueChange,
  options,
  prefix,
  className,
  texts,
  locale,
}: BetweenFilterEditorProps<TRow>) {
  const [start, end] = Array.isArray(value) ? (value as [unknown, unknown]) : [undefined, undefined]
  const dates = isDateType(column.dataType)
  const show = (v: unknown) =>
    v === null || v === undefined || v === ''
      ? '…'
      : formatValue(dates ? toDate(v) : v, column.format ?? getDefaultFormat(column.dataType === 'datetime' ? 'date' : column.dataType), locale)
  const empty = (start ?? '') === '' && (end ?? '') === ''
  const editorOptions = { ...options, type: 'date' as const }
  const field = (which: 0 | 1) => {
    const fieldLabel = which === 0 ? texts.betweenStartText : texts.betweenEndText
    const current = which === 0 ? start : end
    const write = (v: unknown) => onValueChange(which === 0 ? [v, end] : [start, v])
    return dates ? (
      <DateBoxEditor
        label={`${label} — ${fieldLabel}`}
        value={current}
        onValueChange={write}
        options={editorOptions}
        className="w-full"
        delay={0}
        locale={locale}
      />
    ) : (
      <NumberBoxEditor
        label={`${label} — ${fieldLabel}`}
        value={current}
        onValueChange={write}
        options={options}
        className="w-full"
        locale={locale}
      />
    )
  }
  return (
    <InputGroup className={cn('h-8 min-h-0 w-full', className)}>
      <InputGroup.Prefix className="border-0 px-0">{prefix}</InputGroup.Prefix>
      <Popover>
        <Button
          variant="ghost"
          size="sm"
          aria-label={label}
          className="h-7 min-w-0 flex-1 justify-start px-3 font-normal"
        >
          <Typography type="body-sm" color={empty ? 'muted' : undefined} truncate>
            {empty ? `${texts.betweenStartText} – ${texts.betweenEndText}` : `${show(start)} – ${show(end)}`}
          </Typography>
        </Button>
        <Popover.Content placement="bottom start" className="w-64">
          <Popover.Dialog aria-label={label}>
            <Surface variant="transparent" className="flex flex-col gap-2 p-1">
              <Typography type="body-xs" color="muted">
                {texts.betweenStartText}
              </Typography>
              {field(0)}
              <Typography type="body-xs" color="muted">
                {texts.betweenEndText}
              </Typography>
              {field(1)}
            </Surface>
          </Popover.Dialog>
        </Popover.Content>
      </Popover>
    </InputGroup>
  )
}
