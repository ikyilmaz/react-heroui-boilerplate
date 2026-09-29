import { useState, type ReactNode } from 'react'
import { LayoutGrid, Rows3 } from 'lucide-react'
import {
  Card,
  Chip,
  Link,
  ListBox,
  Pagination,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  cn,
} from '@heroui/react'
import { pageItems, readJson, writeJson } from '@/synergy/shared/grid'
import { inline } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { IC, Scroll, Tip } from '@/synergy/v1/parts'

/*
 * Ortak veri ızgarası parçaları (talep ızgarası, İK listeleri, şirket yöneticileri…).
 *
 * Tablo: HeroUI `secondary` tablosunun üstüne sade bir görünüm. Başlık şeffaf, küçük büyük harfli
 * etiketler ve altında ince çizgi (yapışık başlıkta kartın renginde); satırlar çizgisiz, aralarında
 * küçük boşluk, üzerine gelince köşeleri yuvarlak bir zemin belirir; seçili satır birincil rengin
 * yumuşak tonunda.
 *
 * Kart: aynı satırlar duyarlı bir ızgarada kartlar olarak. Üstte numara ve durum, başlık kartı açan
 * bağlantı (tüm kart tıklanır), altında sütunlar ad / değer çiftleri, en altta tarih ve eylemler. Görünüm seçimi
 * (`useGridView`) ızgara türü başına tarayıcıda hatırlanır.
 */

/* --- Tablo görünümü ---------------------------------------------------------------------------- */

/** Tablo içeriği (`Table.Content`): satırlar arasında 2px boşluk (satır zeminleri ayrı durur). */
export const GRID_CONTENT = 'border-separate [border-spacing:0_2px]'

/** Başlık hücresi (`Table.Column`). Yapışık başlıkta satırlar altından geçer. */
export const GRID_HEAD =
  'h-10 rounded-none! bg-surface py-0 text-[0.6875rem] font-semibold tracking-[0.06em] whitespace-nowrap text-muted uppercase shadow-[inset_0_-1px_0_var(--border)] after:content-none'

/** Veri satırı (`Table.Row`): çizgisiz; üzerine gelince yuvarlak köşeli zemin. */
export const GRID_ROW =
  'cursor-pointer *:h-12 *:border-b-0 *:bg-transparent *:py-1.5 *:transition-colors *:duration-150 *:first:rounded-s-xl *:last:rounded-e-xl hover:*:bg-surface-secondary data-[hovered=true]:*:bg-surface-secondary'

/** Seçili satır (ör. düzenleme kartında açık kayıt). */
export const GRID_ROW_SELECTED =
  '*:bg-accent-soft! hover:*:bg-accent-soft! data-[hovered=true]:*:bg-accent-soft!'

/** Etkileşimsiz satır (ör. aç / kapa anahtarı olan listeler). */
export const GRID_ROW_STATIC =
  '*:h-12 *:border-b-0 *:bg-transparent *:py-1.5 *:first:rounded-s-xl *:last:rounded-e-xl hover:*:bg-surface-secondary/60 data-[hovered=true]:*:bg-surface-secondary/60'

/** Tarih grubu satırı: satırların üstünde küçük başlık. */
export const GRID_GROUP_ROW =
  'cursor-default *:h-9 *:border-b-0 *:bg-transparent! *:pt-3 *:pb-1 hover:*:bg-transparent!'

/** Satır başlığı hücresi (konu, ad) ve diğer hücreler. */
export const GRID_LEAD = 'min-w-48 font-medium text-foreground'
export const GRID_CELL = 'whitespace-nowrap text-foreground/70'

/** Grup başlığı (tarih grubu): ad ve sayı. Tabloda ve kartlarda aynı. */
export function GroupLabel({ label, count }: { label: string; count: number }) {
  return (
    <Box className="flex items-center gap-2">
      <Text className="text-xs font-semibold tracking-[0.06em] text-foreground/80 uppercase">
        {label}
      </Text>
      <Chip size="sm" variant="soft" color="accent" className="h-5 min-w-5 justify-center px-1.5">
        <Typography {...inline} className="font-mono text-[0.6875rem] text-current!">
          {count}
        </Typography>
      </Chip>
    </Box>
  )
}

/* --- Görünüm seçimi ---------------------------------------------------------------------------- */

export type GridView = 'table' | 'cards'

const VIEW_KEY = 'synergy-grid-view-v1'

/** Izgara görünümü (tablo / kart); `scope` başına (ör. `workflow`, `hr:kullanicilar`) hatırlanır. */
export function useGridView(scope: string) {
  const [view, setView] = useState<GridView>(
    () => readJson<Record<string, GridView>>(VIEW_KEY, {})[scope] ?? 'table',
  )
  const change = (v: GridView) => {
    setView(v)
    writeJson(VIEW_KEY, { ...readJson<Record<string, GridView>>(VIEW_KEY, {}), [scope]: v })
  }
  return [view, change] as const
}

const VIEWS = [
  { id: 'table', label: 'Tablo görünümü', icon: Rows3 },
  { id: 'cards', label: 'Kart görünümü', icon: LayoutGrid },
] as const

/** Tablo / kart seçici: iki ikonlu bölüm. */
export function ViewSwitch({
  view,
  onChange,
  className,
}: {
  view: GridView
  onChange: (v: GridView) => void
  className?: string
}) {
  return (
    <ToggleButtonGroup
      aria-label="Görünüm"
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[view]}
      onSelectionChange={(k) => onChange([...k][0] as GridView)}
      isDetached
      className={cn('shrink-0 gap-0.5 rounded-xl bg-surface-secondary p-0.5', className)}
    >
      {VIEWS.map(({ id, label, icon: Icon }) => (
        <Tip key={id} label={label}>
          <ToggleButton
            id={id}
            isIconOnly
            size="sm"
            variant="ghost"
            aria-label={label}
            className="size-8 min-w-8 rounded-[calc(var(--radius-xl)-2px)] text-muted data-hovered:text-foreground data-selected:bg-surface data-selected:text-foreground data-selected:shadow-[0_1px_2px_color-mix(in_oklab,var(--foreground)_14%,transparent)]"
          >
            <Icon {...IC} size={16} />
          </ToggleButton>
        </Tip>
      ))}
    </ToggleButtonGroup>
  )
}

/* --- Kart görünümü ----------------------------------------------------------------------------- */

/** Kartların kaydırılan kabı; içinde bir ya da daha çok `CardGroup`. */
export function CardList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Scroll className={cn('-m-1 flex flex-col gap-5 overflow-y-auto p-1', className)}>
      {children}
    </Scroll>
  )
}

/** Kart grubu: isteğe bağlı başlık (tarih grubu) ve altında duyarlı kart ızgarası. */
export function CardGroup({
  label,
  count,
  listLabel,
  children,
}: {
  label?: string
  count?: number
  /** Listenin erişilebilir adı. */
  listLabel: string
  children: ReactNode
}) {
  return (
    <Box className="flex flex-col gap-2.5">
      {label && <GroupLabel label={label} count={count ?? 0} />}
      <Box
        role="list"
        aria-label={label ? `${listLabel}: ${label}` : listLabel}
        className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3"
      >
        {children}
      </Box>
    </Box>
  )
}

export interface CardField {
  label: string
  value: ReactNode
}

/**
 * Tek kart: üstte küçük künye (numara) ve rozet (durum), başlık, iki sütunlu alanlar (ad üstte,
 * değer altta), altta ince çizginin ardından dipnot (ör. tarih). Başlık kartı açan bağlantı;
 * bağlantının örtüsü (`::after`, bağlantı `static` ki karta göre konumlansın) tüm kartı kaplar,
 * eylemler örtünün üstünde kalır.
 */
export function GridCard({
  title,
  onOpen,
  eyebrow,
  badge,
  lead,
  fields,
  footer,
  actions,
  selected = false,
  strong = false,
  className,
}: {
  title: ReactNode
  onOpen?: () => void
  /** Başlığın üstünde küçük künye (ör. süreç numarası). */
  eyebrow?: ReactNode
  /** Künyenin karşısında rozet (ör. durum çipi). */
  badge?: ReactNode
  /** Başlığın solunda küçük öğe (ör. avatar). */
  lead?: ReactNode
  fields: CardField[]
  /** Kartın altı (ör. tarih); eylemler de burada, sağda. */
  footer?: ReactNode
  /** Satır eylemleri (olaylar, sil, anahtar). */
  actions?: ReactNode
  selected?: boolean
  /** Kalın başlık (okunmamış). */
  strong?: boolean
  className?: string
}) {
  const heading = (
    <Typography
      {...inline}
      className={cn(
        'line-clamp-2 text-[0.9375rem] leading-5 text-current!',
        strong ? 'font-semibold' : 'font-medium',
      )}
    >
      {title}
    </Typography>
  )
  return (
    <Card
      role="listitem"
      className={cn(
        // Zemin yüzeyin ikincil tonu: temada kenarlık kapalıyken de kart ayrı durur
        'relative gap-3 rounded-2xl bg-surface-secondary/70 p-4 shadow-none ring-(length:--border-width) ring-border transition-[box-shadow,translate,background-color] duration-200',
        onOpen &&
          'hover:-translate-y-px hover:bg-surface hover:shadow-[0_12px_28px_-18px_color-mix(in_oklab,var(--foreground)_45%,transparent),0_0_0_1px_color-mix(in_oklab,var(--accent)_45%,transparent)]',
        selected && 'bg-accent-soft/60 ring-2 ring-accent hover:bg-accent-soft/60',
        className,
      )}
    >
      {(eyebrow || badge) && (
        <Box className="flex min-h-5 items-center justify-between gap-2">
          <Box className="min-w-0 truncate text-xs text-muted">{eyebrow}</Box>
          {badge && <Box className="shrink-0">{badge}</Box>}
        </Box>
      )}
      {/* `static`: Surface konumlu; örtü satıra değil karta göre yerleşsin */}
      <Box className="static! flex items-center gap-3">
        {lead && <Box className="shrink-0">{lead}</Box>}
        {onOpen ? (
          <Link
            onPress={onOpen}
            className="static! min-w-0 flex-1 text-foreground no-underline after:absolute after:inset-0 after:z-1 after:rounded-2xl after:content-[''] hover:no-underline focus-visible:outline-none data-[focus-visible=true]:after:shadow-[inset_0_0_0_2px_var(--focus)]"
          >
            {heading}
          </Link>
        ) : (
          <Box className="min-w-0 flex-1 text-foreground">{heading}</Box>
        )}
      </Box>
      {fields.length > 0 && (
        <Box className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {fields.map((f) => (
            <Box key={f.label} className="flex min-w-0 flex-col gap-0.5">
              <Text tone="muted" className="truncate text-[0.6875rem]">
                {f.label}
              </Text>
              <Box className="min-w-0 truncate text-[0.8125rem] text-foreground/85">{f.value}</Box>
            </Box>
          ))}
        </Box>
      )}
      {(footer || actions) && (
        <Box className="mt-auto flex min-h-8 items-center justify-between gap-2 border-t border-foreground/8 pt-2.5">
          <Box className="min-w-0 truncate text-xs text-muted">{footer}</Box>
          {actions && (
            <Box className="relative z-2 -me-1.5 flex shrink-0 items-center">{actions}</Box>
          )}
        </Box>
      )}
    </Card>
  )
}

/* --- Alt çubuk --------------------------------------------------------------------------------- */

/** Izgaranın altı: solda sayfa boyutu ve kayıt aralığı, sağda sayfalar. */
export function GridFooter({
  page,
  pageCount,
  from,
  shown,
  total,
  pageSize,
  sizes,
  onPage,
  onPageSize,
}: {
  page: number
  pageCount: number
  /** İlk satırın sırası (0'dan). */
  from: number
  /** Sayfada gösterilen satır sayısı. */
  shown: number
  total: number
  pageSize: number
  sizes: readonly number[]
  onPage: (page: number) => void
  onPageSize: (size: number) => void
}) {
  return (
    <Box className="flex shrink-0 flex-wrap items-center justify-between gap-3">
      <Box className="flex items-center gap-3">
        <Select
          aria-label="Sayfa boyutu"
          value={String(pageSize)}
          onChange={(v) => v && onPageSize(Number(v))}
          className="w-28"
        >
          <Select.Trigger className="h-8 min-h-8">
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox aria-label="Sayfa boyutu seçenekleri">
              {sizes.map((n) => (
                <ListBox.Item key={n} id={String(n)} textValue={`${n} satır`}>
                  {n} satır
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>
        <Typography {...inline} className="font-mono text-xs text-muted! tabular-nums">
          {from + 1}–{from + shown} / {total}
        </Typography>
      </Box>
      <Pagination aria-label="Sayfalar" size="sm" className="w-auto">
        <Pagination.Content>
          <Pagination.Item>
            <Pagination.Previous
              aria-label="Önceki sayfa"
              isDisabled={page <= 1}
              onPress={() => onPage(page - 1)}
            >
              <Pagination.PreviousIcon />
            </Pagination.Previous>
          </Pagination.Item>
          {pageItems(page, pageCount).map((it, i) =>
            it === 'gap' ? (
              <Pagination.Item key={`gap-${i}`}>
                <Pagination.Ellipsis />
              </Pagination.Item>
            ) : (
              <Pagination.Item key={it}>
                <Pagination.Link
                  aria-label={`Sayfa ${it}`}
                  aria-current={it === page ? 'page' : undefined}
                  isActive={it === page}
                  onPress={() => onPage(it)}
                  className="font-mono data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                >
                  {it}
                </Pagination.Link>
              </Pagination.Item>
            ),
          )}
          <Pagination.Item>
            <Pagination.Next
              aria-label="Sonraki sayfa"
              isDisabled={page >= pageCount}
              onPress={() => onPage(page + 1)}
            >
              <Pagination.NextIcon />
            </Pagination.Next>
          </Pagination.Item>
        </Pagination.Content>
      </Pagination>
    </Box>
  )
}
