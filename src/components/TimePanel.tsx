import { useEffect, useMemo, useRef } from 'react'
import { Time } from '@internationalized/date'
import type { TimeValue } from 'react-aria-components'
import { ListBox, Separator, Surface, Typography, cn } from '@heroui/react'

/* -------------------------------------------------------------------------------------------------
 * TimePanel — antd tarzı kaydırılabilir saat sütunları
 *
 * Durumdan bağımsızdır: değeri prop'tan alır. Hem `DateTimePicker`'ın takvim popover'ında hem de
 * `TimePicker`'da aynı panel kullanılır.
 * ------------------------------------------------------------------------------------------------- */

export interface TimeOptions {
  /** Saniye sütununu göster. @default false */
  showSecond?: boolean
  /** Saat adımı. @default 1 */
  hourStep?: number
  /** Dakika adımı. @default 1 */
  minuteStep?: number
  /** Saniye adımı. @default 1 */
  secondStep?: number
}

export interface TimePanelTexts {
  hour: string
  minute: string
  second: string
}

function range(max: number, step: number) {
  const out: number[] = []
  for (let i = 0; i < max; i += Math.max(1, step)) out.push(i)
  return out
}

export function TimePanel({
  value,
  onChange,
  options,
  texts,
  fullWidth = false,
}: {
  value: TimeValue | null
  onChange: (value: Time) => void
  options: TimeOptions
  texts: TimePanelTexts
  /** Sütunlar kabın genişliğini paylaşsın (tek başına açılan panelde sağda boşluk kalmasın). */
  fullWidth?: boolean
}) {
  const { showSecond = false, hourStep = 1, minuteStep = 1, secondStep = 1 } = options

  const hours = useMemo(() => range(24, hourStep), [hourStep])
  const minutes = useMemo(() => range(60, minuteStep), [minuteStep])
  const seconds = useMemo(() => range(60, secondStep), [secondStep])

  const h = value?.hour ?? null
  const m = value?.minute ?? null
  const s = value?.second ?? null

  const set = (next: { hour?: number; minute?: number; second?: number }) => {
    onChange(
      new Time(
        next.hour ?? h ?? 0,
        next.minute ?? m ?? 0,
        showSecond ? (next.second ?? s ?? 0) : 0,
      ),
    )
  }

  return (
    <Surface variant="transparent" className="flex h-64">
      <TimeColumn
        label={texts.hour}
        values={hours}
        selected={h}
        onSelect={(v) => set({ hour: v })}
        fullWidth={fullWidth}
      />
      <Separator orientation="vertical" />
      <TimeColumn
        label={texts.minute}
        values={minutes}
        selected={m}
        onSelect={(v) => set({ minute: v })}
        fullWidth={fullWidth}
      />
      {showSecond && (
        <>
          <Separator orientation="vertical" />
          <TimeColumn
            label={texts.second}
            values={seconds}
            selected={s}
            onSelect={(v) => set({ second: v })}
            fullWidth={fullWidth}
          />
        </>
      )}
    </Surface>
  )
}

/** HeroUI ListBox seçili durum için arka plan tanımlamaz; burada veriyoruz. */
const selectedItemClass =
  'justify-center tabular-nums data-[selected=true]:bg-accent-soft data-[selected=true]:text-accent-soft-foreground data-[selected=true]:font-medium'

function TimeColumn({
  label,
  values,
  selected,
  onSelect,
  fullWidth,
}: {
  label: string
  values: number[]
  selected: number | null
  onSelect: (value: number) => void
  fullWidth?: boolean
}) {
  const listRef = useRef<HTMLDivElement>(null)

  // Seçili değer değişince onu sütunun üstüne kaydır (antd davranışı).
  // Ölçümü rect farkıyla yapıyoruz: RAC koleksiyonu bir kare sonra basıyor ve
  // offsetParent listenin kendisi olmayabiliyor.
  useEffect(() => {
    if (selected === null) return
    const id = requestAnimationFrame(() => {
      const list = listRef.current
      const el = list?.querySelector<HTMLElement>(`[data-key="${selected}"]`)
      if (!list || !el) return
      const top = el.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop
      list.scrollTo({ top, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(id)
  }, [selected])

  return (
    <Surface
      variant="transparent"
      className={cn('flex flex-col', fullWidth ? 'min-w-14 flex-1' : 'w-16')}
    >
      <Typography type="body-xs" weight="medium" color="muted" align="center" className="py-2">
        {label}
      </Typography>
      <Separator />
      <ListBox
        ref={listRef}
        aria-label={label}
        selectionMode="single"
        // Escape varsayılan olarak seçimi temizler; biz popover'ın kapanmasını istiyoruz
        escapeKeyBehavior="none"
        selectedKeys={selected === null ? [] : [String(selected)]}
        onSelectionChange={(keys) => {
          const k = [...keys][0]
          if (k !== undefined) onSelect(Number(k))
        }}
        // scrollbar-none: çubuk hem görünmez hem de yer ayırmaz (global scrollbar-gutter'ı da kapatır)
        // Alt boşluk: son değerler de sütunun tepesine kaydırılabilsin
        className="scrollbar-none flex-1 overflow-y-auto overscroll-contain p-1 pb-52"
      >
        {values.map((v) => (
          <ListBox.Item key={v} id={String(v)} textValue={String(v)} className={selectedItemClass}>
            {String(v).padStart(2, '0')}
          </ListBox.Item>
        ))}
      </ListBox>
    </Surface>
  )
}
