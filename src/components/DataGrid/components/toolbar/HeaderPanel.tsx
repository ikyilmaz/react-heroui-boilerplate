import type { ReactNode } from 'react'
import { Filter, Plus } from 'lucide-react'
import { Surface, cn } from '@heroui/react'
import type { DataGridInstance } from '../../types/DataGridInstance'
import type { ToolbarItem } from '../../types/options/ToolbarItem'
import { SearchPanel } from './SearchPanel'
import { ToolbarButton } from './ToolbarButton'

export interface HeaderPanelProps<TRow> {
  items: ToolbarItem<TRow>[]
  disabled: boolean
  component: DataGridInstance<TRow>
  className: string
  search: {
    text: string
    onTextChange: (text: string) => void
    placeholder?: string
    width?: number | string
    delay: number
  }
  addRowText: string
  applyFilterText: string
  onApplyFilter: () => void
}

/** DevExtreme's header panel (the toolbar): items laid out `before` / `center` / `after`. */
export function HeaderPanel<TRow>({
  items,
  disabled,
  component,
  className,
  search,
  addRowText,
  applyFilterText,
  onApplyFilter,
}: HeaderPanelProps<TRow>) {
  const render = (item: ToolbarItem<TRow>, i: number): ReactNode => {
    const off = disabled || item.disabled
    let content: ReactNode
    if (item.render) content = item.render({ component })
    else if (item.name === 'searchPanel') content = <SearchPanel {...search} />
    else if (item.name === 'addRowButton')
      content = (
        <ToolbarButton
          component={component}
          disabled={off}
          options={{ icon: Plus, hint: addRowText, type: 'default', onClick: () => void component.addRow(), ...item.options }}
        />
      )
    else if (item.name === 'applyFilterButton')
      content = (
        <ToolbarButton
          component={component}
          disabled={off}
          options={{ icon: Filter, hint: applyFilterText, onClick: onApplyFilter, ...item.options }}
        />
      )
    else if (item.widget === 'dxButton' && item.options)
      content = <ToolbarButton component={component} disabled={off} options={item.options} />
    return (
      <Surface key={item.name ?? i} variant="transparent" className={cn('flex items-center', item.cssClass)}>
        {content}
      </Surface>
    )
  }
  const at = (location: 'before' | 'center' | 'after') =>
    items.filter((item) => (item.location ?? 'after') === location).map(render)
  return (
    <Surface variant="transparent" className={className}>
      <Surface variant="transparent" className="flex items-center gap-2">
        {at('before')}
      </Surface>
      <Surface variant="transparent" className="flex flex-1 items-center justify-center gap-2">
        {at('center')}
      </Surface>
      <Surface variant="transparent" className="flex items-center gap-2">
        {at('after')}
      </Surface>
    </Surface>
  )
}
