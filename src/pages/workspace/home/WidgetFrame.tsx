import { Button, Card, Dropdown, Header, Link, Separator, ToggleButton, ToggleButtonGroup, Typography, cn } from '@heroui/react'
import { ArrowUpRight, Ellipsis, GripVertical } from 'lucide-react'
import { useWidgetChrome, type MenuSectionModel, type WidgetChrome } from '@/pages/workspace/home/commands'
import type { WidgetFrameProps } from '@/pages/workspace/home/types'
import { Box, Text } from '@/pages/workspace/ui'
import { card } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Widget çerçevesi
 *
 * Her widget bir `role="region"` kart; adı başlıktaki h2. Başlık (`.widget-handle`) soldan sağa:
 * düzenleme kipinde tutamak, widget ikonu, başlık, widget'ın başlık düğmeleri (ör. "Sırayla
 * ilerle"), "Tümünü gör" ve "…" menüsü. Başlıkta ne görüneceğini ve menünün içeriğini
 * `commands.ts › useWidgetChrome` belirler; burada yalnızca çizilir.
 *
 * Düzenleme kipinde çerçeve kesikli çizgiyle ayrılır, başlıkta kip seçici (`ToggleButtonGroup`)
 * belirir, gövde `inert` olur ve soluklaşır: içerikteki hiçbir düğmeye (ör. "Onayla") basılamaz.
 * Başlığın yüksekliği sabit px'tir (`hc.header`); gövde kaç satır çizeceğini buna göre hesaplar.
 * ------------------------------------------------------------------------------------------------- */

/** Başlıkta kip seçiciden önce kalması gereken yer (px): tutamak + ikon + boşluklar + "…" + başlık. */
const HEADER_RESERVE = 36 + 36 + 16 + 112

/** Bu dış genişliğin altında "Tümünü gör" yalnızca ok ikonu olur (ad `aria-label`'da kalır). */
const SEE_ALL_ICON_BELOW = 400

/** Kip seçicinin yaklaşık genişliği (px); dar widget'ta seçici "…" menüsündeki "Görünüm"e bırakılır. */
function modesWidth(chrome: WidgetChrome) {
  return chrome.modes.reduce((sum, m) => sum + m.label.length * 7 + 26, 6)
}

function MenuSection({ section }: { section: MenuSectionModel }) {
  const selectable = !!section.selectionMode
  return (
    <Dropdown.Section
      id={section.id}
      selectionMode={section.selectionMode}
      selectedKeys={section.selectedKeys}
      onSelectionChange={section.onSelectionChange}
    >
      {section.label && <Header>{section.label}</Header>}
      {section.items.map((item) => {
        const Icon = item.icon
        return (
          <Dropdown.Item key={item.id} id={item.id} textValue={item.textValue} isDisabled={item.isDisabled}>
            {selectable && <Dropdown.ItemIndicator type={section.selectionMode === 'single' ? 'dot' : 'checkmark'} />}
            {Icon && <Icon size={16} strokeWidth={1.5} className="shrink-0 text-foreground/55" aria-hidden />}
            <Text slot="label" tone="primary" className="text-[0.875rem]">
              {item.label}
            </Text>
          </Dropdown.Item>
        )
      })}
    </Dropdown.Section>
  )
}

export function WidgetFrame({ id, body, children }: WidgetFrameProps) {
  const chrome = useWidgetChrome(id, { innerWidthPx: body.innerWidthPx })
  const { editing, stacked, density, hc } = body
  const compact = density === 'compact'
  const Icon = chrome.icon
  const showModes = editing && chrome.modes.length > 0 && body.widthPx - HEADER_RESERVE >= modesWidth(chrome)
  const draggable = editing && !stacked
  const seeAllIconOnly = body.widthPx < SEE_ALL_ICON_BELOW

  return (
    <Card
      data-widget={id}
      role="region"
      aria-labelledby={chrome.headingId}
      className={cn(
        card,
        'gap-0 bg-(--surface) p-0 backdrop-blur-xl transition-[outline-color] duration-150 ease-out motion-reduce:transition-none',
        !stacked && 'h-full',
        editing && 'outline-dashed outline-offset-2 outline-(length:--border-width) outline-foreground/25',
      )}
    >
      <Card.Header
        className={cn(
          'widget-handle shrink-0 flex-row items-center gap-2',
          hc.header,
          compact ? 'px-4 pt-3' : 'px-5 pt-4',
          draggable && 'cursor-grab',
        )}
      >
        {draggable && <GripVertical size={18} strokeWidth={1.5} className="-ml-1 shrink-0 text-foreground/30" aria-hidden />}
        <Icon size={18} strokeWidth={1.5} className="shrink-0 text-foreground/55" aria-hidden />
        <Typography.Heading
          level={2}
          id={chrome.headingId}
          className="min-w-0 flex-1 truncate text-[1rem] leading-6 font-semibold tracking-tight text-foreground"
        >
          {chrome.title}
        </Typography.Heading>

        {/* Sağdaki denetimler sürüklemeyi başlatmaz (`.no-drag`) */}
        <Box className="no-drag flex shrink-0 items-center gap-1">
          {showModes && (
            <ToggleButtonGroup
              aria-label={`${chrome.title} görünümü`}
              size="sm"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[chrome.mode]}
              onSelectionChange={(keys) => {
                const [k] = [...keys]
                if (k !== undefined) chrome.setMode(String(k))
              }}
            >
              {chrome.modes.map((m) => (
                <ToggleButton key={m.id} id={m.id} className="px-3 text-[0.8125rem]">
                  {m.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          )}

          {chrome.headerActions.map((a) => (
            <Button key={a.id} size="sm" variant="ghost" onPress={a.onPress} className="text-[0.8125rem]">
              <a.icon size={16} strokeWidth={1.5} aria-hidden />
              {a.label}
            </Button>
          ))}

          {chrome.seeAll && (
            <Link
              href={chrome.seeAll}
              aria-label={`Tümünü gör: ${chrome.title}`}
              className={cn(
                'h-9 justify-center gap-1 rounded-pill text-[0.8125rem] font-medium text-foreground/65 transition-colors duration-150 ease-out hover:bg-(--default) hover:text-foreground hover:no-underline',
                seeAllIconOnly ? 'w-9' : 'px-3',
              )}
            >
              {!seeAllIconOnly && 'Tümünü gör'}
              <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden />
            </Link>
          )}

          <Dropdown>
            <Button
              isIconOnly
              size="sm"
              variant="ghost"
              aria-label={chrome.menuLabel}
              data-menu-trigger={id}
              className="size-9 text-foreground/55"
            >
              <Ellipsis size={18} strokeWidth={1.5} />
            </Button>
            <Dropdown.Popover placement="bottom end" className="soft-theme min-w-56">
              <Dropdown.Menu aria-label={chrome.menuLabel} onAction={chrome.onAction}>
                {chrome.menu.flatMap((section, i) => [
                  ...(i > 0 ? [<Separator key={`ayrac-${section.id}`} />] : []),
                  <MenuSection key={section.id} section={section} />,
                ])}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Box>
      </Card.Header>

      <Card.Content
        inert={editing}
        className={cn(
          'min-h-0 flex-1 gap-0 overflow-hidden transition-opacity duration-150 ease-out motion-reduce:transition-none',
          compact ? 'px-4' : 'px-5',
          hc.padB,
          editing && 'pointer-events-none opacity-60',
        )}
      >
        {children}
      </Card.Content>
    </Card>
  )
}
