import { memo, useMemo } from 'react'
import { ListBox, Pagination, Select, Typography } from '@heroui/react'
import { FieldSelectIndicator } from '@/components/FieldSelectIndicator'
import { formatTemplate } from '../functions/formatTemplate'
import { getPageItems } from '../functions/getPageItems'
import { formatMessage } from '../localization/formatMessage'

export interface PagerProps {
  /** 0-based, as `paging.pageIndex`. */
  pageIndex: number
  pageCount: number
  totalCount: number
  pageSize: number
  pageSizes: number[]
  showPageSizeSelector: boolean
  showInfo: boolean
  infoText: string
  showNavigationButtons: boolean
  label: string
  onPageIndexChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
  className?: string
}

/**
 * The pager. `memo`: typing in a filter or editing a row does not change paging, yet the page
 * buttons and the size selector were rebuilt on every render.
 */
export const Pager = memo(function Pager({
  pageIndex,
  pageCount,
  totalCount,
  pageSize,
  pageSizes,
  showPageSizeSelector,
  showInfo,
  infoText,
  showNavigationButtons,
  label,
  onPageIndexChange,
  onPageSizeChange,
  className,
}: PagerProps) {
  const page = pageIndex + 1
  const pages = useMemo(() => getPageItems(page, pageCount), [page, pageCount])
  // `.pagination` is already w-full + justify-between: Summary left, Content right
  return (
    <Pagination aria-label={label} size="sm" className={className}>
      <Pagination.Summary>
        {showPageSizeSelector && (
          // Same roundness as the page buttons: `rounded-3xl` + `size-8`, i.e. circles
          <Select
            aria-label={formatMessage('dxPager-ariaPageSize')}
            className="w-26"
            value={String(pageSize)}
            onChange={(v) => v && onPageSizeChange(Number(v))}
          >
            <Select.Trigger className="h-8 min-h-0 items-center rounded-full py-1 pe-8">
              <Select.Value />
              <FieldSelectIndicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox aria-label={formatMessage('dxPager-ariaPageSizes')}>
                {pageSizes.map((n) => (
                  <ListBox.Item key={n} id={String(n)} textValue={formatMessage('dxPager-pageSizeItem', n)}>
                    {formatMessage('dxPager-pageSizeItem', n)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}
        {showInfo && (
          <Typography type="body-xs" color="muted" className="tabular-nums">
            {formatTemplate(infoText, page, pageCount, totalCount)}
          </Typography>
        )}
      </Pagination.Summary>
      <Pagination.Content>
        {showNavigationButtons && (
          <Pagination.Item>
            <Pagination.Previous
              aria-label={formatMessage('dxPager-prevButtonLabel')}
              isDisabled={pageIndex <= 0}
              onPress={() => onPageIndexChange(pageIndex - 1)}
            >
              <Pagination.PreviousIcon />
            </Pagination.Previous>
          </Pagination.Item>
        )}
        {pages.map((it, i) =>
          it === 'gap' ? (
            <Pagination.Item key={`gap-${i}`}>
              <Pagination.Ellipsis />
            </Pagination.Item>
          ) : (
            <Pagination.Item key={it}>
              <Pagination.Link
                aria-label={formatMessage('dxPager-ariaPageNumber', it)}
                aria-current={it === page ? 'page' : undefined}
                isActive={it === page}
                onPress={() => onPageIndexChange(it - 1)}
              >
                {it}
              </Pagination.Link>
            </Pagination.Item>
          ),
        )}
        {showNavigationButtons && (
          <Pagination.Item>
            <Pagination.Next
              aria-label={formatMessage('dxPager-nextButtonLabel')}
              isDisabled={pageIndex >= pageCount - 1}
              onPress={() => onPageIndexChange(pageIndex + 1)}
            >
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        )}
      </Pagination.Content>
    </Pagination>
  )
})
