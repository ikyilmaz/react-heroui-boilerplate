import { memo } from 'react'
import { Search, X } from 'lucide-react'
import { SearchField, cn } from '@heroui/react'
import { FIELD_ICON_BUTTON, FIELD_ICON_SIZE } from '@/components/fieldIconButton'
import { useBufferedValue } from '@/components/useBufferedValue'
import { formatMessage } from '../../localization/formatMessage'

/**
 * The search panel. What is typed waits here and becomes `searchPanel.text` after
 * `updateValueTimeout`, so each keystroke only re-renders this field, not the grid. Memoized:
 * the toolbar renders with every grid change, the search field need not.
 */
export const SearchPanel = memo(function SearchPanel({
  text,
  onTextChange,
  placeholder,
  width,
  delay,
}: {
  text: string
  onTextChange: (text: string) => void
  placeholder?: string
  width?: number | string
  delay: number
}) {
  const { value, set } = useBufferedValue(text, onTextChange, delay)
  return (
    <SearchField
      aria-label={formatMessage('dxDataGrid-ariaSearchInGrid')}
      className={cn('max-w-full', width === undefined && 'w-72')}
      style={width === undefined ? undefined : { width }}
      value={value}
      onChange={set}
    >
      <SearchField.Group className="h-8">
        <SearchField.SearchIcon>
          <Search size={16} aria-hidden />
        </SearchField.SearchIcon>
        <SearchField.Input
          placeholder={placeholder ?? formatMessage('dxDataGrid-searchPanelPlaceholder')}
          className="min-w-0 py-1"
        />
        <SearchField.ClearButton
          aria-label={formatMessage('dxDataGrid-ariaClearSearch')}
          className={cn('me-1', FIELD_ICON_BUTTON)}
        >
          <X size={FIELD_ICON_SIZE} aria-hidden />
        </SearchField.ClearButton>
      </SearchField.Group>
    </SearchField>
  )
})
