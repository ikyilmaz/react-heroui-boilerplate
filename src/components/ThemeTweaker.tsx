import { useState, type ReactNode } from 'react'
import { Moon, Palette, RotateCcw, Sun, SunMoon } from 'lucide-react'
import {
  Button,
  ColorArea,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  Drawer,
  Label,
  ListBox,
  Select,
  Separator,
  Slider,
  Surface,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useTheme,
} from '@heroui/react'

import { FieldSelectIndicator } from '@/components/FieldSelectIndicator'
import {
  accentSwatches,
  backgrounds,
  applyPreset,
  fonts,
  layouts,
  presets,
  resetTweaks,
  setTweak,
  useThemeTweaks,
  type LayoutId,
} from '@/theme/tweaks'

/** Typography varsayılan olarak <p> basar; satır içi metinlerde <span> gerekir. */
const inlineText = { elementType: 'span', slot: null } as unknown as Record<string, never>

/** HeroUI ListBox seçili duruma arka plan vermez; burada veriyoruz. */
const selectedItemClass =
  'data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-soft-foreground'

/* -------------------------------------------------------------------------------------------------
 * ThemeTweaker
 *
 * HeroUI teması CSS değişkenleriyle sürüldüğü için panel yalnızca `:root` üzerindeki birkaç
 * değişkeni yazar (bkz. `@/theme/tweaks`). Değişiklikler anında ve tüm bileşenlere yayılır.
 * ------------------------------------------------------------------------------------------------- */

/** `className` tetikleyici düğmeye uygulanır (kabuklar kendi görünümünü verebilsin diye). */
export function ThemeTweaker({ className }: { className?: string } = {}) {
  const t = useThemeTweaks()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <Drawer.Root isOpen={open} onOpenChange={setOpen}>
      <Drawer.Trigger aria-label="Tema ayarları" className={className ?? 'inline-flex'}>
        <Palette size={18} aria-hidden />
      </Drawer.Trigger>

      {/* Genişlik Dialog'a verilir: Content, ekranı kaplayan hizalama katmanıdır */}
      <Drawer.Content placement="right">
        <Drawer.Dialog className="w-[22rem] max-w-[90vw]">
          <Drawer.Header>
            <Drawer.Heading>Tema</Drawer.Heading>
            <Drawer.CloseTrigger />
          </Drawer.Header>

          <Drawer.Body className="flex flex-col gap-5 overflow-y-auto">
            <Row label="Hazır ayar">
              <ListBox
                aria-label="Hazır ayar"
                selectionMode="single"
                selectedKeys={[t.preset]}
                onSelectionChange={(keys) => {
                  const k = [...keys][0]
                  if (k) applyPreset(String(k))
                }}
              >
                {presets.map((p) => (
                  <ListBox.Item
                    key={p.id}
                    id={p.id}
                    textValue={p.name}
                    className={selectedItemClass}
                  >
                    <ColorSwatch color={p.accent} aria-hidden className="size-4 shrink-0" />
                    <Typography type="body-sm" className="flex-1" {...inlineText}>
                      {p.name}
                    </Typography>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Row>

            <Separator />

            <Row label="Yerleşim · İş akışları">
              <ListBox
                aria-label="Yerleşim"
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={[t.layout]}
                onSelectionChange={(keys) => {
                  const k = [...keys][0]
                  if (k) setTweak('layout', k as LayoutId)
                }}
              >
                {layouts.map((l) => (
                  <ListBox.Item key={l.id} id={l.id} textValue={l.name} className={selectedItemClass}>
                    <Surface variant="transparent" className="flex min-w-0 flex-1 flex-col bg-transparent text-inherit">
                      <Typography type="body-sm" weight="medium" {...inlineText}>
                        {l.name}
                      </Typography>
                      <Typography type="body-xs" color="muted" {...inlineText}>
                        {l.idea}
                      </Typography>
                    </Surface>
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Row>

            <Separator />

            <Row label="Görünüm">
              <ToggleButtonGroup
                aria-label="Görünüm"
                size="sm"
                selectionMode="single"
                disallowEmptySelection
                selectedKeys={[theme ?? 'system']}
                onSelectionChange={(keys) => {
                  const k = [...keys][0]
                  if (k) setTheme(String(k) as 'light' | 'dark' | 'system')
                }}
              >
                <ToggleButton id="light" aria-label="Açık">
                  <Sun size={16} aria-hidden />
                </ToggleButton>
                <ToggleButton id="dark" aria-label="Koyu">
                  <Moon size={16} aria-hidden />
                </ToggleButton>
                <ToggleButton id="system" aria-label="Sistem">
                  <SunMoon size={16} aria-hidden />
                </ToggleButton>
              </ToggleButtonGroup>
            </Row>

            <Row label="Zemin · İş akışları">
              <ToggleButtonGroup
                aria-label="Zemin gradyanı"
                selectionMode="single"
                disallowEmptySelection
                isDetached
                selectedKeys={[t.background]}
                onSelectionChange={(keys) => {
                  const k = [...keys][0]
                  if (k) setTweak('background', String(k))
                }}
                className="grid grid-cols-5 gap-2"
              >
                {backgrounds.map((b) => (
                  <ToggleButton
                    key={b.id}
                    id={b.id}
                    aria-label={b.name}
                    className="h-auto w-full min-w-0 flex-col gap-1 rounded-xl bg-transparent p-1 data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-soft-foreground"
                  >
                    {/* Önizleme etkin moda göre: koyu moddaysa koyu hâli */}
                    <Surface
                      variant="transparent"
                      className="h-10 w-full rounded-lg ring-1 ring-border"
                      style={{ backgroundImage: resolvedTheme === 'dark' ? b.dark : b.light }}
                    >
                      {null}
                    </Surface>
                    <Typography type="body-xs" className="w-full truncate text-center text-[0.6875rem]" {...inlineText}>
                      {b.name}
                    </Typography>
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Row>

            <Row label="Vurgu">
              <Surface variant="transparent" className="flex flex-wrap items-center gap-1.5">
                {accentSwatches.map((c) => (
                  <Button
                    key={c}
                    size="sm"
                    variant="ghost"
                    isIconOnly
                    aria-label={`Vurgu rengi ${c}`}
                    onPress={() => setTweak('accent', c)}
                  >
                    <ColorSwatch color={c} aria-hidden className="size-5" />
                  </Button>
                ))}
                <ColorField label="Özel" value={t.accent} onChange={(v) => setTweak('accent', v)} />
              </Surface>
            </Row>

            <Row label="Durum renkleri">
              <Surface variant="transparent" className="flex items-center gap-2">
                <ColorField
                  label="Başarı"
                  value={t.success}
                  onChange={(v) => setTweak('success', v)}
                />
                <ColorField
                  label="Uyarı"
                  value={t.warning}
                  onChange={(v) => setTweak('warning', v)}
                />
                <ColorField label="Hata" value={t.danger} onChange={(v) => setTweak('danger', v)} />
              </Surface>
            </Row>

            <Separator />

            <NumberRow
              label="Yuvarlaklık"
              value={t.radius}
              min={0}
              max={1.5}
              step={0.05}
              format={(v) => `${v.toFixed(2)}rem`}
              onChange={(v) => setTweak('radius', v)}
            />
            <NumberRow
              label="Kenarlık"
              value={t.borderWidth}
              min={0}
              max={3}
              step={1}
              format={(v) => `${v}px`}
              onChange={(v) => setTweak('borderWidth', v)}
            />
            <NumberRow
              label="Alan kenarlığı"
              value={t.fieldBorderWidth}
              min={0}
              max={2}
              step={1}
              format={(v) => `${v}px`}
              onChange={(v) => setTweak('fieldBorderWidth', v)}
            />
            <NumberRow
              label="Yoğunluk"
              value={t.spacing}
              min={0.18}
              max={0.34}
              step={0.01}
              format={(v) => `${v.toFixed(2)}rem`}
              onChange={(v) => setTweak('spacing', v)}
            />
            <NumberRow
              label="Solgunluk"
              value={t.disabledOpacity}
              min={0.2}
              max={1}
              step={0.05}
              format={(v) => v.toFixed(2)}
              onChange={(v) => setTweak('disabledOpacity', v)}
            />

            <Separator />

            <Row label="Yazı tipi">
              <Select
                aria-label="Yazı tipi"
                value={t.font}
                onChange={(v) => v && setTweak('font', String(v))}
                fullWidth
              >
                <Select.Trigger className="pe-8">
                  <Select.Value />
                  <FieldSelectIndicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox aria-label="Yazı tipleri">
                    {fonts.map((f) => (
                      <ListBox.Item key={f.id} id={f.id} textValue={f.name}>
                        <Typography style={{ fontFamily: f.stack }} {...inlineText}>
                          {f.name}
                        </Typography>
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            </Row>

            <NumberRow
              label="Yazı boyutu"
              value={t.fontSize}
              min={12}
              max={20}
              step={1}
              format={(v) => `${v}px`}
              onChange={(v) => setTweak('fontSize', v)}
            />
          </Drawer.Body>

          <Drawer.Footer>
            <Button variant="ghost" size="sm" onPress={resetTweaks}>
              <RotateCcw size={16} aria-hidden />
              Sıfırla
            </Button>
          </Drawer.Footer>
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Root>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Parçalar
 * ------------------------------------------------------------------------------------------------- */

/** Etiket üstte, denetim altta; her ayar kendi satırında. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Surface variant="transparent" role="group" aria-label={label} className="flex flex-col gap-2">
      <Typography type="body-xs" weight="medium" color="muted" className="tracking-wide uppercase">
        {label}
      </Typography>
      {children}
    </Surface>
  )
}

/** Etiket + değer + kaydırıcı. */
function NumberRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (value: number) => string
  onChange: (value: number) => void
}) {
  return (
    <Slider
      aria-label={label}
      value={value}
      minValue={min}
      maxValue={max}
      step={step}
      onChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      className="flex flex-col gap-2"
    >
      <Surface variant="transparent" className="flex items-baseline justify-between">
        <Label>
          <Typography
            type="body-xs"
            weight="medium"
            color="muted"
            className="tracking-wide uppercase"
            {...inlineText}
          >
            {label}
          </Typography>
        </Label>
        <Slider.Output>
          <Typography type="body-xs" color="muted" className="tabular-nums" {...inlineText}>
            {format(value)}
          </Typography>
        </Slider.Output>
      </Surface>
      <Slider.Track>
        <Slider.Fill />
        <Slider.Thumb />
      </Slider.Track>
    </Slider>
  )
}

/** Tek renk için swatch tetikleyicili seçici. */
function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <ColorPicker value={value} onChange={(c) => onChange(c.toString('hex'))}>
      <ColorPicker.Trigger aria-label={label}>
        <ColorSwatch color={value} aria-hidden className="size-5" />
      </ColorPicker.Trigger>
      <ColorPicker.Popover>
        <Surface variant="transparent" className="flex flex-col gap-3 p-1">
          <ColorArea colorSpace="hsb" xChannel="saturation" yChannel="brightness">
            <ColorArea.Thumb />
          </ColorArea>
          <ColorSlider colorSpace="hsb" channel="hue">
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
        </Surface>
      </ColorPicker.Popover>
    </ColorPicker>
  )
}
