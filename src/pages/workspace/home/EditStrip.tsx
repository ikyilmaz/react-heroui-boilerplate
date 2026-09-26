import type { Key } from 'react'
import { Button, Dropdown, Surface, ToggleButton, ToggleButtonGroup, cn } from '@heroui/react'
import { Check, ChevronDown, LayoutGrid, Plus, RotateCcw, Rows3 } from 'lucide-react'
import { afterPaint, prefersReducedMotion, widgetEl } from '@/pages/workspace/home/actions'
import { useHome } from '@/pages/workspace/home/HomeContext'
import { findPreset, isPresetId, isWidgetId, presets, titleOf, widgetDefs, widgetIds } from '@/pages/workspace/home/registry'
import { Box, Text } from '@/pages/workspace/ui'
import { edge, tile } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Düzenleme şeridi
 *
 * "Sayfayı düzenle" ile karşılamanın altında belirir; düzenleme kipinin ikinci işareti (ilki
 * widget'ların kesikli çerçevesi). Hazır düzen seçimi, gizli widget'ları geri ekleme, görünüm
 * (ızgara / tek sütun), yoğunluk (Rahat / Sıkı), "Varsayılana dön" ("Geri al"lı bildirimle) ve
 * "Bitti" burada. Esc de düzenleme kipinden çıkar (sayfa düzeyinde, açık katman yokken).
 * ------------------------------------------------------------------------------------------------- */

const focusRing = 'data-[focus-visible]:status-focused'

const firstKey = (keys: 'all' | Set<Key>) => (keys === 'all' ? undefined : [...keys][0])

export function EditStrip({ onDone }: { onDone: () => void }) {
  const home = useHome()
  const { state, actions, stacked, announce } = home
  const preset = state.preset === 'ozel' ? undefined : findPreset(state.preset)
  const hidden = new Set(state.hidden)
  const onPage = widgetIds.filter((id) => !hidden.has(id))

  const addWidget = (key: Key) => {
    const id = String(key)
    if (!isWidgetId(id) || !hidden.has(id)) return
    actions.show(id)
    announce(`“${titleOf(id, home.modeOf(id))}” sayfaya eklendi`)
    // Yeni widget panonun en altına eklenir; görünür olsun diye oraya kaydırılır
    afterPaint(() => widgetEl(id)?.scrollIntoView({ block: 'nearest', behavior: prefersReducedMotion() ? 'auto' : 'smooth' }))
  }

  return (
    <Surface
      variant="secondary"
      role="region"
      aria-labelledby="home-duzen-baslik"
      tabIndex={-1}
      data-edit-strip
      className={cn('home-strip-in flex flex-wrap items-center gap-x-4 gap-y-3 rounded-card p-3 outline-none backdrop-blur-xl', edge)}
    >
      <Box className="min-w-0 flex-1 basis-64 px-2">
        <Text id="home-duzen-baslik" tone="primary" className="block text-[0.875rem] leading-5 font-semibold">
          Sayfayı düzenliyorsunuz
        </Text>
        <Text tone="muted" className="block text-[0.8125rem] leading-5">
          {stacked
            ? 'Tek sütunda widget’ları ⋯ menüsünden taşıyın.'
            : 'Widget’ları başlığından sürükleyin, köşesinden boyutlandırın ya da ⋯ menüsünden taşıyın.'}
        </Text>
        {/* Klavyeyle taşımanın tek açıklaması (widget başına ayrı ipucu yok) */}
        <Text className="sr-only">
          Klavyeyle taşımak için widget başlığındaki seçenekler düğmesini açın ve Taşı bölümünden bir yön seçin. Bitirdiğinizde Bitti düğmesine ya da Esc tuşuna basın.
        </Text>
      </Box>

      <Box className="flex flex-wrap items-center gap-2">
        <Dropdown>
          <Button variant="secondary" className={cn(tile, focusRing)}>
            Düzen: {preset?.name ?? 'Özel düzen'}
            <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
          </Button>
          <Dropdown.Popover placement="bottom start" className="soft-theme min-w-64">
            <Dropdown.Menu
              aria-label="Hazır düzenler"
              selectionMode="single"
              selectedKeys={preset ? [preset.id] : []}
              onAction={(key) => {
                if (isPresetId(key)) actions.applyPreset(key)
              }}
            >
              {presets.map((p) => (
                <Dropdown.Item key={p.id} id={p.id} textValue={p.name}>
                  <Box className="min-w-0 flex-1">
                    <Text slot="label" tone="primary" className="block text-[0.875rem] leading-5 font-medium">
                      {p.name}
                    </Text>
                    <Text slot="description" tone="muted" className="block text-[0.75rem] leading-4">
                      {p.hint}
                    </Text>
                  </Box>
                  {preset?.id === p.id && <Check size={16} strokeWidth={1.5} className="shrink-0" aria-hidden />}
                </Dropdown.Item>
              ))}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>

        <Dropdown>
          <Button variant="secondary" className={cn(tile, focusRing)}>
            <Plus size={16} strokeWidth={1.5} aria-hidden />
            Widget ekle
          </Button>
          <Dropdown.Popover placement="bottom start" className="soft-theme min-w-64">
            <Dropdown.Menu aria-label="Widget ekle" disabledKeys={onPage} onAction={addWidget}>
              {widgetIds.map((id) => {
                const Icon = widgetDefs[id].icon
                const title = titleOf(id, home.modeOf(id))
                return (
                  <Dropdown.Item key={id} id={id} textValue={title}>
                    <Icon size={16} strokeWidth={1.5} className="shrink-0 text-foreground/55" aria-hidden />
                    <Text slot="label" tone="primary" className="min-w-0 flex-1 truncate text-[0.875rem]">
                      {title}
                    </Text>
                    {!hidden.has(id) && (
                      <Text slot="description" tone="muted" className="shrink-0 text-[0.75rem]">
                        Sayfada
                      </Text>
                    )}
                  </Dropdown.Item>
                )
              })}
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>

        <ToggleButtonGroup
          aria-label="Görünüm"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[state.view]}
          onSelectionChange={(keys) => {
            const k = firstKey(keys)
            if (k === 'grid' || k === 'stack') actions.setView(k)
          }}
        >
          <ToggleButton id="grid" className="text-[0.8125rem]">
            <LayoutGrid size={16} strokeWidth={1.5} aria-hidden />
            Izgara
          </ToggleButton>
          <ToggleButton id="stack" className="text-[0.8125rem]">
            <Rows3 size={16} strokeWidth={1.5} aria-hidden />
            Tek sütun
          </ToggleButton>
        </ToggleButtonGroup>

        <ToggleButtonGroup
          aria-label="Yoğunluk"
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[state.density]}
          onSelectionChange={(keys) => {
            const k = firstKey(keys)
            if (k === 'comfortable' || k === 'compact') actions.setDensity(k)
          }}
        >
          <ToggleButton id="comfortable" className="text-[0.8125rem]">
            Rahat
          </ToggleButton>
          <ToggleButton id="compact" className="text-[0.8125rem]">
            Sıkı
          </ToggleButton>
        </ToggleButtonGroup>

        <Button variant="ghost" onPress={actions.resetToBase}>
          <RotateCcw size={16} strokeWidth={1.5} aria-hidden />
          Varsayılana dön
        </Button>

        <Button variant="primary" onPress={onDone}>
          <Check size={16} strokeWidth={1.5} aria-hidden />
          Bitti
        </Button>
      </Box>
    </Surface>
  )
}
