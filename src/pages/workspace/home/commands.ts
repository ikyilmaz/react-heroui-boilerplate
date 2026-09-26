import { useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpToLine, EyeOff, MoveHorizontal, SlidersHorizontal } from 'lucide-react'
import { markAllRead } from '@/pages/workflows/triage'
import { afterPaint, focusMenuTrigger } from '@/pages/workspace/home/actions'
import { useHome } from '@/pages/workspace/home/HomeContext'
import { COLS, flatRows } from '@/pages/workspace/home/metrics'
import { seeAllHref, titleOf, widgetDefs, type WidgetId, type WidgetMode } from '@/pages/workspace/home/registry'
import { canMove, moveAnnouncement, type MoveDir } from '@/pages/workspace/home/useHomeState'
import { queueSections, useFyi, useTriage } from '@/pages/workspace/home/useTriage'

/* -------------------------------------------------------------------------------------------------
 * Widget çerçevesinin içeriği: başlık, "Tümünü gör", başlık düğmeleri ve "…" menüsü
 *
 * Çerçeve (`WidgetFrame`) bunları yalnızca çizer; hangi öğenin ne zaman görüneceği ve ne yaptığı
 * burada. Menü bölümleri HeroUI `Dropdown.Section`'a birebir karşılık gelir: seçimli bölümlerin
 * (`selectionMode`) kendi `onSelectionChange`'i var, diğer öğeler `onAction(key)` ile çalışır.
 * ------------------------------------------------------------------------------------------------- */

export interface MenuItemModel {
  /** `Dropdown.Item` `id`'si (`onAction` anahtarı). */
  id: string
  label: string
  /** Her `textValue` widget başlığını içerir. */
  textValue: string
  icon?: LucideIcon
  isDisabled?: boolean
}

export interface MenuSectionModel {
  id: string
  /** Görünür bölüm başlığı (`Dropdown.Section` › `Header`); yoksa başlıksız. */
  label?: string
  selectionMode?: 'single' | 'multiple'
  selectedKeys?: string[]
  onSelectionChange?: (keys: 'all' | Set<string | number>) => void
  items: MenuItemModel[]
}

export interface HeaderActionModel {
  id: string
  label: string
  icon: LucideIcon
  onPress: () => void
}

export interface WidgetChrome {
  id: WidgetId
  /** Kipe göre başlık. */
  title: string
  icon: LucideIcon
  /** h2'nin `id`'si; çerçeve `aria-labelledby` ile bağlar. */
  headingId: string
  /** "…" düğmesinin ve menünün `aria-label`'ı: "{başlık} seçenekleri". */
  menuLabel: string
  /** "Tümünü gör" adresi; düzenleme kipinde ve adressiz widget'ta `undefined`. */
  seeAll?: string
  /** Başlıktaki hayalet `sm` düğmeler (ör. "Sırayla ilerle"); düzenleme kipinde yok. */
  headerActions: HeaderActionModel[]
  /** "…" menüsü bölümleri, sırasıyla. */
  menu: MenuSectionModel[]
  /** `Dropdown.Menu onAction`; seçimli bölümlerin anahtarlarını yok sayar. */
  onAction: (key: string | number) => void
  /** Düzenleme kipindeki kip seçici (`ToggleButtonGroup`); tek kipte boş. */
  modes: WidgetMode[]
  mode: string
  setMode: (mode: string) => void
}

const moveItems: { dir: MoveDir; label: string; icon: LucideIcon; gridOnly?: boolean }[] = [
  { dir: 'up', label: 'Yukarı taşı', icon: ArrowUp },
  { dir: 'down', label: 'Aşağı taşı', icon: ArrowDown },
  { dir: 'top', label: 'En üste taşı', icon: ArrowUpToLine },
  { dir: 'left', label: 'Sola taşı', icon: ArrowLeft, gridOnly: true },
  { dir: 'right', label: 'Sağa taşı', icon: ArrowRight, gridOnly: true },
]

const firstKey = (keys: 'all' | Set<string | number>) => (keys === 'all' ? undefined : [...keys][0])

/**
 * Widget çerçevesinin modeli. `innerWidthPx`: gövdenin iç genişliği (`WidgetBodyProps`); dar
 * widget'ta başlık düğmeleri "…" menüsüne taşınır.
 */
export function useWidgetChrome(id: WidgetId, opts: { innerWidthPx: number }): WidgetChrome {
  const home = useHome()
  const triage = useTriage()
  const fyi = useFyi()
  const { state, actions, editing, stacked, board } = home
  const { innerWidthPx } = opts

  return useMemo((): WidgetChrome => {
    const def = widgetDefs[id]
    const mode = board.modeOf(id)
    const title = titleOf(id, mode)
    const tv = (label: string) => `${label}: ${title}`

    const firstQueueRow = id === 'queue' ? flatRows(queueSections(triage, mode, board.excludeHead))[0] : undefined
    const anyUnread = fyi.some((x) => x.unread)

    /** Komutun çalıştırılabilir olup olmadığı (ör. boş kuyrukta "Sırayla ilerle" yok). */
    const available = (cmd: string) => (cmd === 'sequence' ? !!firstQueueRow : true)

    const run = (cmd: string) => {
      switch (cmd) {
        case 'sequence':
          if (firstQueueRow) home.openPeek(firstQueueRow.id, 'queue', { sequence: true, returnFocusId: firstQueueRow.id })
          break
        case 'shortcuts':
          home.openShortcuts()
          break
        case 'markAllRead':
          markAllRead(fyi.map((x) => x.r.id))
          break
      }
    }

    const commands = (def.commands ?? []).filter((c) => available(c.id))
    const inHeader = commands.filter((c) => c.place === 'header' && !editing && (!c.narrowBelowPx || innerWidthPx >= c.narrowBelowPx))
    const menuActions = commands.filter((c) => !c.toggle && !inHeader.includes(c))
    const menuToggles = commands.filter((c) => c.toggle)
    const toggleOn = (cmd: string) => (cmd === 'hints' ? state.shortcutHints : false)

    const menu: MenuSectionModel[] = []

    if (def.modes.length > 1) {
      menu.push({
        id: 'gorunum',
        label: 'Görünüm',
        selectionMode: 'single',
        selectedKeys: [`mode:${mode}`],
        onSelectionChange: (keys) => {
          const k = String(firstKey(keys) ?? '')
          if (k.startsWith('mode:')) actions.setMode(id, k.slice(5))
        },
        items: def.modes.map((m) => ({ id: `mode:${m.id}`, label: m.label, textValue: tv(m.label) })),
      })
    }

    if (def.listKind === 'rows') {
      const on = !!state.hideWhenEmpty[id]
      menu.push({
        id: 'bosken',
        selectionMode: 'multiple',
        selectedKeys: on ? ['hideWhenEmpty'] : [],
        onSelectionChange: (keys) => {
          const next = keys === 'all' || keys.has('hideWhenEmpty')
          if (next !== on) actions.toggleHideWhenEmpty(id)
        },
        items: [{ id: 'hideWhenEmpty', label: 'Boşken gizle', textValue: tv('Boşken gizle') }],
      })
    }

    if (menuActions.length) {
      menu.push({
        id: 'widget',
        items: menuActions.map((c) => ({
          id: `cmd:${c.id}`,
          label: c.label,
          textValue: tv(c.label),
          icon: c.icon,
          isDisabled: c.id === 'markAllRead' && !anyUnread,
        })),
      })
    }

    if (menuToggles.length) {
      menu.push({
        id: 'widget-secim',
        selectionMode: 'multiple',
        selectedKeys: menuToggles.filter((c) => toggleOn(c.id)).map((c) => `cmd:${c.id}`),
        onSelectionChange: (keys) => {
          for (const c of menuToggles) {
            const next = keys === 'all' || keys.has(`cmd:${c.id}`)
            if (next === toggleOn(c.id)) continue
            if (c.id === 'hints') actions.setShortcutHints(next)
          }
        },
        items: menuToggles.map((c) => ({ id: `cmd:${c.id}`, label: c.label, textValue: tv(c.label), icon: c.icon })),
      })
    }

    if (editing) {
      const item = state.grid.find((g) => g.i === id)
      const items: MenuItemModel[] = moveItems
        .filter((m) => !m.gridOnly || !stacked)
        .map((m) => ({ id: `move:${m.dir}`, label: m.label, textValue: tv(m.label), icon: m.icon, isDisabled: !canMove(state, id, m.dir, stacked) }))
      if (!stacked) {
        const wide = item?.w === COLS
        const label = wide ? 'Önceki genişlik' : 'Tam genişlik'
        items.push({ id: 'wide', label, textValue: tv(label), icon: MoveHorizontal })
      }
      menu.push({ id: 'tasi', label: 'Taşı', items })
    }

    menu.push({
      id: 'genel',
      items: [
        { id: 'hide', label: 'Widget’ı gizle', textValue: tv('Widget’ı gizle'), icon: EyeOff },
        ...(editing ? [] : [{ id: 'edit', label: 'Sayfayı düzenle', textValue: tv('Sayfayı düzenle'), icon: SlidersHorizontal }]),
      ],
    })

    const onAction = (key: string | number) => {
      const k = String(key)
      if (k.startsWith('cmd:')) {
        const cmd = k.slice(4)
        if (!commands.some((c) => c.id === cmd && !c.toggle)) return
        run(cmd)
      } else if (k.startsWith('move:')) {
        const dir = k.slice(5) as MoveDir
        if (actions.move(id, dir, stacked)) {
          home.announce(moveAnnouncement(id, mode, dir))
          afterPaint(() => void focusMenuTrigger(id))
        }
      } else if (k === 'wide') {
        actions.toggleWide(id)
        afterPaint(() => void focusMenuTrigger(id))
      } else if (k === 'hide') actions.hide(id)
      else if (k === 'edit') home.setEditing(true)
    }

    return {
      id,
      title,
      icon: def.icon,
      headingId: `home-${id}-baslik`,
      menuLabel: `${title} seçenekleri`,
      seeAll: editing ? undefined : seeAllHref(id, state.followScope),
      headerActions: inHeader.map((c) => ({ id: c.id, label: c.label, icon: c.icon, onPress: () => run(c.id) })),
      menu,
      onAction,
      modes: def.modes.length > 1 ? def.modes : [],
      mode,
      setMode: (m: string) => actions.setMode(id, m),
    }
  }, [id, home, triage, fyi, state, actions, editing, stacked, board, innerWidthPx])
}
