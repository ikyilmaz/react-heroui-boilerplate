import { CheckCheck, FilterX, Plus } from 'lucide-react'
import { Button, ButtonGroup } from '@heroui/react'
import type { DataGridInstance } from '@/components/DataGrid'
import { ACCENT_SOFT_BUTTON } from './accentSoftButton'
import type { Request } from './Request'

/**
 * The widget's toolbar buttons (a toolbar item's `render`). They work through the grid instance,
 * as DevExtreme toolbar items do.
 */
export function RequestsToolbarButtons({
  component,
  onAnnounce,
}: {
  component: DataGridInstance<Request>
  onAnnounce: (message: string) => void
}) {
  const selectedCount = component.getSelectedRowKeys().length
  const approveSelected = async () => {
    const store = component.getDataSource().store()
    const keys = component.getSelectedRowKeys()
    await Promise.all(keys.map((key) => store.update(key, { status: 'approved', progress: 100 })))
    component.clearSelection()
    onAnnounce(`${keys.length} istek onaylandı.`)
  }
  /*
    Hints come from the grid's shared tooltip (`data-dx-tip`): a HeroUI Tooltip around each button
    re-rendered with every grid change, since toolbar templates render with the grid.
  */
  return (
    <ButtonGroup aria-label="Tablo araçları">
      <Button
        size="sm"
        variant="secondary"
        className={ACCENT_SOFT_BUTTON}
        isIconOnly
        aria-label="Seçilenleri onayla"
        data-dx-tip={`Seçilenleri onayla${selectedCount ? ` (${selectedCount})` : ''}`}
        isDisabled={selectedCount === 0}
        onPress={approveSelected}
      >
        <CheckCheck size={16} aria-hidden />
      </Button>
      <Button
        size="sm"
        variant="secondary"
        className={ACCENT_SOFT_BUTTON}
        isIconOnly
        aria-label="Filtreyi temizle"
        data-dx-tip="Filtreyi temizle"
        isDisabled={!component.getCombinedFilter()}
        onPress={() => component.clearFilter()}
      >
        <FilterX size={16} aria-hidden />
      </Button>
      <Button
        size="sm"
        variant="primary"
        isIconOnly
        aria-label="Yeni istek"
        data-dx-tip="Yeni istek"
        onPress={() => component.addRow()}
      >
        <Plus size={16} aria-hidden />
      </Button>
    </ButtonGroup>
  )
}
