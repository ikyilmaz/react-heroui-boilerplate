import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  Moon,
  Palette,
  SendHorizontal,
  Sparkles,
  Sun,
  Wand2,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import { Button, Card, Flex, Input, Spin, Typography } from 'antd'
import { useBoxCounts } from '@/synergy/shared/decisions'
import { readJson, writeJson } from '@/synergy/shared/grid'
import { setColorMode, useIsDark, useSettingsControl } from '@/synergy/shared/themeSettings'
import { tone } from '@/synergy/shared/tokens'
import { CURRENT_USER, mainBoxes, type BoxId } from '@/synergy/shared/workflowData'
import { CARD, IC, Scroll, Tip, cn } from '@/synergy/ant/ui'
import { boxLink } from '@/synergy/paths'
import type { WidgetSize } from '@/synergy/dashboard/model'

/*
 * Başlangıç panosunun yeni widget'ları: saat, hava durumu, asistan, takvim, denetimler, notlar.
 * Her biri bulunduğu boyuta (`size.id`) göre farklı bir görünüm çizer ve hücresini doldurur.
 */

/** Satır içi metin (antd `Typography.Text`); ton `tone`'dan, varsayılan ikincil. */
function Text({
  tone: t = 'secondary',
  className,
  ...props
}: Omit<ComponentProps<typeof Typography.Text>, 'type'> & { tone?: keyof typeof tone }) {
  return <Typography.Text className={cn(tone[t], className)} {...props} />
}

/**
 * Widget kartı: hücreyi doldurur; içerik taşarsa içeride kayar. `className` kartın gövdesine
 * (yerleşim, iç boşluk, zemin) gider; gövde dikey flex, kartı doldurur.
 */
export function WidgetCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card
      className={cn(CARD, 'flex h-full min-h-0 flex-col overflow-hidden')}
      classNames={{ body: cn('flex min-h-0 flex-1 flex-col gap-3 p-4', className) }}
    >
      {children}
    </Card>
  )
}

function WidgetTitle({
  icon: Icon,
  children,
  extra,
}: {
  icon: LucideIcon
  children: ReactNode
  extra?: ReactNode
}) {
  return (
    <Flex className="flex min-h-7 shrink-0 items-center gap-2">
      <Icon {...IC} size={16} className="shrink-0 text-accent-soft-foreground" />
      <Text className="truncate min-w-0 flex-1 text-sm font-semibold text-current">{children}</Text>
      {extra}
    </Flex>
  )
}

/** Saniyede (ya da verilen aralıkta) bir yenilenen şimdiki zaman. */
function useTick(ms = 1000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), ms)
    return () => window.clearInterval(id)
  }, [ms])
  return now
}

/* --- Saat -------------------------------------------------------------------------------------- */

const WORLD = [
  { city: 'Londra', zone: 'Europe/London' },
  { city: 'New York', zone: 'America/New_York' },
  { city: 'Dubai', zone: 'Asia/Dubai' },
  { city: 'Tokyo', zone: 'Asia/Tokyo' },
]

export function ClockWidget({ size }: { size: WidgetSize }) {
  const now = useTick()
  const hm = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  const sec = String(now.getSeconds()).padStart(2, '0')
  const day = now.toLocaleDateString('tr-TR', { weekday: 'long' })
  const date = now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
  const small = size.id === 's'
  // Şerit (tek satır): saat solda, gün ve tarih sağda
  if (size.id === 'xs')
    return (
      <WidgetCard className="flex-row items-center justify-between gap-3 px-4 py-2">
        <Text className="font-display text-3xl leading-none font-bold text-current tabular-nums">
          {hm}
        </Text>
        <Flex className="block min-w-0 text-end">
          <Text className="truncate block text-sm text-current capitalize">{day}</Text>
          <Text className="truncate block text-xs text-muted">
            {now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
          </Text>
        </Flex>
      </WidgetCard>
    )
  return (
    <WidgetCard className={size.id === 'l' ? 'justify-between' : 'justify-center'}>
      <Flex className="flex flex-col gap-1">
        <Text className="flex items-baseline gap-1 font-display leading-none font-bold text-current tabular-nums">
          <Text className={cn('text-current', small ? 'text-4xl' : 'text-5xl')}>{hm}</Text>
          {!small && <Text className="text-base text-muted">{sec}</Text>}
        </Text>
        <Text className="text-sm text-muted capitalize">{small ? day : `${day}, ${date}`}</Text>
      </Flex>
      {size.id === 'l' && (
        <Flex className="flex flex-col gap-1.5 border-t border-border pt-3">
          {WORLD.map((w) => (
            <Flex key={w.zone} className="flex items-center justify-between text-sm">
              <Text tone="secondary">{w.city}</Text>
              <Text className="text-current tabular-nums">
                {now.toLocaleTimeString('tr-TR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: w.zone,
                })}
              </Text>
            </Flex>
          ))}
        </Flex>
      )}
    </WidgetCard>
  )
}

/* --- Hava durumu ------------------------------------------------------------------------------- */

const CITY = { name: 'İstanbul' }

interface Weather {
  temp: number
  code: number
  wind: number
  humidity: number
  days: { date: string; code: number; max: number; min: number }[]
}

/** WMO hava kodu → ad ve ikon. */
function weatherOf(code: number): { label: string; icon: LucideIcon } {
  if (code === 0) return { label: 'Açık', icon: Sun }
  if (code <= 2) return { label: 'Parçalı bulutlu', icon: CloudSun }
  if (code === 3) return { label: 'Bulutlu', icon: Cloud }
  if (code <= 48) return { label: 'Sisli', icon: CloudFog }
  if (code <= 57) return { label: 'Çisenti', icon: CloudDrizzle }
  if (code <= 67 || (code >= 80 && code <= 82)) return { label: 'Yağmurlu', icon: CloudRain }
  if (code <= 77 || code === 85 || code === 86) return { label: 'Karlı', icon: CloudSnow }
  return { label: 'Fırtınalı', icon: CloudLightning }
}

/** Örnek hava verisi (gerçek istek yok): günler bugünden başlar. */
function sampleWeather(): Weather {
  const today = new Date()
  const iso = (d: number) => {
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate() + d)
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
  }
  const days: [number, number, number][] = [
    [2, 21, 15],
    [61, 19, 14],
    [3, 18, 13],
    [0, 22, 14],
    [1, 23, 15],
  ]
  return {
    temp: 20,
    code: 2,
    wind: 14,
    humidity: 62,
    days: days.map(([code, max, min], i) => ({ date: iso(i), code, max, min })),
  }
}

const dayName = (iso: string, i: number) =>
  i === 0 ? 'Bugün' : new Date(`${iso}T12:00`).toLocaleDateString('tr-TR', { weekday: 'short' })

export function WeatherWidget({ size }: { size: WidgetSize }) {
  const data = sampleWeather()
  const now = weatherOf(data.code)
  // Şerit (tek satır): ikon ve sıcaklık solda, durum ve şehir sağda
  if (size.id === 'xs')
    return (
      <WidgetCard className="flex-row items-center justify-between gap-3 px-4 py-2">
        <Flex className="flex items-center gap-2">
          <now.icon {...IC} size={24} className="shrink-0 text-accent" />
          <Text className="font-display text-3xl leading-none font-bold text-current tabular-nums">
            {data.temp}°
          </Text>
        </Flex>
        <Flex className="block min-w-0 text-end">
          <Text className="truncate block text-sm text-current">{now.label}</Text>
          <Text className="truncate block text-xs text-muted">{CITY.name}</Text>
        </Flex>
      </WidgetCard>
    )
  const days = data.days.slice(0, size.id === 'l' ? 5 : 3)
  const current = (
    <Flex className="flex min-w-0 flex-col justify-between gap-1">
      <Text tone="muted" className="truncate text-xs">
        {CITY.name}
      </Text>
      <Flex className="flex items-center gap-2">
        <now.icon {...IC} size={size.id === 's' ? 26 : 32} className="shrink-0 text-accent" />
        <Text className="font-display text-4xl leading-none font-bold text-current tabular-nums">
          {data.temp}°
        </Text>
      </Flex>
      <Text tone="secondary" className="truncate text-sm">
        {now.label}
      </Text>
    </Flex>
  )
  if (size.id === 's') return <WidgetCard className="justify-center">{current}</WidgetCard>
  const forecast = (
    <Flex
      className={cn(
        'flex min-w-0',
        size.id === 'l' ? 'flex-col gap-1' : 'flex-1 justify-around gap-2',
      )}
    >
      {days.map((d, i) => {
        const w = weatherOf(d.code)
        return size.id === 'l' ? (
          <Flex key={d.date} className="flex items-center gap-3 text-sm">
            <Text tone="secondary" className="w-12 capitalize">
              {dayName(d.date, i)}
            </Text>
            <w.icon {...IC} size={16} className="text-muted" />
            <Text tone="muted" className="min-w-0 flex-1 truncate text-xs">
              {w.label}
            </Text>
            <Text className="text-current tabular-nums">
              {d.max}° <Text tone="muted">{d.min}°</Text>
            </Text>
          </Flex>
        ) : (
          <Flex key={d.date} className="flex flex-col items-center gap-1 text-xs">
            <Text tone="muted" className="capitalize">
              {dayName(d.date, i)}
            </Text>
            <w.icon {...IC} size={18} className="text-foreground/70" />
            <Text className="text-current tabular-nums">{d.max}°</Text>
          </Flex>
        )
      })}
    </Flex>
  )
  return size.id === 'l' ? (
    <WidgetCard>
      <Flex className="flex items-start justify-between gap-3">
        {current}
        <Flex className="flex flex-col gap-1 text-xs text-muted">
          <Flex className="flex items-center gap-1.5">
            <Droplets {...IC} size={14} />
            <Text className="text-current">%{data.humidity}</Text>
          </Flex>
          <Flex className="flex items-center gap-1.5">
            <Wind {...IC} size={14} />
            <Text className="text-current">{data.wind} km/s</Text>
          </Flex>
        </Flex>
      </Flex>
      <Flex className="block border-t border-border pt-3">{forecast}</Flex>
    </WidgetCard>
  ) : (
    <WidgetCard className="flex-row items-center gap-4">
      {current}
      {forecast}
    </WidgetCard>
  )
}

/* --- Asistan ----------------------------------------------------------------------------------- */

interface Message {
  id: number
  from: 'user' | 'bot'
  text: string
  action?: { label: string; href: string }
}

const SUGGESTIONS = ['Kaç bekleyen onayım var?', 'Taslaklarım', 'Temayı nasıl değiştiririm?']

/**
 * Yanıtlar uygulamanın kendi verisinden, anahtar kelimelerle (yapay zekâ bağlantısı yok; tanıtım
 * amaçlı). Kutularla ilgili sorularda sayı ve kutuya giden bir düğme döner.
 */
function answer(q: string, counts: ReadonlyMap<BoxId, number>): Omit<Message, 'id' | 'from'> {
  const t = q.toLocaleLowerCase('tr')
  const box = mainBoxes.find((b) =>
    [b.label, b.title, ...(b.id === 'bekleyen' ? ['onay', 'bekleyen'] : [])].some((k) =>
      t.includes(k.toLocaleLowerCase('tr').split(' ')[0]!),
    ),
  )
  if (box) {
    const n = counts.get(box.id) ?? 0
    return {
      text: `${box.label} kutunuzda ${n} kayıt var.`,
      action: { label: `${box.label}'a git`, href: boxLink(box.id) },
    }
  }
  if (/tema|koyu|açık|renk/.test(t))
    return {
      text: "Soldaki raftaki palet düğmesiyle tema ayarlarını açabilir, ay / güneş düğmesiyle koyu ve açık tema arasında geçebilirsiniz. Bu panodaki Denetimler widget'ı da aynı işi görür.",
    }
  if (/merhaba|selam/.test(t))
    return {
      text: `Merhaba ${CURRENT_USER.firstName}! İş akışlarınız ya da uygulama hakkında sorabilirsiniz.`,
    }
  return {
    text: 'Bunu henüz yanıtlayamıyorum. Bekleyen onaylar, başlattığınız işler, taslaklar ya da tema hakkında sorabilirsiniz.',
  }
}

export function AssistantWidget() {
  const navigate = useNavigate()
  const counts = useBoxCounts()
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [typing, setTyping] = useState(false)
  const end = useRef<HTMLElement | null>(null)
  const nextId = useRef(1)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [messages, typing])

  const send = (q: string) => {
    const v = q.trim()
    if (!v || typing) return
    setText('')
    setMessages((m) => [...m, { id: nextId.current++, from: 'user', text: v }])
    setTyping(true)
    // Kısa bir "yazıyor" arası; yanıt yerel
    window.setTimeout(() => {
      setMessages((m) => [...m, { id: nextId.current++, from: 'bot', ...answer(v, counts) }])
      setTyping(false)
    }, 650)
  }

  return (
    <WidgetCard className="p-0">
      <Flex className="block px-4 pt-4">
        <WidgetTitle icon={Sparkles}>Asistan</WidgetTitle>
      </Flex>
      <Scroll className="min-h-0 flex-1 overflow-y-auto px-4">
        {messages.length === 0 ? (
          <Flex className="flex flex-col gap-2 py-2">
            <Text tone="muted" className="text-sm">
              Merhaba {CURRENT_USER.firstName}, size nasıl yardımcı olabilirim?
            </Text>
            <Flex className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <Button
                  key={s}
                  size="small"
                  type="text"
                  onClick={() => send(s)}
                  className="h-7 rounded-full bg-surface-secondary px-3 text-xs font-normal hover:bg-surface-tertiary"
                >
                  {s}
                </Button>
              ))}
            </Flex>
          </Flex>
        ) : (
          <Flex role="log" aria-live="polite" className="flex flex-col gap-2 py-2">
            {messages.map((m) => (
              <Flex
                key={m.id}
                className={cn(
                  'flex max-w-[85%] animate-[fade-in_calc(0.2s*var(--motion-time,1))_ease-out] flex-col gap-2 rounded-2xl px-3 py-2 text-sm',
                  m.from === 'user'
                    ? 'self-end rounded-br-md bg-accent text-accent-foreground'
                    : 'self-start rounded-bl-md bg-surface-secondary text-foreground',
                )}
              >
                <Text className="text-current">{m.text}</Text>
                {m.action && (
                  <Button
                    size="small"
                    type="text"
                    onClick={() => navigate(m.action!.href)}
                    className="h-7 w-fit gap-1 rounded-full bg-surface px-3 text-xs text-foreground hover:bg-surface-secondary"
                  >
                    {m.action.label}
                    <ArrowRight {...IC} size={12} />
                  </Button>
                )}
              </Flex>
            ))}
            {typing && (
              <Flex className="self-start rounded-2xl rounded-bl-md bg-surface-secondary px-3 py-2">
                <Spin size="small" />
              </Flex>
            )}
            {/* `block`: antd'de içi boş `Flex` gizlenir (gizliyken kaydırma hedefi olamaz) */}
            <Flex ref={end} className="block" />
          </Flex>
        )}
      </Scroll>
      <Flex className="flex shrink-0 items-center gap-2 border-t border-border p-3">
        <Input
          aria-label="Mesaj"
          placeholder="Bir şey sorun…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPressEnter={() => send(text)}
          className="min-w-0 flex-1"
        />
        <Button
          type="primary"
          aria-label="Gönder"
          disabled={!text.trim() || typing}
          onClick={() => send(text)}
          icon={<SendHorizontal {...IC} size={16} />}
          className="shrink-0"
        />
      </Flex>
      <Text tone="muted" className="-mt-2 px-4 pb-2 text-[0.6875rem]">
        Tanıtım: yanıtlar uygulama verisinden üretilir, yapay zekâ bağlantısı yok.
      </Text>
    </WidgetCard>
  )
}

/* --- Takvim ------------------------------------------------------------------------------------ */

const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export function CalendarWidget({ size }: { size: WidgetSize }) {
  const today = useTick(60_000)
  const [offset, setOffset] = useState(0)
  const first = new Date(today.getFullYear(), today.getMonth() + offset, 1)
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  // Pazartesi başlangıçlı hafta: boş hücre sayısı
  const lead = (first.getDay() + 6) % 7
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
  const isToday = (d: number) => offset === 0 && d === today.getDate()
  const title = first.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })
  return (
    <WidgetCard className="gap-2">
      <Flex className="flex items-center gap-1">
        <Text className="min-w-0 flex-1 truncate text-sm font-semibold text-current capitalize">
          {title}
        </Text>
        {offset !== 0 && (
          <Button
            size="small"
            type="text"
            onClick={() => setOffset(0)}
            className="h-7 px-2 text-xs"
          >
            Bugün
          </Button>
        )}
        {(
          [
            { label: 'Önceki ay', icon: ChevronLeft, d: -1 },
            { label: 'Sonraki ay', icon: ChevronRight, d: 1 },
          ] as const
        ).map(({ label, icon: Icon, d }) => (
          <Tip key={label} label={label}>
            <Button
              size="small"
              type="text"
              aria-label={label}
              onClick={() => setOffset((o) => o + d)}
              icon={<Icon {...IC} size={16} />}
              className="size-7 min-w-7"
            />
          </Tip>
        ))}
      </Flex>
      <Flex
        role="grid"
        aria-label={title}
        className={cn(
          'grid flex-1 grid-cols-7 content-start gap-y-1 text-center',
          size.id === 'l' ? 'text-sm' : 'text-xs',
        )}
      >
        {WEEKDAYS.map((w) => (
          <Text key={w} tone="muted" className="py-1 text-[0.6875rem] font-medium">
            {w}
          </Text>
        ))}
        {cells.map((d, i) => (
          <Flex key={i} className="grid place-items-center">
            {d && (
              <Text
                aria-current={isToday(d) ? 'date' : undefined}
                className={cn(
                  'grid aspect-square w-full max-w-8 place-items-center rounded-full tabular-nums',
                  isToday(d)
                    ? 'bg-accent font-semibold text-accent-foreground'
                    : 'text-foreground/80',
                  i % 7 >= 5 && !isToday(d) && 'text-muted',
                )}
              >
                {d}
              </Text>
            )}
          </Flex>
        ))}
      </Flex>
    </WidgetCard>
  )
}

/* --- Denetimler (iOS denetim merkezi gibi) ----------------------------------------------------- */

export function ControlsWidget({ size }: { size: WidgetSize }) {
  const control = useSettingsControl()
  const dark = useIsDark()
  if (!control) return null
  const { settings, update, openPanel } = control
  const toggles = [
    {
      id: 'dark',
      label: 'Koyu tema',
      icon: Moon,
      on: dark,
      flip: () => setColorMode(dark ? 'light' : 'dark'),
    },
    {
      id: 'motion',
      label: 'Animasyonlar',
      icon: Wand2,
      on: settings.motion !== 'off',
      flip: () => update({ ...settings, motion: settings.motion === 'off' ? 'full' : 'off' }),
    },
  ]
  const square = size.id === 'square'
  const iconsOnly = size.id === 'compact'
  return (
    <WidgetCard className="justify-center p-3">
      <Flex className="grid grid-cols-2 gap-2">
        {toggles.map((t) => (
          <Tip key={t.id} label={t.label}>
            <Button
              aria-label={t.label}
              aria-pressed={t.on}
              type="text"
              onClick={t.flip}
              className={cn(
                // Karo sütununu doldurur
                'h-auto w-full min-w-0 flex-col gap-1.5 rounded-2xl! px-1 py-3 font-normal transition-colors',
                t.on
                  ? 'bg-accent text-accent-foreground hover:bg-accent/90 hover:text-accent-foreground'
                  : 'bg-surface-secondary text-foreground/75 hover:bg-surface-tertiary hover:text-foreground/75',
              )}
            >
              <t.icon {...IC} size={20} />
              {!iconsOnly && (
                <Text className="w-full truncate text-center text-[0.6875rem] text-current">
                  {t.label}
                </Text>
              )}
            </Button>
          </Tip>
        ))}
      </Flex>
      {square && (
        <Button
          size="small"
          type="text"
          onClick={openPanel}
          icon={<Palette {...IC} size={14} />}
          className="w-full gap-1.5 rounded-xl text-muted hover:text-foreground"
        >
          Tema ayarları
        </Button>
      )}
    </WidgetCard>
  )
}

/* --- Notlar ------------------------------------------------------------------------------------ */

const NOTES_KEY = 'synergy-notes-v1'

/** Henüz not yazılmamışsa görünen örnek notlar (düzenlenince kullanıcının notu saklanır). */
const SAMPLE_NOTES = [
  '• Cuma 14:00 bütçe toplantısı: Q4 satın alma kalemlerini gözden geçir',
  '• Muhasebe dizüstü talebi (20000) için teklifleri karşılaştır',
  "• Yıllık izin planını İK'ya pazartesiye kadar gönder",
  '• Tedarikçi listesini güncelle: yeni lojistik firması eklenecek',
  '• Doküman revizyon onaylarını haftalık kontrol et',
].join('\n')

export function NotesWidget() {
  const [text, setText] = useState(() => readJson<string>(NOTES_KEY, SAMPLE_NOTES))
  return (
    <WidgetCard className="gap-2 bg-accent-soft/60">
      <Input.TextArea
        variant="borderless"
        aria-label="Notlar"
        placeholder="Kısa bir not yazın…"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          writeJson(NOTES_KEY, e.target.value)
        }}
        className="min-h-0 flex-1 resize-none border-0 bg-transparent p-0 text-sm shadow-none"
      />
      <Text tone="muted" className="shrink-0 text-[0.6875rem]">
        Bu tarayıcıda saklanır · {text.length} karakter
      </Text>
    </WidgetCard>
  )
}
