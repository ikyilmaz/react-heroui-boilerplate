import { useLayoutEffect, useState, type ReactNode, type Ref } from 'react'
import ReactGridLayout, { useContainerWidth, type Layout } from 'react-grid-layout'
import {
  Check,
  GripVertical,
  LayoutTemplate,
  Maximize2,
  Pencil,
  Plus,
  RotateCcw,
  X,
} from 'lucide-react'
import { Button, Dropdown, Flex, Popover, Select, Typography } from 'antd'
import { IC, Tip, cn } from '@/synergy/ant/ui'
import { useTabScroller } from '@/synergy/tabs/context'
import {
  COLS,
  GAP,
  PRESETS,
  MIN_ROW_HEIGHT,
  ROW_HEIGHT,
  WIDGETS,
  WIDGET_ORDER,
  fillGaps,
  limitsOf,
  sizeOf,
  useDashboard,
  type PlacedWidget,
  type WidgetKind,
  type WidgetSize,
} from '@/synergy/dashboard/model'

/*
 * Başlangıç widget panosu (react-grid-layout). Görüntü modunda widget'lar yerinde ve etkileşimli.
 * "Düzenle" ile düzenleme moduna geçilir: widget sürüklenerek taşınır, sağ alt köşeden
 * boyutlandırılır (bırakınca desteklenen en yakın boyuta oturur) ya da üstteki boyut menüsünden
 * boyut seçilir, çarpıyla kaldırılır, "Widget ekle" ile eklenir. Hazır düzenler arasında geçilir;
 * değişiklik o düzene yazılır, "Sıfırla" hazır hâline döndürür. Dar ekranda (ızgara 12 sütuna
 * sığmıyorsa) widget'lar sırayla alt alta dizilir, düzenleme kapalı.
 *
 * Kütüphanenin CSS'i kullanılmaz (proje kuralı): öğeler satır içi stille konumlanır; geçiş, yer
 * tutucu ve sürüklenen öğe kabın üzerindeki Tailwind seçicileriyle.
 */

/** Izgaranın düzgün çalıştığı en küçük genişlik (daha dar ekranda alt alta). */
const MIN_GRID_WIDTH = 960

/** Kabın öğe / yer tutucu / tutamak stilleri (kütüphanenin sınıflarına). */
const GRID_SKIN = cn(
  'relative',
  '[&_.react-grid-item]:transition-[transform,width,height] [&_.react-grid-item]:duration-[calc(220ms*var(--motion-time,1))] [&_.react-grid-item]:ease-[cubic-bezier(0.22,1,0.36,1)]',
  '[&_.react-grid-item.resizing]:z-20 [&_.react-grid-item.resizing]:transition-none',
  '[&_.react-draggable-dragging]:z-30 [&_.react-draggable-dragging]:transition-none',
  '[&_.react-grid-placeholder]:rounded-3xl [&_.react-grid-placeholder]:bg-accent/12 [&_.react-grid-placeholder]:ring-2 [&_.react-grid-placeholder]:ring-accent/40 [&_.react-grid-placeholder]:ring-inset',
  '[&_.react-grid-placeholder]:transition-[transform,width,height] [&_.react-grid-placeholder]:duration-100',
  // Boyutlandırma kapalıyken (görüntü modu) tutamak gizli
  '[&_.react-resizable-hide_.dash-handle]:hidden',
)

/** Düzenleme modunda widget'ı taşımayan öğeler (düğmeler). */
const NO_DRAG = 'dash-no-drag'

export function Dashboard({
  render,
  toolbarStart,
}: {
  /** Widget'ın içeriği (tür ve o anki boyut). */
  render: (kind: WidgetKind, size: WidgetSize) => ReactNode
  /** Araç çubuğunun solunda (ör. başlık). */
  toolbarStart?: ReactNode
}) {
  const dash = useDashboard()
  const [editing, setEditing] = useState(false)
  const { width, containerRef, mounted } = useContainerWidth()
  const narrow = mounted && width < MIN_GRID_WIDTH
  const edit = editing && !narrow
  // Görüntü modunda boşluklar komşu widget'lar genişletilerek doldurulur (kayıtlı eski düzenler
  // dahil); düzenlemede ham yerleşim (kullanıcı serbestçe dizer), "Bitti" doldurulmuşu kaydeder
  const items = edit ? dash.items : fillGaps(dash.items)
  // Satır yüksekliği görünen alana göre: pano ekranın altına kadar uzanır, sayfa kaymaz
  const rows = Math.max(1, ...items.map((p) => p.y + p.h))
  const room = useRoomBelow(containerRef.current, useTabScroller())
  // n satır + n boşluk görünen alana sığar (kabın iç payı ve negatif kenar boşluğu birbirini götürür)
  const rowHeight =
    room === null ? MIN_ROW_HEIGHT : Math.max(MIN_ROW_HEIGHT, Math.floor(room / rows - GAP))

  // Boyutlandırma serbest: en küçük desteklenen boyuttan tam genişliğe kadar (görünüm en yakın
  // desteklenen boyuta göre seçilir)
  const layout: Layout = items.map((p) => ({
    i: p.kind,
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    minW: limitsOf(p.kind).minW,
    minH: limitsOf(p.kind).minH,
    maxW: COLS,
  }))

  // Kütüphanenin yerleşimi (taşıma, boyutlandırma, sıkıştırma sonrası) kaydedilir. Yalnızca
  // düzenlemede (açılıştaki bildirim düzeni "değiştirildi" saymasın) ve gerçekten farklıysa.
  const commit = (next: Layout) => {
    const placed = next.map((l) => ({ kind: l.i as WidgetKind, x: l.x, y: l.y, w: l.w, h: l.h }))
    const same =
      placed.length === dash.items.length &&
      placed.every((a) => {
        const b = dash.items.find((p) => p.kind === a.kind)
        return b && b.x === a.x && b.y === a.y && b.w === a.w && b.h === a.h
      })
    if (!same) dash.setItems(placed)
  }

  // Düzenlemeden çıkarken boşluklar doldurulup kaydedilir
  const setEdit = (on: boolean) => {
    if (!on && editing) {
      const filled = fillGaps(dash.items)
      if (JSON.stringify(filled) !== JSON.stringify(dash.items)) dash.setItems(filled)
    }
    setEditing(on)
  }

  const setSize = (kind: WidgetKind, s: WidgetSize) =>
    dash.setItems(dash.items.map((p) => (p.kind === kind ? { ...p, w: s.w, h: s.h } : p)))
  const remove = (kind: WidgetKind) => dash.setItems(dash.items.filter((p) => p.kind !== kind))
  const add = (kind: WidgetKind) => {
    const s = WIDGETS[kind].sizes[0]!
    dash.setItems([...dash.items, { kind, ...freeSpot(dash.items, s.w, s.h), w: s.w, h: s.h }])
  }
  const missing = WIDGET_ORDER.filter((k) => !dash.items.some((p) => p.kind === k))

  // Izgaranın çocuğu düz bir kutu: kütüphane ona ref / konum / olayları ekler ve boyutlandırma
  // tutamağını içine (içeriğin kardeşi olarak) koyar. `block`: antd `Flex` ref / stil / sınıfı
  // iletir; flex olmasın, içerik hücreyi tam doldursun
  const cell = (p: PlacedWidget) => (
    <Flex key={p.kind} className="block">
      <CellContent
        item={p}
        editing={edit}
        onSize={(s) => setSize(p.kind, s)}
        onRemove={() => remove(p.kind)}
      >
        {render(p.kind, sizeOf(p))}
      </CellContent>
    </Flex>
  )

  return (
    <Flex vertical gap={12}>
      <Toolbar
        start={toolbarStart}
        editing={edit}
        canEdit={!narrow}
        presetId={dash.preset.id}
        changed={dash.changed}
        missing={missing}
        onEdit={setEdit}
        onPreset={dash.choose}
        onReset={dash.reset}
        onAdd={add}
      />
      <Flex
        ref={containerRef as Ref<HTMLElement>}
        className={cn(
          // `block`: ızgara çizilmeden önce boş kalabilir (antd'de boş `Flex` gizlenir, ölçülemez).
          // Izgaranın kenar boşluğu (`GAP`, px) kadar dışarı: kartlar her yoğunlukta diğer
          // sayfaların içeriğiyle aynı yerde başlar (boşluk birimiyle kayar, konum çubuğunun
          // şeridinin altına girerdi)
          '-m-[12px] block rounded-[calc(var(--radius-3xl)+12px)] transition-colors duration-300',
          // Düzenleme modunda zemin hafifçe belirir (hücrelerin taşınabildiği alan)
          edit && 'bg-accent-soft/35',
        )}
      >
        {!mounted || (room === null && !narrow) ? null : narrow ? (
          // Dar ekran: yerleşim sırasıyla alt alta, satır sayısı kadar yükseklik
          <Flex vertical gap={12} className="p-[12px]">
            {[...items]
              .sort((a, b) => a.y - b.y || a.x - b.x)
              .map((p) => (
                <Flex
                  key={p.kind}
                  style={{ height: p.h * ROW_HEIGHT + (p.h - 1) * GAP }}
                  className="block min-h-0"
                >
                  {render(p.kind, sizeOf(p))}
                </Flex>
              ))}
          </Flex>
        ) : (
          <ReactGridLayout
            layout={layout}
            width={width}
            gridConfig={{
              cols: COLS,
              rowHeight,
              margin: [GAP, GAP],
              containerPadding: [GAP, GAP],
            }}
            dragConfig={{ enabled: edit, cancel: `.${NO_DRAG}`, threshold: 4 }}
            resizeConfig={{
              enabled: edit,
              handles: ['se'],
              handleComponent: (_axis, ref) => (
                <Flex
                  ref={ref as Ref<HTMLElement>}
                  aria-hidden
                  // `react-resizable-handle`: sürükleme bu sınıfı taşımadan ayırır (özel tutamağa kendisi eklemiyor)
                  className="dash-handle react-resizable-handle absolute end-1.5 bottom-1.5 z-20 grid size-6 cursor-se-resize place-items-center rounded-full bg-accent text-accent-foreground shadow-sm"
                >
                  <Maximize2 {...IC} size={12} className="rotate-90" />
                </Flex>
              ),
            }}
            onLayoutChange={(next) => edit && commit(next)}
            className={GRID_SKIN}
          >
            {items.map(cell)}
          </ReactGridLayout>
        )}
      </Flex>
    </Flex>
  )
}

/** Ana alanın alt boşluğu (kabuktaki `pb-6`). */
const PAGE_BOTTOM = 24
/** Sekmeler açıkken bölmenin alt iç payı (0.75rem). */
const PANE_BOTTOM = 12

/**
 * Öğenin üstünden görünen alanın (sekmeler açıkken bölmenin) altına kadar kalan yükseklik (px);
 * pencere boyu değişince ve öğe yer değiştirince yeniden ölçülür.
 */
function useRoomBelow(el: HTMLElement | null, root: HTMLElement | null) {
  // Ölçülene kadar `null` (ızgara çizilmez; ilk karede taşıp sonra küçülmesin)
  const [room, setRoom] = useState<number | null>(null)
  useLayoutEffect(() => {
    if (!el) return
    const measure = () => {
      // Gizli bölmede kutu yok: son ölçü kalır
      if (!el.getClientRects().length) return
      setRoom(
        root
          ? root.clientHeight -
              (el.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop) -
              PANE_BOTTOM
          : // Sayfa başından ölçülür (kaydırılmışsa da doğru)
            window.innerHeight - (el.getBoundingClientRect().top + window.scrollY) - PAGE_BOTTOM,
      )
    }
    measure()
    window.addEventListener('resize', measure)
    const ro = new ResizeObserver(measure)
    ro.observe(root ?? document.documentElement)
    return () => {
      window.removeEventListener('resize', measure)
      ro.disconnect()
    }
  }, [el, root])
  return room
}

/** Yeni widget için ilk boş yer (yukarıdan aşağı, soldan sağa). */
function freeSpot(items: PlacedWidget[], w: number, h: number) {
  const hit = (x: number, y: number) =>
    items.some((p) => x < p.x + p.w && x + w > p.x && y < p.y + p.h && y + h > p.y)
  for (let y = 0; ; y++) for (let x = 0; x + w <= COLS; x++) if (!hit(x, y)) return { x, y }
}

/* --- Hücre ------------------------------------------------------------------------------------- */

/** Düzenleme modunda widget'ın üstündeki yüzen küçük düğmeler (ad, boyut, kaldır). */
const CHIP = 'rounded-full border-0 bg-surface shadow-sm'

function CellContent({
  item,
  editing,
  onSize,
  onRemove,
  children,
}: {
  item: PlacedWidget
  editing: boolean
  onSize: (s: WidgetSize) => void
  onRemove: () => void
  children: ReactNode
}) {
  const def = WIDGETS[item.kind]
  const current = sizeOf(item)
  return (
    <>
      <Flex
        vertical
        className={cn(
          'h-full transition-[scale,opacity] duration-200',
          // Düzenlemede içerik etkileşimsiz ve hafifçe küçülür; widget bütünüyle tutulup taşınır
          editing && 'pointer-events-none scale-[0.98] opacity-90 select-none',
        )}
      >
        {children}
      </Flex>
      {editing && (
        <>
          {/* `block`: antd'de içi boş `Flex` gizlenir */}
          <Flex
            aria-hidden
            className="absolute inset-0 block cursor-grab rounded-3xl ring-2 ring-accent/35 active:cursor-grabbing"
          />
          {/* Üstte: ad, boyut menüsü, kaldır */}
          <Flex align="center" gap={4} className="absolute inset-x-2 top-2 z-10">
            <Flex align="center" gap={4} className={cn(CHIP, 'min-w-0 py-1 ps-1.5 pe-2.5')}>
              <GripVertical {...IC} size={14} className="shrink-0 text-muted" />
              <Typography.Text className="truncate text-xs font-medium text-current">
                {def.title}
              </Typography.Text>
            </Flex>
            <Flex align="center" gap={4} className="ms-auto">
              {def.sizes.length > 1 && (
                <Dropdown
                  trigger={['click']}
                  placement="bottomRight"
                  menu={{
                    'aria-label': 'Boyut',
                    selectable: true,
                    selectedKeys: [current.id],
                    onClick: ({ key }) => {
                      const s = def.sizes.find((z) => z.id === key)
                      if (s) onSize(s)
                    },
                    items: def.sizes.map((s) => ({
                      key: s.id,
                      label: s.label,
                      // Ölçü ve seçili boyutun onay işareti sağda
                      extra: (
                        <Flex align="center" gap={6} className="ms-4">
                          <Typography.Text className="text-xs text-muted">
                            {s.w}×{s.h}
                          </Typography.Text>
                          <Check
                            {...IC}
                            size={14}
                            className={cn('text-accent', s.id !== current.id && 'invisible')}
                          />
                        </Flex>
                      ),
                    })),
                  }}
                >
                  <Button
                    type="text"
                    size="small"
                    aria-label={`Boyut: ${current.label}`}
                    className={cn(NO_DRAG, CHIP, 'h-7 gap-1 px-2.5 text-xs hover:bg-surface')}
                  >
                    {current.label}
                    <Typography.Text className="text-[0.625rem] text-muted">
                      {current.w}×{current.h}
                    </Typography.Text>
                  </Button>
                </Dropdown>
              )}
              <Tip label="Kaldır">
                <Button
                  type="text"
                  size="small"
                  aria-label={`Kaldır: ${def.title}`}
                  onClick={onRemove}
                  icon={<X {...IC} size={14} />}
                  className={cn(
                    NO_DRAG,
                    CHIP,
                    'size-7 min-w-7 text-muted hover:bg-surface hover:text-danger',
                  )}
                />
              </Tip>
            </Flex>
          </Flex>
        </>
      )}
    </>
  )
}

/* --- Araç çubuğu ------------------------------------------------------------------------------- */

function Toolbar({
  start,
  editing,
  canEdit,
  presetId,
  changed,
  missing,
  onEdit,
  onPreset,
  onReset,
  onAdd,
}: {
  start?: ReactNode
  editing: boolean
  canEdit: boolean
  presetId: string
  changed: boolean
  missing: WidgetKind[]
  onEdit: (on: boolean) => void
  onPreset: (id: string) => void
  onReset: () => void
  onAdd: (kind: WidgetKind) => void
}) {
  const [adding, setAdding] = useState(false)
  // Görüntü modunda yer kaplamaz: sağ altta yüzen düzenle düğmesi
  if (!editing)
    return canEdit ? (
      <Flex className="fixed end-6 bottom-6 z-40">
        <Tip label="Panoyu düzenle" placement="left">
          <Button
            type="primary"
            aria-label="Panoyu düzenle"
            onClick={() => onEdit(true)}
            icon={<Pencil {...IC} size={18} />}
            className="size-12 animate-pop rounded-full bg-accent text-accent-foreground shadow-(--overlay-shadow) hover:bg-accent/90"
          />
        </Tip>
      </Flex>
    ) : null

  // Düzenleme modunda: üst çubuğun ortasında yüzen kapsül (pano kıpırdamaz, tutamakları örtmez)
  return (
    <Flex
      role="toolbar"
      aria-label="Panoyu düzenle"
      align="center"
      gap={6}
      className="fixed start-1/2 top-2.5 z-50 -translate-x-1/2 animate-[fade-in_calc(0.2s*var(--motion-time,1))_ease-out] rounded-full border border-border bg-surface p-1.5 shadow-(--overlay-shadow)"
    >
      {start}
      <Select
        aria-label="Pano düzeni"
        value={presetId}
        onChange={(v) => v && onPreset(String(v))}
        prefix={<LayoutTemplate {...IC} size={15} className="shrink-0 text-muted" />}
        popupMatchSelectWidth={false}
        placement="bottomLeft"
        options={PRESETS.map((p) => ({ value: p.id, label: p.name, description: p.description }))}
        // Kutuda yalnızca düzenin adı (listedeki açıklama satırı değil)
        labelRender={({ label }) => label}
        optionRender={(o) => (
          <Flex vertical className="min-w-0">
            <Typography.Text className="text-sm text-current">{o.data.label}</Typography.Text>
            <Typography.Text className="truncate text-xs text-foreground/45">
              {o.data.description}
            </Typography.Text>
          </Flex>
        )}
        className="h-9 w-52 rounded-full"
        classNames={{ popup: { root: 'w-72' } }}
      />
      <Popover
        open={adding}
        onOpenChange={(open) => setAdding(open && missing.length > 0)}
        trigger="click"
        placement="bottomRight"
        arrow={false}
        classNames={{ container: 'w-80 p-2' }}
        content={
          <Flex vertical gap={4} role="dialog" aria-label="Widget ekle">
            {missing.map((k) => {
              const d = WIDGETS[k]
              return (
                <Button
                  key={k}
                  type="text"
                  onClick={() => {
                    onAdd(k)
                    setAdding(false)
                  }}
                  className="h-auto w-full justify-start gap-3 rounded-xl! px-2 py-2 text-start font-normal"
                >
                  <Flex className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground">
                    <d.icon {...IC} size={18} />
                  </Flex>
                  <Flex vertical className="min-w-0 flex-1">
                    <Typography.Text className="truncate text-sm font-medium text-current">
                      {d.title}
                    </Typography.Text>
                    <Typography.Text className="truncate text-xs text-foreground/45">
                      {d.description}
                    </Typography.Text>
                  </Flex>
                  <Plus {...IC} size={16} className="shrink-0 text-muted" />
                </Button>
              )
            })}
          </Flex>
        }
      >
        <Button
          variant="filled"
          color="default"
          disabled={!missing.length}
          icon={<Plus {...IC} size={16} />}
          className="h-9 gap-1.5 rounded-full"
        >
          Widget ekle
        </Button>
      </Popover>
      <Tip label="Düzeni hazır hâline döndür">
        <Button
          type="text"
          disabled={!changed}
          onClick={onReset}
          icon={<RotateCcw {...IC} size={15} />}
          className="h-9 gap-1.5 rounded-full"
        >
          Sıfırla
        </Button>
      </Tip>
      <Button
        type="primary"
        onClick={() => onEdit(false)}
        icon={<Check {...IC} size={16} />}
        className="h-9 gap-1.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
      >
        Bitti
      </Button>
    </Flex>
  )
}
