import { Avatar, Chip, ProgressBar, Surface, Typography } from '@heroui/react'
import { CellText, Highlight, type Column } from '@/components/DataGrid'
import { initials } from './initials'
import { REQUEST_STATUSES } from './requestStatuses'
import type { Request } from './Request'

/**
 * The requests columns, in DevExtreme's column format. Module level: the grid's memoized rows and
 * filter cells depend on the identity.
 *
 * Numbers are left-aligned here on purpose (DevExtreme's default is right) to keep the showcase's
 * look.
 */
export const REQUEST_COLUMNS: Column<Request>[] = [
  { type: 'buttons', caption: 'İşlemler', buttons: ['edit', 'delete', 'save', 'cancel'] },
  {
    dataField: 'requestNo',
    caption: 'İstek No',
    dataType: 'number',
    alignment: 'left',
    width: '13%',
    // Quoted '#' is a literal: 152356 → "#152356" in cells and in the editor alike
    format: "'#'0",
    editorOptions: { min: 0, format: 'decimal' },
    cellRender: ({ text }) => <CellText text={text} weight="medium" className="tabular-nums" />,
  },
  {
    dataField: 'starter',
    caption: 'Süreci Başlatan',
    dataType: 'string',
    width: '12%',
    cellRender: ({ data, text }) => (
      <Surface variant="transparent" className="flex min-w-0 items-center gap-2">
        <Avatar size="sm" variant="soft" aria-hidden>
          <Avatar.Fallback>{initials(data.starter)}</Avatar.Fallback>
        </Avatar>
        <CellText text={text} />
      </Surface>
    ),
  },
  {
    dataField: 'status',
    caption: 'Durum',
    width: '11%',
    lookup: { dataSource: REQUEST_STATUSES, valueExpr: 'id', displayExpr: 'label' },
    cellRender: ({ value, text }) => (
      <Chip size="sm" variant="soft" color={REQUEST_STATUSES.find((s) => s.id === value)?.color}>
        <Highlight text={text} />
      </Chip>
    ),
  },
  { dataField: 'processStart', caption: 'Süreç Başlangıcı', dataType: 'datetime', width: '15%' },
  { dataField: 'requestDate', caption: 'İstek Tarihi', dataType: 'date', width: '13%', sortOrder: 'asc' },
  {
    dataField: 'amount',
    caption: 'Tutar',
    dataType: 'number',
    alignment: 'left',
    width: '14%',
    format: { type: 'currency', currency: 'TRY', precision: 0 },
    selectedFilterOperation: '>=',
    editorOptions: { min: 0, step: 500 },
  },
  {
    dataField: 'progress',
    caption: 'İlerleme',
    dataType: 'number',
    alignment: 'left',
    // Stored 0–100, so not `percent` (that would multiply by 100): a literal '%' prefix instead
    format: "'%'0",
    selectedFilterOperation: '>=',
    editorOptions: { min: 0, max: 100, step: 5 },
    cellRender: ({ data, text }) => (
      <ProgressBar
        aria-label={`#${data.requestNo ?? ""} ilerleme`}
        value={data.progress ?? 0}
        size="sm"
        color={data.progress === 100 ? 'success' : 'accent'}
        className="gap-1"
      >
        <Typography type="body-xs" color="muted" className="tabular-nums">
          <Highlight text={text} />
        </Typography>
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
    ),
  },
]
