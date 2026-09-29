import { useMemo, useState, type KeyboardEvent, type ReactNode, type SyntheticEvent } from 'react'
import { ChevronDown, ChevronRight, X } from 'lucide-react'
// HeroUI'nin `InputGroup.Input`'u da budur: RAC Input + grubun `input` yuvası (bağlamı ComboBox verir)
import { Input } from 'react-aria-components'

import {
  Button,
  Checkbox,
  Chip,
  ComboBox,
  EmptyState,
  ListBox,
  Surface,
  Tag,
  TagGroup,
  Typography,
  cn,
  inputGroupVariants,
  type Key,
} from '@heroui/react'
import {
  FIELD_ICON_BUTTON,
  FIELD_ICON_SIZE,
  ICON_MUTED,
  LIST_ITEM_SELECTED,
  ROW_ICON_BUTTON,
  fieldIconButton,
} from '@/components/fieldIconButton'

/* -------------------------------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------------------------------- */

export interface TreeSelectNode {
  value: string
  title: ReactNode
  children?: TreeSelectNode[]
  disabled?: boolean
  /** false ise tıklanınca seçilmez, yalnızca aç/kapa yapar. */
  selectable?: boolean
}

export type CheckedStrategy = 'SHOW_ALL' | 'SHOW_PARENT' | 'SHOW_CHILD'

interface TreeSelectBaseProps {
  treeData: TreeSelectNode[]
  placeholder?: string
  allowClear?: boolean
  showSearch?: boolean
  treeDefaultExpandAll?: boolean
  treeDefaultExpandedKeys?: string[]
  /** Aramada eşleşme ölçütü (varsayılan: title metni içeriyor mu). */
  filterTreeNode?: (input: string, node: TreeSelectNode) => boolean
  notFoundContent?: ReactNode
  isDisabled?: boolean
  /** Çoklu modda en fazla kaç etiket gösterilsin; kalanlar "+N" olur. */
  maxTagCount?: number
  className?: string
  popoverClassName?: string
  /** Alanın erişilebilir adı. */
  'aria-label'?: string
}

export interface TreeSelectSingleProps extends TreeSelectBaseProps {
  multiple?: false
  treeCheckable?: false
  value?: string | null
  defaultValue?: string | null
  onChange?: (value: string | null, node: TreeSelectNode | null) => void
}

export interface TreeSelectMultipleProps extends TreeSelectBaseProps {
  multiple?: boolean
  /** Checkbox modu; ebeveyn/çocuk seçimi birbirine bağlıdır. */
  treeCheckable?: boolean
  /** treeCheckable ile: ebeveyn-çocuk bağlantısını kapat. */
  treeCheckStrictly?: boolean
  /** treeCheckable ile onChange'e hangi anahtarlar verilsin. @default "SHOW_CHILD" */
  showCheckedStrategy?: CheckedStrategy
  value?: string[]
  defaultValue?: string[]
  onChange?: (value: string[], nodes: TreeSelectNode[]) => void
}

export type TreeSelectProps = TreeSelectSingleProps | TreeSelectMultipleProps

/** Typography varsayılan olarak <p> basar; satır içi metinlerde <span> gerekir. */
const inlineText = { elementType: 'span', slot: null } as unknown as Record<string, never>

/** Stops the event before it reaches the ListBox row; no `preventDefault`, `click` must survive. */
const stopPress = (e: SyntheticEvent) => e.stopPropagation()

/* -------------------------------------------------------------------------------------------------
 * Ağaç yardımcıları
 * ------------------------------------------------------------------------------------------------- */

interface FlatNode {
  node: TreeSelectNode
  key: string
  level: number
  parentKey: string | null
  childKeys: string[]
  isLeaf: boolean
}

/** Açılır listede çizilen tek satır: ComboBox'ın koleksiyonu düz bir listedir. */
interface Row {
  id: string
  node: TreeSelectNode
  level: number
  hasChildren: boolean
}

function flatten(tree: TreeSelectNode[]) {
  const map = new Map<string, FlatNode>()
  const walk = (nodes: TreeSelectNode[], level: number, parentKey: string | null) => {
    for (const n of nodes) {
      const childKeys = n.children?.map((c) => c.value) ?? []
      map.set(n.value, {
        node: n,
        key: n.value,
        level,
        parentKey,
        childKeys,
        isLeaf: childKeys.length === 0,
      })
      if (n.children) walk(n.children, level + 1, n.value)
    }
  }
  walk(tree, 0, null)
  return map
}

function titleText(title: ReactNode): string {
  if (typeof title === 'string' || typeof title === 'number') return String(title)
  return ''
}

function descendants(map: Map<string, FlatNode>, key: string, out: string[] = []) {
  for (const c of map.get(key)?.childKeys ?? []) {
    out.push(c)
    descendants(map, c, out)
  }
  return out
}

function ancestors(map: Map<string, FlatNode>, key: string) {
  const out: string[] = []
  let p = map.get(key)?.parentKey ?? null
  while (p) {
    out.push(p)
    p = map.get(p)?.parentKey ?? null
  }
  return out
}

/** Verilen anahtarlardan tam "işaretli" kümeyi üretir: alt öğeler eklenir, tüm çocukları işaretli ebeveynler eklenir. */
function conduct(map: Map<string, FlatNode>, keys: Iterable<string>) {
  const set = new Set<string>()
  for (const k of keys) {
    if (!map.has(k)) continue
    set.add(k)
    for (const d of descendants(map, k)) if (!map.get(d)?.node.disabled) set.add(d)
  }
  const byLevelDesc = [...map.values()].sort((a, b) => b.level - a.level)
  for (const f of byLevelDesc) {
    if (f.isLeaf || set.has(f.key)) continue
    const enabled = f.childKeys.filter((c) => !map.get(c)?.node.disabled)
    if (enabled.length > 0 && enabled.every((c) => set.has(c))) set.add(f.key)
  }
  return set
}

function applyStrategy(map: Map<string, FlatNode>, set: Set<string>, strategy: CheckedStrategy) {
  const keys = [...map.keys()].filter((k) => set.has(k))
  switch (strategy) {
    case 'SHOW_PARENT':
      return keys.filter((k) => {
        const p = map.get(k)?.parentKey
        return !p || !set.has(p)
      })
    case 'SHOW_CHILD':
      return keys.filter((k) => map.get(k)?.isLeaf)
    default:
      return keys
  }
}

/* -------------------------------------------------------------------------------------------------
 * Arama kutusu
 *
 * ComboBox'ta odak her zaman input'tadır, liste "sanal" odaklanır: hangi satırın odaklı olduğunu
 * input'un `aria-activedescendant`ı söyler. Ağacın ←/→ (daralt/genişlet) tuşları da bu yüzden
 * burada yakalanır — satırın anahtarını bu bağdan okuyoruz.
 * ------------------------------------------------------------------------------------------------- */

interface TreeInputProps {
  placeholder?: string
  isReadOnly: boolean
  className: string
  onExpand: (key: string, expand: boolean) => void
  onBackspace: () => void
}

function TreeInput({ placeholder, isReadOnly, className, onExpand, onBackspace }: TreeInputProps) {
  /*
    Yakalama (capture) evresi: React Aria'nın kendi `onKeyDown`'ı ←/→ ile imleç gezindiği
    varsayımıyla sanal odağı bırakır (`setFocusedKey(null)`). Ağaçta bu tuşlar daralt/genişlet
    demek, o yüzden önce biz görüyoruz ve işlediğimizde yayılımı durduruyoruz.
  */
  const onKeyDownCapture = (e: KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget

    /*
      React Aria Tab'ı "odaklı öğeyi onayla" sayar (`state.commit()`), çoklu modda bu da
      seçimi açıp kapatır. Ağaçta Tab yalnızca alandan çıkmak demek: yayılımı durduruyoruz,
      tarayıcının kendi odak taşıması çalışmaya devam ediyor (menüyü blur kapatır).
    */
    if (e.key === 'Tab') {
      e.stopPropagation()
      return
    }

    if (input.value !== '') return
    if (e.key === 'Backspace') {
      onBackspace()
      return
    }
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    const aktif = input.getAttribute('aria-activedescendant')
    const key = aktif ? document.getElementById(aktif)?.dataset.key : null
    if (!key) return
    e.preventDefault()
    e.stopPropagation()
    onExpand(key, e.key === 'ArrowRight')
  }

  return (
    <Input
      placeholder={placeholder}
      readOnly={isReadOnly}
      className={className}
      onKeyDownCapture={onKeyDownCapture}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * TreeSelect
 *
 * Motor HeroUI'nin `ComboBox`'ıdır: açma/kapama, sanal odak, seçim (tekli/çoklu), klavye ve
 * erişilebilirlik oradan gelir. Ağaca özgü olan tek şey, koleksiyonun **görünür satırlardan**
 * üretilmesi: girinti `level`den, aç/kapa kendi `expanded` kümemizden gelir.
 * ------------------------------------------------------------------------------------------------- */

export function TreeSelect(props: TreeSelectProps) {
  const {
    treeData,
    placeholder = 'Seçiniz',
    allowClear = true,
    showSearch = true,
    treeDefaultExpandAll = false,
    treeDefaultExpandedKeys = [],
    filterTreeNode,
    notFoundContent = 'Sonuç yok',
    isDisabled = false,
    maxTagCount,
    className,
    popoverClassName,
    'aria-label': ariaLabel,
  } = props

  const isMultiple = props.multiple === true || props.treeCheckable === true
  const checkable = props.treeCheckable === true
  const strict = 'treeCheckStrictly' in props && props.treeCheckStrictly === true
  const strategy: CheckedStrategy =
    ('showCheckedStrategy' in props && props.showCheckedStrategy) || 'SHOW_CHILD'

  const map = useMemo(() => flatten(treeData), [treeData])
  const disabledKeys = useMemo(
    () => [...map.values()].filter((f) => f.node.disabled).map((f) => f.key),
    [map],
  )

  /* ---- değer (kontrollü / kontrolsüz) ---- */
  const [innerValue, setInnerValue] = useState<string[]>(() => {
    const dv = props.defaultValue
    return Array.isArray(dv) ? dv : dv ? [dv] : []
  })
  const rawValue: string[] = useMemo(() => {
    if (props.value === undefined) return innerValue
    return Array.isArray(props.value) ? props.value : props.value ? [props.value] : []
  }, [props.value, innerValue])

  /** Listede işaretli görünen tam küme (checkbox modunda ebeveyn/çocuk yayılımıyla). */
  const selectedSet = useMemo(
    () => (checkable && !strict ? conduct(map, rawValue) : new Set(rawValue)),
    [checkable, strict, map, rawValue],
  )

  const displayKeys = checkable && !strict ? applyStrategy(map, selectedSet, strategy) : rawValue
  const displayNodes = displayKeys
    .map((k) => map.get(k)?.node)
    .filter((n): n is TreeSelectNode => !!n)
  const hasValue = displayNodes.length > 0

  /* ---- arama / aç-kapa ---- */
  const [search, setSearch] = useState(() =>
    isMultiple ? '' : titleText(map.get(rawValue[0] ?? '')?.node.title ?? ''),
  )
  // ComboBox'ın "tetikleyiciden açılınca tümünü göster" davranışının ağaçtaki karşılığı:
  // süzme yalnızca kullanıcı yazarken açıktır.
  const [filtering, setFiltering] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(treeDefaultExpandAll ? [...map.keys()] : treeDefaultExpandedKeys),
  )

  const commit = (nextKeys: string[]) => {
    setInnerValue(nextKeys)
    if (isMultiple) {
      const nodes = nextKeys.map((k) => map.get(k)?.node).filter((n): n is TreeSelectNode => !!n)
      ;(props as TreeSelectMultipleProps).onChange?.(nextKeys, nodes)
    } else {
      const k = nextKeys[0] ?? null
      const node = k ? (map.get(k)?.node ?? null) : null
      setSearch(titleText(node?.title ?? ''))
      setFiltering(false)
      ;(props as TreeSelectSingleProps).onChange?.(k, node)
    }
  }

  /** Mevcut sırayı koruyup yeni anahtarları sona ekler. */
  const ordered = (next: Set<string>) => [
    ...rawValue.filter((k) => next.has(k)),
    ...[...next].filter((k) => !rawValue.includes(k)),
  ]

  const setExpand = (key: string, expand: boolean) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (expand) next.add(key)
      else next.delete(key)
      return next
    })

  /* ---- görünür satırlar ---- */
  const matches = (n: TreeSelectNode) =>
    filterTreeNode
      ? filterTreeNode(search, n)
      : titleText(n.title).toLocaleLowerCase().includes(search.toLocaleLowerCase())

  /** Aramada eşleşen ya da eşleşen torunu olan düğümler. */
  const visibleKeys = useMemo(() => {
    if (!filtering || !search) return null
    const vis = new Set<string>()
    for (const f of map.values()) {
      if (matches(f.node)) {
        vis.add(f.key)
        for (const a of ancestors(map, f.key)) vis.add(a)
      }
    }
    return vis
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtering, search, map, filterTreeNode])

  const rows = useMemo(() => {
    const out: Row[] = []
    const walk = (nodes: TreeSelectNode[], level: number) => {
      for (const n of nodes) {
        if (visibleKeys && !visibleKeys.has(n.value)) continue
        const shown = (n.children ?? []).filter((c) => !visibleKeys || visibleKeys.has(c.value))
        out.push({ id: n.value, node: n, level, hasChildren: shown.length > 0 })
        // Arama sırasında eşleşmeyi göstermek için dallar hep açık
        if (shown.length && (visibleKeys || expanded.has(n.value))) walk(shown, level + 1)
      }
    }
    walk(treeData, 0)
    return out
  }, [treeData, visibleKeys, expanded])

  /* ---- seçim ---- */

  /** Bağlantılı checkbox modu: eklenen/çıkarılan anahtarları alt ağaç ve ebeveynlere yayar. */
  const applyChecks = (added: string[], removed: string[]) => {
    const next = new Set(selectedSet)
    for (const k of added) {
      for (const d of [k, ...descendants(map, k)]) if (!map.get(d)?.node.disabled) next.add(d)
    }
    for (const k of removed) {
      for (const d of [k, ...descendants(map, k)]) next.delete(d)
      for (const a of ancestors(map, k)) next.delete(a)
    }
    commit(applyStrategy(map, conduct(map, next), strategy))
  }

  const onComboChange = (next: Key | readonly Key[] | null) => {
    const nextSet = new Set<string>(
      next == null ? [] : Array.isArray(next) ? next.map(String) : [String(next as Key)],
    )
    const added = [...nextSet].filter((k) => !selectedSet.has(k))
    const removed = [...selectedSet].filter((k) => !nextSet.has(k))

    // Seçilemez düğümler: seçmek yerine aç/kapa
    const nonSelectable = added.filter((k) => map.get(k)?.node.selectable === false)
    for (const k of nonSelectable) {
      setExpand(k, !expanded.has(k))
      nextSet.delete(k)
    }
    const realAdded = added.filter((k) => !nonSelectable.includes(k))
    if (realAdded.length === 0 && removed.length === 0) return

    if (checkable && !strict) applyChecks(realAdded, removed)
    else if (isMultiple) commit(ordered(nextSet))
    else if (realAdded[0]) commit([realAdded[0]])
  }

  const removeValue = (key: string) => {
    if (checkable && !strict) applyChecks([], [key])
    else commit(rawValue.filter((k) => k !== key))
  }

  const clear = () => commit([])

  /* ---- görünüm ---- */
  const shownTags = maxTagCount ? displayNodes.slice(0, maxTagCount) : displayNodes
  const hiddenCount = displayNodes.length - shownTags.length
  const showClear = allowClear && hasValue && !isDisabled
  const fieldSlots = useMemo(() => inputGroupVariants({ fullWidth: true }), [])

  return (
    <ComboBox
      className={cn('w-80 max-w-full', className)}
      aria-label={ariaLabel}
      selectionMode={isMultiple ? 'multiple' : 'single'}
      value={isMultiple ? [...selectedSet] : (rawValue[0] ?? null)}
      onChange={onComboChange}
      disabledKeys={disabledKeys}
      items={rows}
      inputValue={search}
      onInputChange={(v) => {
        setSearch(v)
        setFiltering(true)
      }}
      onOpenChange={(open, trigger) => {
        // Tetikleyiciden açılınca ağacın tamamı görünür; kapanınca yazılan süzgeç geri alınır
        if (trigger !== 'input') setFiltering(false)
        if (!open) {
          setFiltering(false)
          setSearch(isMultiple ? '' : titleText(displayNodes[0]?.title ?? ''))
        }
      }}
      // Süzme ağaca göre yapılır (eşleşenin ataları da görünmeli); ComboBox'ın düz süzgeci kapalı
      defaultFilter={() => true}
      // Eşleşme yoksa açılır kutu kapanmasın, "sonuç yok" görünsün
      allowsEmptyCollection
      // Ağaca göz atmak birincil eylem: alana odaklanınca açılsın, yazmak süzsün
      menuTrigger="focus"
      isDisabled={isDisabled}
      fullWidth
    >
      {/*
        `.combo-box__input-group` yalnızca `relative isolate inline-flex`; alanın görünümü
        normalde Input'un kendisinden gelir. Etiketler (Tag) Input'un yanında duracağı için
        kutuyu gruba veriyoruz (diğer alanlarla aynı `inputGroupVariants` tabanı) ve Input'u
        şeffaflaştırıyoruz. Chevron ile temizle düğmesi Combobox'taki gibi kutuya biniyor.
      */}
      <ComboBox.InputGroup
        className={cn(
          fieldSlots.base(),
          'h-auto min-h-9 flex-wrap items-center gap-1 bg-field py-1 ps-3',
          showClear ? 'pe-15' : 'pe-8',
          'focus-within:status-focused-field focus-within:border-(--field-border-focus) focus-within:bg-(--field-focus)',
        )}
      >
        {isMultiple && shownTags.length > 0 && (
          <TagGroup
            size="sm"
            aria-label={ariaLabel ? `${ariaLabel}: seçili öğeler` : 'Seçili öğeler'}
            className="min-w-0"
            onRemove={
              isDisabled
                ? undefined
                : (keys) => {
                    for (const k of keys) removeValue(String(k))
                  }
            }
          >
            <TagGroup.List items={shownTags} className="gap-1">
              {(n) => (
                <Tag id={n.value} textValue={titleText(n.title) || n.value} className="max-w-40">
                  <Typography {...inlineText} type="body-xs" truncate className="text-inherit">
                    {n.title}
                  </Typography>
                  {/* HeroUI'nin kendi kapat ikonu yerine lucide; renk diğer ikon düğmeleriyle aynı */}
                  <Tag.RemoveButton aria-label="Kaldır" className={ICON_MUTED}>
                    <X size={12} aria-hidden />
                  </Tag.RemoveButton>
                </Tag>
              )}
            </TagGroup.List>
          </TagGroup>
        )}

        {hiddenCount > 0 && (
          <Chip size="sm" variant="soft" className="shrink-0">
            {`+${hiddenCount}`}
          </Chip>
        )}

        <TreeInput
          placeholder={hasValue && isMultiple ? undefined : placeholder}
          isReadOnly={!showSearch}
          // Kutu grupta; yazı alanı HeroUI'nin grup içi girdisi (şeffaf, kenarsız, flex-1)
          className={cn(fieldSlots.input(), 'min-w-16 p-0') ?? ''}
          onExpand={setExpand}
          onBackspace={() => {
            if (isMultiple && displayKeys.length) removeValue(displayKeys[displayKeys.length - 1])
          }}
        />

        {showClear && (
          <Button
            variant="ghost"
            size="sm"
            isIconOnly
            aria-label="Temizle"
            className={cn(FIELD_ICON_BUTTON, 'absolute end-8 top-1/2 z-10 -translate-y-1/2')}
            onPress={clear}
          >
            <X size={FIELD_ICON_SIZE} aria-hidden />
          </Button>
        )}

        <ComboBox.Trigger className={cn(fieldIconButton, 'end-1 pe-0')}>
          <ChevronDown size={FIELD_ICON_SIZE} aria-hidden />
        </ComboBox.Trigger>
      </ComboBox.InputGroup>

      <ComboBox.Popover className={popoverClassName}>
        <ListBox
          aria-label={ariaLabel ?? 'Seçenekler'}
          // Koleksiyon öğe kimliğine göre önbelleklenir; işaretler dışarıdaki kümeden geliyor
          dependencies={[selectedSet, checkable, expanded, visibleKeys]}
          renderEmptyState={() => (
            <EmptyState className="py-6">
              <Typography type="body-sm" color="muted" align="center">
                {notFoundContent}
              </Typography>
            </EmptyState>
          )}
        >
          {(row: Row) => {
            const half =
              checkable &&
              !strict &&
              !selectedSet.has(row.id) &&
              descendants(map, row.id).some((d) => selectedSet.has(d))

            return (
              <ListBox.Item
                id={row.id}
                textValue={titleText(row.node.title) || row.id}
                // Yapraklarda chevron yok; yerini dolgu tutar (24px düğme + 4px aralık)
                style={{ paddingInlineStart: 10 + row.level * 20 + (row.hasChildren ? 0 : 28) }}
                className={cn('gap-1', LIST_ITEM_SELECTED)}
              >
                {({ isSelected }) => (
                  <>
                    {row.hasChildren && (
                      /*
                        The row is `role="option"`, so no button may go inside it. The chevron is
                        presentational (aria-hidden); its keyboard equivalent is ←/→ in the input.

                        `Pressable` is not used: React Aria's press events reach the outside too
                        once they nest, and that selected the row. Instead we stop the pointer
                        events before they arrive at the row.

                        Stopping `pointerdown` alone is not enough — worse, it is the cause of the
                        bug: in a dropdown, selection happens on press *up*
                        (`allowsDifferentPressOrigin`: pressing on the trigger and releasing on a
                        row selects it too). For that, `usePress` fires `onPressUp` from the row's
                        `pointerup` even when no press ever started — and swallowing the press is
                        exactly what creates that condition. So the release events must be stopped
                        as well; `click` comes last in the sequence and is too late.
                      */
                      <Surface
                        aria-hidden
                        variant="transparent"
                        className={cn(fieldIconButton, ROW_ICON_BUTTON, 'shrink-0')}
                        onPointerDown={(e) => {
                          // preventDefault: keep focus in the input, don't let the row start a press
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onPointerUp={stopPress}
                        // Without PointerEvent, usePress falls back to the mouse/touch path
                        onMouseDown={stopPress}
                        onMouseUp={stopPress}
                        onTouchStart={stopPress}
                        onTouchEnd={stopPress}
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpand(row.id, !expanded.has(row.id))
                        }}
                      >
                        <ChevronRight
                          size={FIELD_ICON_SIZE}
                          className={cn(
                            'transition-transform motion-reduce:transition-none',
                            (visibleKeys || expanded.has(row.id)) && 'rotate-90',
                          )}
                        />
                      </Surface>
                    )}

                    {checkable && (
                      <Checkbox
                        aria-hidden
                        excludeFromTabOrder
                        isReadOnly
                        isSelected={isSelected}
                        isIndeterminate={half}
                        className="pointer-events-none shrink-0"
                      >
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox.Content>
                      </Checkbox>
                    )}

                    <Typography
                      {...inlineText}
                      type="body-sm"
                      truncate
                      className="min-w-0 flex-1 text-inherit"
                    >
                      {row.node.title}
                    </Typography>

                    {!checkable && (
                      /* HeroUI yalnızca kendi checkmark SVG'sini gizliyor; lucide ikonu elle gizlenmeli */
                      <ListBox.ItemIndicator />
                    )}
                  </>
                )}
              </ListBox.Item>
            )
          }}
        </ListBox>
      </ComboBox.Popover>
    </ComboBox>
  )
}
