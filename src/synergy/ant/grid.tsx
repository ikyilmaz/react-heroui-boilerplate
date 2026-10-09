import { useState, type ReactNode } from 'react'
import { LayoutGrid, Rows3 } from 'lucide-react'
import { Button, Card, Flex, Pagination, Segmented, Select, Typography } from 'antd'
import { readJson, writeJson } from '@/synergy/shared/grid'
import { GroupLabel } from '@/synergy/ant/parts'
import { IC, Scroll, Tip, cn } from '@/synergy/ant/ui'

/*
 * Ortak veri ızgarası parçaları, antd.
 *
 * Tablo: antd `Table`'ın üstüne sade görünüm (`GRID_TABLE`). Başlık yüzey renginde, küçük büyük
 * harfli etiketler ve altında ince çizgi, kaydırınca üstte kalır; satırlar çizgisiz, üzerine gelince
 * köşeleri yuvarlak bir zemin belirir. Tarih grubu satırları (`GRID_GROUP_ROW`) küçük başlık.
 *
 * Kart: aynı satırlar duyarlı bir ızgarada kartlar. Görünüm seçimi (`useGridView`) ızgara türü
 * başına tarayıcıda hatırlanır.
 */

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

/* --- Tablo görünümü ---------------------------------------------------------------------------- */

/** Tablonun kabı (`Table` `className`): başlık yapışık, satır ve başlık çizgileri sade. */
export const GRID_TABLE = cn(
  // Başlık: şeffaf değil (satırlar altından geçer), küçük büyük harf, altında ince çizgi
  '[&_.ant-table-thead>tr>th]:sticky [&_.ant-table-thead>tr>th]:top-0 [&_.ant-table-thead>tr>th]:z-10',
  '[&_.ant-table-thead>tr>th]:h-10 [&_.ant-table-thead>tr>th]:rounded-none! [&_.ant-table-thead>tr>th]:border-b-0 [&_.ant-table-thead>tr>th]:bg-surface [&_.ant-table-thead>tr>th]:py-0',
  '[&_.ant-table-thead>tr>th]:text-[0.6875rem] [&_.ant-table-thead>tr>th]:font-semibold [&_.ant-table-thead>tr>th]:tracking-[0.06em] [&_.ant-table-thead>tr>th]:whitespace-nowrap [&_.ant-table-thead>tr>th]:text-muted [&_.ant-table-thead>tr>th]:uppercase [&_.ant-table-thead>tr>th]:shadow-[inset_0_-1px_0_var(--border)]',
  // Satırlar: çizgisiz, aralarında 2px boşluk; üzerine gelince yuvarlak köşeli zemin
  '[&_table]:border-separate [&_table]:[border-spacing:0_2px] [&_.ant-table]:bg-transparent',
  '[&_.ant-table-tbody>tr>td]:border-b-0 [&_.ant-table-tbody>tr>td]:py-1.5 [&_.ant-table-tbody>tr>td]:h-12',
  '[&_.ant-table-tbody>tr>td:first-child]:rounded-s-xl [&_.ant-table-tbody>tr>td:last-child]:rounded-e-xl',
)

/** Veri satırı (`rowClassName`): tıklanır. */
export const GRID_ROW = 'cursor-pointer'

/** Tarih grubu satırı: satırların üstünde küçük başlık, üzerine gelince zemin yok. */
export const GRID_GROUP_ROW =
  'cursor-default [&>td]:h-9! [&>td]:bg-transparent! [&>td]:pt-3! [&>td]:pb-1!'

/** Seçili satır (`rowClassName`; ör. düzenleme kartında açık kayıt): birincil rengin yumuşak tonu. */
export const GRID_ROW_SELECTED = '[&>td]:bg-accent-soft! [&:hover>td]:bg-accent-soft!'

/** Etkileşimsiz satır (ör. aç / kapa anahtarı olan listeler): üzerine gelince daha açık zemin. */
export const GRID_ROW_STATIC = 'cursor-default [&:hover>td]:bg-surface-secondary/60!'

/** Satır başlığı hücresi (konu, ad) ve diğer hücreler. */
export const GRID_LEAD = 'min-w-48 font-medium text-foreground'
export const GRID_CELL = 'whitespace-nowrap text-foreground/70'

/* --- Görünüm seçimi ---------------------------------------------------------------------------- */

const VIEWS = [
  { value: 'table', label: 'Tablo görünümü', icon: Rows3 },
  { value: 'cards', label: 'Kart görünümü', icon: LayoutGrid },
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
    <Segmented<GridView>
      aria-label="Görünüm"
      value={view}
      onChange={onChange}
      className={cn('shrink-0', className)}
      options={VIEWS.map(({ value, label, icon: Icon }) => ({
        value,
        label: (
          <Tip label={label}>
            <Flex align="center" justify="center" aria-label={label} className="h-8 w-6">
              <Icon {...IC} />
            </Flex>
          </Tip>
        ),
      }))}
    />
  )
}

/* --- Kart görünümü ----------------------------------------------------------------------------- */

/** Kartların kaydırılan kabı; içinde bir ya da daha çok `CardGroup`. */
export function CardList({ children, className }: { children: ReactNode; className?: string }) {
  return <Scroll className={cn('-m-1 gap-5 p-1', className)}>{children}</Scroll>
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
    <Flex vertical gap={10}>
      {label && <GroupLabel label={label} count={count ?? 0} />}
      <Flex
        role="list"
        aria-label={label ? `${listLabel}: ${label}` : listLabel}
        className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,17rem),1fr))] gap-3"
      >
        {children}
      </Flex>
    </Flex>
  )
}

export interface CardField {
  label: string
  value: ReactNode
}

/**
 * Tek kart: üstte küçük künye (numara) ve rozet (durum), başlık, iki sütunlu alanlar, altta ince
 * çizginin ardından dipnot (ör. tarih) ve eylemler. Başlık kartı açan düğme; düğmenin örtüsü
 * (`::after`, düğme `static` ki karta göre konumlansın) tüm kartı kaplar, eylemler örtünün üstünde.
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
  openPath,
  className,
}: {
  title: ReactNode
  onOpen?: () => void
  /** Çalışma alanında açılış hedefi (sağ tık menüsü, Ctrl / Cmd / orta tık; Workspace.tsx). */
  openPath?: string
  eyebrow?: ReactNode
  badge?: ReactNode
  lead?: ReactNode
  fields: CardField[]
  footer?: ReactNode
  actions?: ReactNode
  selected?: boolean
  /** Kalın başlık (okunmamış). */
  strong?: boolean
  className?: string
}) {
  const heading = (
    <Typography.Text
      className={cn(
        'line-clamp-2 text-start text-[0.9375rem] leading-5 text-current',
        strong ? 'font-semibold' : 'font-medium',
      )}
    >
      {title}
    </Typography.Text>
  )
  return (
    <Card
      role="listitem"
      data-open-path={openPath}
      className={cn(
        'group/row relative rounded-2xl bg-surface-secondary/70 ring-(length:--border-width) ring-border transition-[box-shadow,translate,background-color] duration-200',
        onOpen &&
          'hover:-translate-y-px hover:bg-surface hover:shadow-[0_12px_28px_-18px_color-mix(in_oklab,var(--foreground)_45%,transparent),0_0_0_1px_color-mix(in_oklab,var(--accent)_45%,transparent)]',
        selected && 'bg-accent/10 ring-2 ring-accent hover:bg-accent/10',
        className,
      )}
      classNames={{ body: 'flex h-full flex-col gap-3 p-4' }}
    >
      {(eyebrow || badge) && (
        <Flex align="center" justify="space-between" gap={8} className="min-h-5">
          <Flex className="min-w-0 truncate text-xs text-muted">{eyebrow}</Flex>
          {badge && <Flex className="shrink-0">{badge}</Flex>}
        </Flex>
      )}
      <Flex align="center" gap={12}>
        {lead && <Flex className="shrink-0">{lead}</Flex>}
        {onOpen ? (
          <Button
            type="text"
            onClick={onOpen}
            data-open-click
            // Örtü tüm kartı kaplar (kart `relative`, düğme `static`)
            className="static h-auto min-w-0 flex-1 justify-start p-0 text-foreground whitespace-normal after:absolute after:inset-0 after:z-1 after:rounded-2xl after:content-[''] hover:bg-transparent! focus-visible:outline-none focus-visible:after:shadow-[inset_0_0_0_2px_var(--focus)]"
          >
            {heading}
          </Button>
        ) : (
          <Flex className="min-w-0 flex-1 text-foreground">{heading}</Flex>
        )}
      </Flex>
      {fields.length > 0 && (
        <Flex className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {fields.map((f) => (
            <Flex key={f.label} vertical gap={2} className="min-w-0">
              <Typography.Text type="secondary" ellipsis className="text-[0.6875rem]">
                {f.label}
              </Typography.Text>
              <Flex className="min-w-0 truncate text-[0.8125rem] text-foreground/85">
                {f.value}
              </Flex>
            </Flex>
          ))}
        </Flex>
      )}
      {(footer || actions) && (
        <Flex
          align="center"
          justify="space-between"
          gap={8}
          className="mt-auto min-h-8 border-t border-foreground/8 pt-2.5"
        >
          <Flex className="min-w-0 truncate text-xs text-muted">{footer}</Flex>
          {actions && <Flex className="relative z-2 -me-1.5 shrink-0 items-center">{actions}</Flex>}
        </Flex>
      )}
    </Card>
  )
}

/* --- Alt çubuk --------------------------------------------------------------------------------- */

/** Izgaranın altı: solda sayfa boyutu ve kayıt aralığı, sağda sayfalar. */
export function GridFooter({
  page,
  from,
  shown,
  total,
  pageSize,
  sizes,
  onPage,
  onPageSize,
}: {
  page: number
  pageCount?: number
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
    <Flex wrap align="center" justify="space-between" gap={12} className="shrink-0">
      <Flex align="center" gap={12}>
        <Select
          aria-label="Sayfa boyutu"
          value={pageSize}
          onChange={onPageSize}
          options={sizes.map((n) => ({ value: n, label: `${n} satır` }))}
          className="w-28"
        />
        <Typography.Text type="secondary" className="text-xs tabular-nums">
          {from + 1}–{from + shown} / {total}
        </Typography.Text>
      </Flex>
      <Pagination
        aria-label="Sayfalar"
        current={page}
        total={total}
        pageSize={pageSize}
        showSizeChanger={false}
        onChange={onPage}
      />
    </Flex>
  )
}
