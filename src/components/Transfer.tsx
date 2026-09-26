import { useMemo, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import {
  Button,
  Checkbox,
  EmptyState,
  ListBox,
  SearchField,
  Separator,
  Surface,
  Typography,
  cn,
  type Selection,
} from '@heroui/react'

import {
  FIELD_ICON_BUTTON,
  FIELD_ICON_SIZE,
  LIST_ITEM_SELECTED,
} from '@/components/fieldIconButton'

/** Typography varsayılan olarak <p> basar; satır içi metinlerde <span> gerekir. */
const inlineText = { elementType: 'span', slot: null } as unknown as Record<string, never>

/* -------------------------------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------------------------------- */

export interface TransferItem {
  key: string
  title: string
  description?: string
  disabled?: boolean
}

export type TransferDirection = 'left' | 'right'

export interface TransferProps {
  dataSource: TransferItem[]
  /** Sağ (hedef) listede bulunan öğelerin key listesi. */
  targetKeys: string[]
  onChange?: (targetKeys: string[], direction: TransferDirection, moveKeys: string[]) => void
  /** Kontrollü seçim (opsiyonel). */
  selectedKeys?: string[]
  onSelectChange?: (sourceSelectedKeys: string[], targetSelectedKeys: string[]) => void
  /** [Sol başlık, Sağ başlık] */
  titles?: [ReactNode, ReactNode]
  showSearch?: boolean
  /** Tek yönlü: sağ listede geri taşıma yerine silme (×) gösterilir. */
  oneWay?: boolean
  render?: (item: TransferItem) => ReactNode
  filterOption?: (inputValue: string, item: TransferItem) => boolean
  isDisabled?: boolean
  listClassName?: string
  className?: string
  texts?: Partial<TransferTexts>
}

type TransferTexts = typeof defaultTexts
const defaultTexts = {
  searchPlaceholder: 'Ara',
  notFound: 'Veri yok',
  itemUnit: 'öğe',
  remove: 'Kaldır',
}

/* -------------------------------------------------------------------------------------------------
 * Transfer
 * ------------------------------------------------------------------------------------------------- */

export function Transfer({
  dataSource,
  targetKeys,
  onChange,
  selectedKeys,
  onSelectChange,
  titles = ['Kaynak', 'Hedef'],
  showSearch = false,
  oneWay = false,
  render,
  filterOption,
  isDisabled = false,
  listClassName,
  className,
  texts: textsProp,
}: TransferProps) {
  const texts: TransferTexts = { ...defaultTexts, ...textsProp }

  const [innerSelected, setInnerSelected] = useState<string[]>([])
  const selected = selectedKeys ?? innerSelected

  const targetSet = useMemo(() => new Set(targetKeys), [targetKeys])
  const leftItems = useMemo(
    () => dataSource.filter((i) => !targetSet.has(i.key)),
    [dataSource, targetSet],
  )
  const rightItems = useMemo(
    () =>
      targetKeys
        .map((k) => dataSource.find((i) => i.key === k))
        .filter((i): i is TransferItem => Boolean(i)),
    [dataSource, targetKeys],
  )

  const leftSelected = selected.filter((k) => leftItems.some((i) => i.key === k))
  const rightSelected = selected.filter((k) => rightItems.some((i) => i.key === k))

  const setSelected = (next: string[]) => {
    setInnerSelected(next)
    onSelectChange?.(
      next.filter((k) => leftItems.some((i) => i.key === k)),
      next.filter((k) => rightItems.some((i) => i.key === k)),
    )
  }

  const moveTo = (direction: TransferDirection, moveKeys: string[]) => {
    if (moveKeys.length === 0) return
    const nextTarget =
      direction === 'right'
        ? [...targetKeys, ...moveKeys.filter((k) => !targetSet.has(k))]
        : targetKeys.filter((k) => !moveKeys.includes(k))
    onChange?.(nextTarget, direction, moveKeys)
    setSelected(selected.filter((k) => !moveKeys.includes(k)))
  }

  return (
    <Surface variant="transparent" className={cn('flex w-full items-stretch gap-3', className)}>
      <TransferList
        title={titles[0]}
        items={leftItems}
        selectedKeys={leftSelected}
        onSelectedChange={(keys) => setSelected([...rightSelected, ...keys])}
        showSearch={showSearch}
        render={render}
        filterOption={filterOption}
        isDisabled={isDisabled}
        texts={texts}
        className={listClassName}
      />

      <Surface variant="transparent" className="flex flex-col justify-center gap-2">
        <Button
          size="sm"
          variant="primary"
          isIconOnly
          aria-label="Sağa taşı"
          isDisabled={isDisabled || leftSelected.length === 0}
          onPress={() => moveTo('right', leftSelected)}
        >
          <ChevronRight size={16} aria-hidden />
        </Button>
        {!oneWay && (
          <Button
            size="sm"
            variant="primary"
            isIconOnly
            aria-label="Sola taşı"
            isDisabled={isDisabled || rightSelected.length === 0}
            onPress={() => moveTo('left', rightSelected)}
          >
            <ChevronLeft size={16} aria-hidden />
          </Button>
        )}
      </Surface>

      <TransferList
        title={titles[1]}
        items={rightItems}
        selectedKeys={rightSelected}
        onSelectedChange={(keys) => setSelected([...leftSelected, ...keys])}
        showSearch={showSearch}
        render={render}
        filterOption={filterOption}
        isDisabled={isDisabled}
        texts={texts}
        className={listClassName}
        onRemove={oneWay ? (key) => moveTo('left', [key]) : undefined}
      />
    </Surface>
  )
}

/* -------------------------------------------------------------------------------------------------
 * TransferList — tek panel
 *
 * Liste HeroUI `ListBox`; rol, klavye gezinmesi ve çoklu seçim oradan gelir. Seçim kutuları
 * `slot="selection"` ile koleksiyona bağlanır, kendi tıklama mantığımız yoktur.
 * ------------------------------------------------------------------------------------------------- */

interface TransferListProps {
  title: ReactNode
  items: TransferItem[]
  selectedKeys: string[]
  onSelectedChange: (keys: string[]) => void
  showSearch: boolean
  render?: (item: TransferItem) => ReactNode
  filterOption?: (inputValue: string, item: TransferItem) => boolean
  isDisabled: boolean
  texts: TransferTexts
  className?: string
  /** Verilirse (oneWay) seçim yerine kaldır butonu gösterilir. */
  onRemove?: (key: string) => void
}

function TransferList({
  title,
  items,
  selectedKeys,
  onSelectedChange,
  showSearch,
  render,
  filterOption,
  isDisabled,
  texts,
  className,
  onRemove,
}: TransferListProps) {
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    if (!query) return items
    const q = query.toLocaleLowerCase()
    return items.filter((i) =>
      filterOption
        ? filterOption(query, i)
        : i.title.toLocaleLowerCase().includes(q) ||
          (i.description?.toLocaleLowerCase().includes(q) ?? false),
    )
  }, [items, query, filterOption])

  const enabled = visible.filter((i) => !i.disabled)
  const allChecked = enabled.length > 0 && enabled.every((i) => selectedKeys.includes(i.key))
  const someChecked = !allChecked && enabled.some((i) => selectedKeys.includes(i.key))

  // RAC ListBox'ta `isDisabled` yok; panel kapalıyken tüm anahtarları devre dışı bırakıyoruz
  const disabledKeys = useMemo(
    () => visible.filter((i) => isDisabled || i.disabled).map((i) => i.key),
    [visible, isDisabled],
  )

  const toggleAll = (checked: boolean) => {
    const keys = enabled.map((i) => i.key)
    onSelectedChange(
      checked
        ? Array.from(new Set([...selectedKeys, ...keys]))
        : selectedKeys.filter((k) => !keys.includes(k)),
    )
  }

  /** ListBox "all" da verebilir; görünür ve etkin anahtarlara indirgiyoruz. */
  const applySelection = (keys: Selection) => {
    const next = keys === 'all' ? enabled.map((i) => i.key) : [...keys].map(String)
    // Aramayla gizlenmiş seçimler korunur
    const hidden = selectedKeys.filter((k) => !visible.some((i) => i.key === k))
    onSelectedChange([...hidden, ...next])
  }

  return (
    <Surface
      className={cn(
        // `basis-56 flex-1 min-w-0`: the two list panels share the width; a fixed one overflowed the card.
        // `max-w-[230px]`: an upper bound on growth — in a narrow container they still shrink together.
        'flex h-72 min-w-0 max-w-[230px] flex-1 basis-56 flex-col overflow-hidden rounded-xl border border-border',
        isDisabled && 'opacity-50',
        className,
      )}
    >
      <Surface variant="transparent" className="flex items-center gap-2 px-3 py-2">
        {!onRemove && (
          <Checkbox
            // primary varyantın kutusu panel zeminiyle aynı renkte kalıyor; secondary görünür
            variant="secondary"
            aria-label="Tümünü seç"
            isSelected={allChecked}
            isIndeterminate={someChecked}
            isDisabled={isDisabled || enabled.length === 0}
            onChange={toggleAll}
          >
            <Checkbox.Content>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
            </Checkbox.Content>
          </Checkbox>
        )}
        <Typography type="body-sm" color="muted" {...inlineText}>
          {selectedKeys.length > 0 ? `${selectedKeys.length}/` : ''}
          {items.length} {texts.itemUnit}
        </Typography>
        <Typography type="body-sm" weight="medium" truncate className="ml-auto" {...inlineText}>
          {title}
        </Typography>
      </Surface>
      <Separator />

      {showSearch && (
        <>
          <Surface variant="transparent" className="p-2">
            <SearchField
              aria-label={texts.searchPlaceholder}
              value={query}
              onChange={setQuery}
              isDisabled={isDisabled}
              fullWidth
            >
              <SearchField.Group>
                <SearchField.SearchIcon>
                  <Search size={16} aria-hidden />
                </SearchField.SearchIcon>
                <SearchField.Input placeholder={texts.searchPlaceholder} className="min-w-0" />
                <SearchField.ClearButton
                  aria-label="Temizle"
                  className={cn('me-1', FIELD_ICON_BUTTON)}
                >
                  <X size={FIELD_ICON_SIZE} aria-hidden />
                </SearchField.ClearButton>
              </SearchField.Group>
            </SearchField>
          </Surface>
          <Separator />
        </>
      )}

      <ListBox
        aria-label={typeof title === 'string' ? title : 'Liste'}
        selectionMode={onRemove ? 'none' : 'multiple'}
        selectedKeys={new Set(selectedKeys)}
        onSelectionChange={applySelection}
        disabledKeys={disabledKeys}
        className="flex-1 overflow-y-auto p-1"
        renderEmptyState={() => (
          <EmptyState>
            <Typography type="body-sm" color="muted" align="center">
              {texts.notFound}
            </Typography>
          </EmptyState>
        )}
      >
        {visible.map((item) => (
          <ListBox.Item
            key={item.key}
            id={item.key}
            textValue={item.title}
            className={LIST_ITEM_SELECTED}
          >
            {render ? (
              render(item)
            ) : (
              <Surface variant="transparent" className="flex min-w-0 flex-1 flex-col">
                <Typography type="body-sm" truncate {...inlineText}>
                  {item.title}
                </Typography>
                {item.description && (
                  <Typography type="body-xs" color="muted" truncate {...inlineText}>
                    {item.description}
                  </Typography>
                )}
              </Surface>
            )}

            {onRemove ? (
              <Button
                size="sm"
                variant="ghost"
                isIconOnly
                aria-label={`${item.title} ${texts.remove}`}
                isDisabled={isDisabled || item.disabled}
                className="ml-auto"
                onPress={() => onRemove(item.key)}
              >
                <X size={FIELD_ICON_SIZE} aria-hidden />
              </Button>
            ) : (
              <ListBox.ItemIndicator />
            )}
          </ListBox.Item>
        ))}
      </ListBox>
    </Surface>
  )
}
