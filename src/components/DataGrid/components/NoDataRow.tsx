import { EmptyState, Table, Typography } from '@heroui/react'
import { NO_DATA_ROW_KEY } from '../constants/rowIds'

/** The filter row never leaves the body empty, so the no-data text is drawn as a row. */
export function NoDataRow({
  colSpan,
  text,
  className,
  rowClassName,
}: {
  colSpan: number
  text: string
  className?: string
  rowClassName?: string
}) {
  return (
    <Table.Row id={NO_DATA_ROW_KEY} textValue={text} className={rowClassName}>
      <Table.Cell colSpan={colSpan}>
        <EmptyState className={className}>
          <Typography type="body-sm" color="muted" align="center">
            {text}
          </Typography>
        </EmptyState>
      </Table.Cell>
    </Table.Row>
  )
}
