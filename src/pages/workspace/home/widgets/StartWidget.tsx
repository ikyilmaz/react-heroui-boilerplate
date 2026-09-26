import type { CSSProperties, ReactNode } from 'react'
import { Button, Card, Surface, ToggleButton, Typography, cn } from '@heroui/react'
import { LayoutGrid, Star } from 'lucide-react'
import { findProcess, type Process } from '@/pages/workflows/workflowData'
import { useFavorites } from '@/pages/workspace/home/favorites'
import { useHome } from '@/pages/workspace/home/HomeContext'
import { KARO_GAP, KARO_MIN, karoCapacity } from '@/pages/workspace/home/metrics'
import type { WidgetBodyProps } from '@/pages/workspace/home/types'
import { Box, Text } from '@/pages/workspace/ui'
import { inline, tile } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * "Yeni talep başlat": kullanıcının sık başlattığı süreçler tek tıkla
 *
 * Eski "Hızlı erişim" ızgarasının yerine (on karodan dokuzu hiçbir yere gitmiyordu). Sık kullanılanlar
 * `favorites.ts › useFavorites`'ten; hiç yıldızlanmadıysa geçmişteki (başlatılan + taslak) süreçler.
 * Bir sürece basmak "Yeni talep" penceresini o sürecin özetinde, "Tüm süreçler" kataloğunda açar;
 * başlıktaki "Yeni talep" düğmesi ve N tuşu da aynı pencereyi açar.
 *
 * İki kip:
 * - Hap: sarılan tek satır hap düğmeler; sonda hayalet "Tüm süreçler".
 * - Karo: tek sıra başlatıcı karo; her karoda sağ üstte yıldız (`ToggleButton`, düğmenin içinde
 *   değil, kardeşi). Karo sayısı iç genişlikten hesaplanır (`karoCapacity`); bir yer "Tüm
 *   süreçler"e ayrılır. Tek sütunda karolar iki sıraya kadar sarılır.
 *
 * Çizim sırası bileşen ilk çizildiğindeki listedir (`snapshot`): yıldızı kaldırılan karo yerinde
 * kalır, yeni yıldızlanan sona eklenir; imlecin altındaki karo kaymaz. Sayı yok.
 *
 * Yükseklik DOM ölçülmeden sığar: karo boyu sabit px (Rahat 132, Sıkı 116; kip en az dört birim),
 * haplar sabit 44px. Hap genişliği yazıdan cömertçe tahmin edilir; sığmayan sık kullanılan
 * gösterilmez, "Tüm süreçler" her zaman görünür.
 * ------------------------------------------------------------------------------------------------- */

const ALL_LABEL = 'Tüm süreçler'

/** Hap yüksekliği ve haplar arası boşluk (px; ölçek sınıfı değil, tema boşluk ayarından bağımsız). */
const PILL_H = 44
const PILL_GAP = 8

/** Hap genişliğinin sabit kısmı (px): iki yanda 16px dolgu, 18px ikon, 8px boşluk, kenar. */
const PILL_FIXED = 16 * 2 + 18 + 8 + 2

/** Harf başına ortalama genişlik (em); gerçek değerden (~0.55) bilerek büyük, hap taşmasın. */
const CHAR_EM = 0.6

/** Karo boyu (px) yoğunluğa göre; `registry › modeMinH.karo` (dört birim) bu boya göre seçildi. */
const KARO_H = { comfortable: 'h-[132px]', compact: 'h-[116px]' } as const
const KARO_PAD = { comfortable: 'p-[16px]', compact: 'p-[12px]' } as const
const KARO_ICON = { comfortable: 'size-[40px]', compact: 'size-[36px]' } as const

/** Tek sütunda karo en fazla iki sıra. */
const STACK_KARO_ROWS = 2

/** Kenar halkası (`tile`) HeroUI'nin odak halkasını ezer; klavye odağında geri verilir. */
const focusRing = 'data-[focus-visible]:status-focused'

/** Hap düğmesi: sabit px yükseklik, dolgu ve boşluk (genişlik tahminiyle aynı değerler). */
const pill = 'h-[44px] shrink-0 gap-[8px] rounded-pill px-[16px] text-[0.875rem] [&_svg]:size-[18px]'

/**
 * Yıldız: seçiliyken dolu yıldız, zemin sakin kalır. `.soft-theme`'de seçili geçiş düğmesi siyah;
 * burada yıldız bir karar değil, siyah yalnızca karar düğmelerinde (tasarım dili: "siyah = karar").
 */
const starToggle = cn(
  'text-foreground/45 data-[hovered=true]:text-foreground',
  'data-[selected=true]:bg-transparent data-[selected=true]:text-foreground data-[selected=true]:data-[hovered=true]:bg-(--default)',
  focusRing,
)

/** Kök yazı boyutu (px); tema panelinden değişebilir, hap genişliği tahmini buna göre ölçeklenir. */
function rootFontPx() {
  try {
    return Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  } catch {
    return 16
  }
}

function pillWidth(label: string, rootPx: number) {
  return Math.ceil(PILL_FIXED + label.length * 0.875 * rootPx * CHAR_EM)
}

/** Verilen genişlikteki hapların `flex-wrap` ile kaç satıra dizileceği. */
function rowsNeeded(widths: readonly number[], innerW: number) {
  let rows = 1
  let x = 0
  for (const w of widths) {
    const need = x === 0 ? w : x + PILL_GAP + w
    if (need > innerW && x > 0) {
      rows++
      x = w
    } else x = need
  }
  return rows
}

/** Bütçeye sığan sık kullanılan hap sayısı; "Tüm süreçler" hapı sonda her zaman yer bulur. */
function fitPills(names: readonly string[], innerW: number, budgetPx: number) {
  if (!Number.isFinite(budgetPx)) return names.length
  const maxRows = Math.max(1, Math.floor((budgetPx + PILL_GAP) / (PILL_H + PILL_GAP)))
  const rootPx = rootFontPx()
  const widths = names.map((n) => pillWidth(n, rootPx))
  const all = pillWidth(ALL_LABEL, rootPx)
  for (let k = names.length; k > 0; k--) {
    if (rowsNeeded([...widths.slice(0, k), all], innerW) <= maxRows) return k
  }
  return 0
}

export function StartWidget({ mode, budgetPx, innerWidthPx, density, stacked }: WidgetBodyProps) {
  const [ids, toggle, snapshot] = useFavorites()
  const karo = mode === 'karo'
  // Karo yerinde kalır (yıldızı kaldırılsa da); hap yalnızca şu an yıldızlı olanları gösterir
  const order = karo ? snapshot : snapshot.filter((id) => ids.includes(id))
  const list = order.flatMap((id) => {
    const p = findProcess(id)
    return p ? [p] : []
  })

  if (list.length === 0) return <StartEmpty stacked={stacked} />
  if (karo) return <KaroRow list={list} ids={ids} toggle={toggle} innerWidthPx={innerWidthPx} density={density} stacked={stacked} />
  return <HapRow list={list} innerWidthPx={innerWidthPx} budgetPx={budgetPx} stacked={stacked} />
}

/* ---- Hap --------------------------------------------------------------------------------------- */

function HapRow({ list, innerWidthPx, budgetPx, stacked }: { list: Process[]; innerWidthPx: number; budgetPx: number; stacked: boolean }) {
  const home = useHome()
  const shown = list.slice(0, fitPills(list.map((p) => p.name), innerWidthPx, budgetPx))

  return (
    <Box className={cn('flex min-h-0 flex-1 flex-wrap content-center items-center gap-[8px]', stacked && 'py-1')}>
      {shown.map((p) => {
        const Icon = p.icon
        return (
          <Button key={p.id} variant="secondary" onPress={() => home.openStart(p.id)} className={cn(pill, tile, focusRing)}>
            <Icon strokeWidth={1.5} aria-hidden />
            {p.name}
          </Button>
        )
      })}
      <AllPill />
    </Box>
  )
}

/** Sondaki hayalet "Tüm süreçler": kataloğu açar. */
function AllPill() {
  const home = useHome()
  return (
    <Button variant="ghost" onPress={() => home.openStart()} className={pill}>
      <LayoutGrid strokeWidth={1.5} aria-hidden />
      {ALL_LABEL}
    </Button>
  )
}

/* ---- Karo -------------------------------------------------------------------------------------- */

interface KaroRowProps {
  list: Process[]
  ids: readonly string[]
  toggle: (id: string) => void
  innerWidthPx: number
  density: WidgetBodyProps['density']
  stacked: boolean
}

function KaroRow({ list, ids, toggle, innerWidthPx, density, stacked }: KaroRowProps) {
  const home = useHome()
  // Izgarada tek sıra: sığan karo sayısı + "Tüm süreçler". Tek sütunda en az iki sütun, iki sıra.
  const cols = stacked ? Math.max(2, Math.floor((innerWidthPx + KARO_GAP) / (KARO_MIN + KARO_GAP))) : karoCapacity(innerWidthPx) + 1
  const capacity = stacked ? cols * STACK_KARO_ROWS - 1 : cols - 1
  const shown = list.slice(0, capacity)

  return (
    <Box
      // Sütun sayısı genişlikten hesaplanır; sınıf sabit kalsın diye değişkenle verilir
      className={cn('grid min-h-0 grid-cols-[repeat(var(--karo-cols),minmax(0,1fr))] items-start gap-[12px]', stacked && 'py-1')}
      style={{ '--karo-cols': Math.max(1, cols) } as CSSProperties}
    >
      {shown.map((p) => (
        <KaroTile key={p.id} p={p} starred={ids.includes(p.id)} onToggle={() => toggle(p.id)} onOpen={() => home.openStart(p.id)} density={density} />
      ))}
      <Card variant="transparent" className={cn('relative min-w-0 rounded-tile p-0 shadow-none', KARO_H[density], tile)}>
        <TileButton onPress={() => home.openStart()} density={density}>
          <Surface variant="tertiary" className={cn('grid shrink-0 place-items-center rounded-pill', KARO_ICON[density], tile)}>
            <LayoutGrid size={18} strokeWidth={1.5} aria-hidden className="m-0 size-[18px]" />
          </Surface>
          <Typography {...inline} truncate weight="semibold" className="w-full text-[0.875rem] leading-[1.25rem] text-current!">
            {ALL_LABEL}
          </Typography>
        </TileButton>
      </Card>
    </Box>
  )
}

interface KaroTileProps {
  p: Process
  starred: boolean
  onToggle: () => void
  onOpen: () => void
  density: WidgetBodyProps['density']
}

function KaroTile({ p, starred, onToggle, onOpen, density }: KaroTileProps) {
  const Icon = p.icon
  return (
    <Card variant="tertiary" className={cn('relative min-w-0 rounded-tile p-0 shadow-none', KARO_H[density], tile)}>
      <TileButton onPress={onOpen} density={density}>
        <Surface variant="tertiary" className={cn('grid shrink-0 place-items-center rounded-pill', KARO_ICON[density], tile)}>
          <Icon size={18} strokeWidth={1.5} aria-hidden className="m-0 size-[18px]" />
        </Surface>
        <Box className="flex w-full min-w-0 flex-col">
          <Typography {...inline} truncate weight="semibold" className="text-[0.875rem] leading-[1.25rem] text-current!">
            {p.name}
          </Typography>
          <Text tone="muted" truncate className="text-[0.75rem] leading-[1rem]">
            {p.department}
          </Text>
        </Box>
      </TileButton>

      {/* Yıldız, düğmenin içinde değil kardeşi: iç içe etkileşimli öğe olmasın */}
      <ToggleButton
        isIconOnly
        size="sm"
        variant="ghost"
        isSelected={starred}
        onChange={onToggle}
        aria-label={starred ? `Sık kullanılanlardan çıkar: ${p.name}` : `Sık kullanılanlara ekle: ${p.name}`}
        className={cn('absolute top-3 right-3 size-9', starToggle)}
      >
        <Star size={16} strokeWidth={1.5} fill={starred ? 'currentColor' : 'none'} aria-hidden />
      </ToggleButton>
    </Card>
  )
}

/**
 * Karonun tamamını kaplayan düğme: ikon üstte, ad altta. Basınca karo küçülmez (kenar halkası
 * sabit kalır); geri bildirim zemin tonuyla.
 */
function TileButton({ onPress, density, children }: { onPress: () => void; density: WidgetBodyProps['density']; children: ReactNode }) {
  return (
    <Button
      variant="ghost"
      onPress={onPress}
      className={cn(
        'absolute inset-0 h-full w-full flex-col items-start justify-between gap-0 rounded-tile text-start whitespace-normal',
        'transition-colors duration-150 ease-out data-[hovered=true]:bg-foreground/5 data-[pressed=true]:transform-none data-[pressed=true]:bg-foreground/5 motion-reduce:transition-none',
        KARO_PAD[density],
        focusRing,
      )}
    >
      {children}
    </Button>
  )
}

/* ---- Boş durum --------------------------------------------------------------------------------- */

/** Hiç sık kullanılan ve geçmiş yok: tek soluk satır ve "Tüm süreçler". */
function StartEmpty({ stacked }: { stacked: boolean }) {
  return (
    <Box className={cn('flex min-h-0 flex-1 flex-wrap content-center items-center gap-x-4 gap-y-2', stacked && 'py-2')}>
      <Text className="text-[0.8125rem] leading-[1.25rem]">Sık başlattığınız süreçleri yıldızlayın, burada görünsün.</Text>
      <AllPill />
    </Box>
  )
}
