import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  Button,
  ButtonGroup,
  Card,
  Chip,
  Input,
  SearchField,
  Surface,
  Switch,
  Tabs,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
  cn,
} from '@heroui/react'
import { CalendarDateTime, Time } from '@internationalized/date'
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  CheckCheck,
  CircleCheck,
  CircleDashed,
  CircleX,
  FilterX,
  Hash,
  ListTree,
  Loader,
  PencilLine,
  Plus,
  Search,
  Sparkles,
  Table2,
  Type,
  X,
} from 'lucide-react'
import { FIELD_ICON_BUTTON, FIELD_ICON_SIZE } from '@/components/fieldIconButton'
import { Combobox, type ComboboxOption } from '@/components/Combobox'
import { DateTimePicker } from '@/components/DateTimePicker'
import { NumberBox } from '@/components/NumberBox'
import { TextBox } from '@/components/TextBox'
import { TimePicker } from '@/components/TimePicker'
import { Transfer, type TransferItem } from '@/components/Transfer'
import { TreeSelect, type TreeSelectNode } from '@/components/TreeSelect'
import { DataGrid } from '@/components/DataGrid'
import { useDataGrid, type Request, type Status } from '@/components/useDataGrid'

/**
 * Typography varsayılan olarak <p> basar; buton/etiket/satır içi kullanımda <span> gerekir.
 * `slot: null` ayrıca koleksiyon bağlamlarındaki "A slot prop is required" hatasını önler.
 * İkisi de runtime'da uygulanıyor ama tipte yok.
 */
const inlineText = { elementType: 'span', slot: null } as unknown as Record<string, never>

/* -------------------------------------------------------------------------------------------------
 * Slaytlar
 *
 * HeroUI v3'te hazır bir carousel yok; slayt gösterisi `Tabs` üzerine kurulu. Sekme şeridi hem
 * gezinme hem konum göstergesi (RAC klavye desteği hazır: ←/→, Home/End), altında ileri/geri.
 * ------------------------------------------------------------------------------------------------- */

interface SlideMeta {
  id: string
  label: string
  icon: ReactNode
}

const slides: SlideMeta[] = [
  { id: 'overview', label: 'Genel Bakış', icon: <Sparkles size={16} aria-hidden /> },
  { id: 'datetime', label: 'DateTimePicker', icon: <CalendarClock size={16} aria-hidden /> },
  { id: 'tree', label: 'TreeSelect', icon: <ListTree size={16} aria-hidden /> },
  { id: 'combobox', label: 'Combobox', icon: <Search size={16} aria-hidden /> },
  { id: 'number', label: 'NumberBox', icon: <Hash size={16} aria-hidden /> },
  { id: 'transfer', label: 'Transfer', icon: <ArrowLeftRight size={16} aria-hidden /> },
  { id: 'textbox', label: 'TextBox', icon: <Type size={16} aria-hidden /> },
  { id: 'table', label: 'DataGrid', icon: <Table2 size={16} aria-hidden /> },
  { id: 'table2', label: 'DataGrid2', icon: <PencilLine size={16} aria-hidden /> },
  { id: 'basics', label: 'HeroUI', icon: <Sparkles size={16} aria-hidden /> },
]

/* -------------------------------------------------------------------------------------------------
 * Demo verileri
 * ------------------------------------------------------------------------------------------------- */

const treeData: TreeSelectNode[] = [
  {
    value: 'tr',
    title: 'Türkiye',
    children: [
      {
        value: 'tr-34',
        title: 'İstanbul',
        children: [
          { value: 'tr-34-kadikoy', title: 'Kadıköy' },
          { value: 'tr-34-besiktas', title: 'Beşiktaş' },
          { value: 'tr-34-uskudar', title: 'Üsküdar', disabled: true },
        ],
      },
      {
        value: 'tr-06',
        title: 'Ankara',
        children: [
          { value: 'tr-06-cankaya', title: 'Çankaya' },
          { value: 'tr-06-kecioren', title: 'Keçiören' },
        ],
      },
      { value: 'tr-35', title: 'İzmir' },
    ],
  },
  {
    value: 'de',
    title: 'Almanya',
    children: [
      { value: 'de-berlin', title: 'Berlin' },
      { value: 'de-munich', title: 'Münih' },
    ],
  },
]

const transferData: TransferItem[] = Array.from({ length: 12 }, (_, i) => ({
  key: String(i + 1),
  title: `Öğe ${i + 1}`,
  disabled: i % 5 === 0,
}))

const cityOptions: ComboboxOption[] = [
  { value: 'tr-34', label: 'İstanbul' },
  { value: 'tr-06', label: 'Ankara' },
  { value: 'tr-35', label: 'İzmir' },
  { value: 'tr-16', label: 'Bursa' },
  { value: 'tr-07', label: 'Antalya' },
  { value: 'tr-42', label: 'Konya' },
  { value: 'tr-01', label: 'Adana', disabled: true },
]

const statusOptions: ComboboxOption[] = [
  { value: 'todo', label: 'Yapılacak', icon: <CircleDashed size={16} aria-hidden /> },
  { value: 'doing', label: 'Devam ediyor', icon: <Loader size={16} aria-hidden /> },
  { value: 'done', label: 'Tamamlandı', icon: <CircleCheck size={16} aria-hidden /> },
  { value: 'cancelled', label: 'İptal', icon: <CircleX size={16} aria-hidden /> },
]

const planOptions: ComboboxOption[] = [
  { value: 'free', label: 'Ücretsiz', description: '1 kullanıcı' },
  { value: 'pro', label: 'Pro', description: '10 kullanıcı' },
  { value: 'team', label: 'Takım', description: '50 kullanıcı' },
  { value: 'enterprise', label: 'Kurumsal', description: 'Sınırsız', disabled: true },
]

/** Format örneklerinin hepsi aynı anı gösterir; fark yalnızca format dizgesinden gelir. */
const sampleDate = new CalendarDateTime(2001, 2, 27, 12, 23, 0)

const formatSamples: { format: string; locale?: string }[] = [
  { format: 'DD.MM.YYYY HH:mm' },
  { format: 'D MMMM YYYY' },
  { format: 'dddd, MMMM D, YYYY h:mm A', locale: 'en-US' },
  { format: 'dddd, D MMMM YYYY HH:mm:ss' },
  { format: 'MM/DD/YY hh:mm a', locale: 'en-US' },
  { format: 'YYYY-MM-DD[T]HH:mm:ss' },
]

const STARTERS = [
  'Zeynep Ertoy',
  'Mert Kaya',
  'Ayşe Demir',
  'Burak Şahin',
  'Elif Yıldız',
  'Can Özkan',
  'Deniz Arslan',
  'Seda Korkmaz',
  'Emre Çetin',
  'Gizem Aydın',
  'Ömer Faruk Tan',
  'Nazlı Güneş',
  'Form Team',
  'İnsan Kaynakları',
  'Satınalma Ekibi',
]

const STATUSES: Status[] = ['waiting', 'urgent', 'info', 'approved']

/**
 * Vitrin verisi. Deterministik sözde-rastgele üretilir (sabit tohumlu LCG): sayfalama ve
 * arama denenebilsin diye çok satır gerekiyor ama her açılışta aynı tablo gelsin istiyoruz.
 */
function makeRequests(count: number): Request[] {
  let seed = 20260920
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648
    return seed / 2147483648
  }
  const pick = <T,>(list: readonly T[]) => list[Math.floor(next() * list.length)]

  return Array.from({ length: count }, (_, i) => {
    const month = 3 + Math.floor(next() * 7)
    const day = 1 + Math.floor(next() * 28)
    const status = pick(STATUSES)
    return {
      id: `r${i + 1}`,
      requestNo: 152512 - i * 7 - Math.floor(next() * 5),
      starter: pick(STARTERS),
      processStart: new CalendarDateTime(
        2026,
        month,
        day,
        8 + Math.floor(next() * 10),
        Math.floor(next() * 12) * 5,
      ),
      requestDate: new CalendarDateTime(2026, month, day, 0, 0),
      amount: (1 + Math.floor(next() * 400)) * 250,
      progress: status === 'approved' ? 100 : Math.floor(next() * 20) * 5,
      status,
    }
  })
}

/** TextBox çeviri örneği için diller; ilki ana alandır. */
const DILLER = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
]

const initialShowcaseRequests: Request[] = makeRequests(64)
/** DataGrid2 için ayrı bir küme; hep-açık düzenleme modunda kayıtlar sürekli değişiyor. */
const initialShowcaseRequests2: Request[] = makeRequests(24)

/**
 * Yumuşak vurgu butonu. HeroUI'de `accent-soft` diye bir buton varyantı yok ama varyantlar
 * zeminlerini `--button-bg` / `--button-fg` üzerinden kuruyor (bkz. `.button--danger-soft`);
 * biz de aynı token'ları besliyoruz — hover ve basılı durumlar olduğu gibi çalışıyor.
 */
const ACCENT_SOFT_BUTTON = cn(
  '[--button-bg:var(--accent-soft)]',
  '[--button-bg-hover:var(--accent-soft-hover)]',
  '[--button-bg-pressed:var(--accent-soft-hover)]',
  '[--button-fg:var(--accent-soft-foreground)]',
)

/* -------------------------------------------------------------------------------------------------
 * Sayfa
 * ------------------------------------------------------------------------------------------------- */

/**
 * İstek tablosu widget'ı. İki slayt da (DataGrid ve DataGrid2) bunu kullanıyor; tek fark
 * `showEditorAlways`: hep-açık modda satır içi düzenleyiciler kapanmaz.
 */
function RequestsWidget({
  table,
  showEditorAlways = false,
}: {
  table: ReturnType<typeof useDataGrid>
  showEditorAlways?: boolean
}) {
  /*
     Widget: dış kart araç çubuğunu, iç kart tabloyu taşır.

     Tonlar: sayfa (0.970) → dış kart `tertiary` (0.937) → başlık şeridi
     `surface-secondary` (0.952) → iç kart `default` (beyaz). Dış kart önce
     `secondary` idi; başlık şeridiyle birebir aynı ton olduğu için şerit
     kayboluyordu. Koyu temada sıralama tersine dönüp "kuyu" etkisi veriyor.
     `.card`ın kenarlığı yok, yalnızca zemini var; aynı varyant iç içe gelirse
     kartlar birbirinin içinde kaybolur.
   */
  return (
    <Card variant="tertiary" className="w-full">
      <Card.Header className="flex-row items-center justify-between gap-3">
        <SearchField
          aria-label="Tabloda ara"
          className="w-72 max-w-full"
          value={table.search}
          onChange={table.changeSearch}
        >
          <SearchField.Group className="h-8">
            <SearchField.SearchIcon>
              <Search size={16} aria-hidden />
            </SearchField.SearchIcon>
            <SearchField.Input placeholder="Ara" className="min-w-0 py-1" />
            <SearchField.ClearButton aria-label="Temizle" className={cn('me-1', FIELD_ICON_BUTTON)}>
              <X size={FIELD_ICON_SIZE} aria-hidden />
            </SearchField.ClearButton>
          </SearchField.Group>
        </SearchField>

        {/*
              ButtonGroup çocuklarını klonlayıp "grup çocuğu" işareti koyuyor; Tooltip
              sarmalayıcısı bu işareti yutuyor, yani butonlar size/variant'ı context'ten
              almıyor — o yüzden her butona tek tek veriyoruz. Birleşik görünüm CSS'ten
              (`.button-group .button`) geldiği için Tooltip'ten etkilenmiyor.

              Nötr butonlar yumuşak vurgu renginde: `secondary`nin zemini (0.94) dış
              kartınkine (0.937) neredeyse eşit olduğu için butonlar görünmüyordu. Grup
              artık yumuşak vurgu + dolu vurgu olarak okunuyor.
            */}
        <ButtonGroup aria-label="Tablo araçları">
          <Tooltip>
            <Button
              size="sm"
              variant="secondary"
              className={ACCENT_SOFT_BUTTON}
              isIconOnly
              aria-label="Seçilenleri onayla"
              isDisabled={table.selectedCount === 0}
              onPress={table.approveSelected}
            >
              <CheckCheck size={16} aria-hidden />
            </Button>
            <Tooltip.Content>
              Seçilenleri onayla{table.selectedCount ? ` (${table.selectedCount})` : ''}
            </Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Button
              size="sm"
              variant="secondary"
              className={ACCENT_SOFT_BUTTON}
              isIconOnly
              aria-label="Filtreyi temizle"
              isDisabled={table.activeFilterCount === 0}
              onPress={table.clearFilters}
            >
              <FilterX size={16} aria-hidden />
            </Button>
            <Tooltip.Content>Filtreyi temizle</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Button
              size="sm"
              variant="primary"
              isIconOnly
              aria-label="Yeni istek"
              onPress={table.addRow}
            >
              <Plus size={16} aria-hidden />
            </Button>
            <Tooltip.Content>Yeni istek</Tooltip.Content>
          </Tooltip>
        </ButtonGroup>
      </Card.Header>
      <Card.Content>
        <Card variant="default" className="min-w-0 border border-border p-2">
          <DataGrid
            {...table.tableProps}
            showEditorAlways={showEditorAlways}
            aria-label="Örnek istekler"
          />
        </Card>
      </Card.Content>
    </Card>
  )
}

export function ShowcasePage() {
  const [slide, setSlide] = useState(slides[0].id)

  // Demo durumları sayfada tutulur: RAC yalnızca seçili paneli render eder, sekme
  // değişince panel içinde tutulan durum sıfırlanırdı.
  const [dateTime, setDateTime] = useState<CalendarDateTime | null>(null)
  const [time, setTime] = useState<Time | null>(new Time(9, 30))
  const [city, setCity] = useState<string | null>(null)
  const [comboCity, setComboCity] = useState<string | null>('tr-35')
  const [amount, setAmount] = useState<number | null>(3)
  const [cities, setCities] = useState<string[]>(['tr-34-kadikoy'])
  const [targetKeys, setTargetKeys] = useState<string[]>(['2', '4'])
  const [count, setCount] = useState(0)
  const [name, setName] = useState('')
  const [notifications, setNotifications] = useState(true)
  const [requests, setRequests] = useState(initialShowcaseRequests)
  const [announcement, setAnnouncement] = useState('')

  const announce = useCallback((msg: string) => {
    // Aynı metin art arda gelirse ekran okuyucu tekrar okumaz; önce boşalt
    setAnnouncement('')
    requestAnimationFrame(() => setAnnouncement(msg))
  }, [])

  const table = useDataGrid({
    rows: requests,
    onRowsChange: setRequests,
    onAnnounce: announce,
    // Sunumda tablo + araç çubuğu + sayfalama tek ekrana sığsın
    defaultPageSize: 8,
  })

  const [baslik, setBaslik] = useState('')
  const [aciklama, setAciklama] = useState('Talep formu')
  const [urunAdi, setUrunAdi] = useState('Kablosuz klavye')
  const [urunCevirileri, setUrunCevirileri] = useState<Record<string, string>>({
    en: 'Wireless keyboard',
  })
  const [notMetni, setNotMetni] = useState('')
  const [notCevirileri, setNotCevirileri] = useState<Record<string, string>>({})

  /** DataGrid2 kendi verisiyle çalışsın ki iki slayt birbirinin kaydını değiştirmesin. */
  const [requests2, setRequests2] = useState<Request[]>(initialShowcaseRequests2)
  const table2 = useDataGrid({
    rows: requests2,
    onRowsChange: setRequests2,
    onAnnounce: announce,
    defaultPageSize: 5,
  })

  useEffect(() => {
    document.title = 'Vitrin'
  }, [])

  const index = useMemo(
    () =>
      Math.max(
        0,
        slides.findIndex((s) => s.id === slide),
      ),
    [slide],
  )
  const prev = index > 0 ? slides[index - 1] : null
  const next = index < slides.length - 1 ? slides[index + 1] : null

  const goTo = (target: SlideMeta) => {
    setSlide(target.id)
    announce(`${target.label}, ${slides.indexOf(target) + 1} / ${slides.length}`)
  }

  return (
    <Surface variant="transparent" className="flex flex-col gap-6">
      {/* Canlı bölge: slayt ve tablo duyuruları */}
      <Typography role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </Typography>

      <Typography.Heading level={1} className="text-3xl font-bold tracking-tight">
        Vitrin
      </Typography.Heading>

      {/* Dikey sekmeler: şerit solda, panel sağda; DOM sırası da liste → panel */}
      <Tabs
        orientation="vertical"
        align="start"
        selectedKey={slide}
        onSelectionChange={(k) => goTo(slides.find((s) => s.id === k) ?? slides[0])}
        className="items-start gap-6"
      >
        <Tabs.ListContainer>
          <Tabs.List aria-label="Bileşenler" className="w-48">
            {slides.map((s) => (
              <Tabs.Tab key={s.id} id={s.id} className="gap-2">
                <Tabs.Indicator />
                <Typography aria-hidden className="inline-flex" {...inlineText}>
                  {s.icon}
                </Typography>
                <Typography className="whitespace-nowrap" {...inlineText}>
                  {s.label}
                </Typography>
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        {/* Panel sütunu: gezinme çubuğu ve slaytlar sekme şeridinin solunda akar */}
        <Surface variant="transparent" className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Slayt gezinmesi: sekme şeridinin klavye desteğine ek olarak ileri/geri ve konum */}
          <Toolbar aria-label="Slayt gezinmesi" className="flex w-full items-center gap-2 px-1">
            <Chip
              size="sm"
              variant="soft"
              color="default"
              className="min-w-16 justify-center tabular-nums"
            >
              {index + 1} / {slides.length}
            </Chip>
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              className="ml-auto"
              isDisabled={!prev}
              onPress={() => prev && goTo(prev)}
              aria-label={prev ? `Önceki: ${prev.label}` : 'Önceki slayt yok'}
            >
              <ArrowLeft size={16} aria-hidden />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              isDisabled={!next}
              onPress={() => next && goTo(next)}
              aria-label={next ? `Sonraki: ${next.label}` : 'Sonraki slayt yok'}
            >
              <ArrowRight size={16} aria-hidden />
            </Button>
          </Toolbar>

          {/* ------------------------------ Genel Bakış ------------------------------ */}
          <Tabs.Panel id="overview">
            <Surface variant="transparent" className="flex flex-col gap-2">
              {slides.slice(1).map((s) => (
                <Card key={s.id} variant="secondary" className="flex-row items-center gap-3 py-3">
                  <Typography color="muted" aria-hidden className="inline-flex" {...inlineText}>
                    {s.icon}
                  </Typography>
                  <Card.Title className="flex-1">{s.label}</Card.Title>
                  <Button
                    size="sm"
                    variant="ghost"
                    isIconOnly
                    aria-label={`${s.label} slaydına git`}
                    onPress={() => goTo(s)}
                  >
                    <ArrowRight size={16} aria-hidden />
                  </Button>
                </Card>
              ))}
            </Surface>
          </Tabs.Panel>

          {/* ------------------------------ DateTimePicker ------------------------------ */}
          <Tabs.Panel id="datetime">
            <Slide title="DateTimePicker" subtitle="Format dizgesine göre segmentli tarih ve saat">
              <Demo title="Tarih ve saat">
                <DateTimePicker
                  aria-label="Tarih ve saat"
                  value={dateTime}
                  onChange={setDateTime}
                />
              </Demo>
              <Demo title="Saniyeli, 5 dk adımlı">
                <DateTimePicker
                  aria-label="Saniyeli"
                  showTime={{ showSecond: true, minuteStep: 5 }}
                />
              </Demo>
              <Demo title="Yalnızca tarih">
                <DateTimePicker aria-label="Tarih" showTime={false} />
              </Demo>
              {formatSamples.map((f) => (
                <Demo key={f.format} title={f.format} raw>
                  <DateTimePicker
                    aria-label={f.format}
                    format={f.format}
                    locale={f.locale}
                    defaultValue={sampleDate}
                  />
                </Demo>
              ))}
              <Demo title="Uzun okunuş (state.formatValue)">
                <DateTimePicker
                  aria-label="Uzun okunuşlu tarih ve saat"
                  showTime={{ showSecond: true }}
                  formatOptions={{ month: 'long' }}
                  defaultValue={sampleDate}
                />
              </Demo>
              <Demo title="İngilizce">
                <DateTimePicker
                  aria-label="English"
                  locale="en-US"
                  texts={{ now: 'Now', ok: 'OK', hour: 'Hour', minute: 'Minute' }}
                />
              </Demo>
              <Demo title="Saat">
                <TimePicker aria-label="Saat" value={time} onChange={setTime} className="w-96" />
              </Demo>
              <Demo title="Saat, saniyeli ve 5 dk adımlı">
                <TimePicker
                  aria-label="Saniyeli saat"
                  showSecond
                  minuteStep={5}
                  defaultValue={new Time(12, 25, 30)}
                  className="w-96"
                />
              </Demo>
            </Slide>
          </Tabs.Panel>

          {/* ------------------------------ TreeSelect ------------------------------ */}
          <Tabs.Panel id="tree">
            <Slide title="TreeSelect" subtitle="Ağaç yapısında çoklu seçim">
              <Demo title="Tekli">
                <TreeSelect
                  treeData={treeData}
                  value={city}
                  onChange={setCity}
                  treeDefaultExpandedKeys={['tr']}
                  aria-label="Tekli"
                />
              </Demo>
              <Demo title="Çoklu">
                <TreeSelect
                  treeData={treeData}
                  multiple
                  defaultValue={['tr-35', 'de-berlin']}
                  treeDefaultExpandAll
                  maxTagCount={2}
                  aria-label="Çoklu"
                />
              </Demo>
              <Demo title="Checkbox">
                <TreeSelect
                  treeData={treeData}
                  treeCheckable
                  showCheckedStrategy="SHOW_PARENT"
                  value={cities}
                  onChange={setCities}
                  treeDefaultExpandAll
                  aria-label="Checkbox"
                />
              </Demo>
            </Slide>
          </Tabs.Panel>

          {/* ------------------------------ Combobox ------------------------------ */}
          <Tabs.Panel id="combobox">
            <Slide title="Combobox" subtitle="Aranabilir, temizlenebilir seçim">
              <Demo title="Aramalı (showSearch)">
                <Combobox
                  aria-label="Aramalı"
                  options={cityOptions}
                  value={comboCity}
                  onChange={setComboCity}
                  placeholder="Şehir ara"
                />
              </Demo>
              <Demo title="Aramasız, temizlenemez">
                <Combobox
                  aria-label="Aramasız"
                  options={cityOptions}
                  defaultValue="tr-34"
                  showSearch={false}
                  allowClear={false}
                />
              </Demo>
              <Demo title="İkonlu">
                <Combobox aria-label="İkonlu" options={statusOptions} defaultValue="done" />
              </Demo>
              <Demo title="Açıklamalı, devre dışı öğeli">
                <Combobox
                  aria-label="Açıklamalı"
                  options={planOptions}
                  placeholder="Plan seçin"
                  description="Kurumsal plan şu an kapalı."
                />
              </Demo>
            </Slide>
          </Tabs.Panel>

          {/* ------------------------------ NumberBox ------------------------------ */}
          <Tabs.Panel id="number">
            <Slide title="NumberBox" subtitle="Adımlı ve biçimli sayı girişi">
              <Demo title="Basit">
                <NumberBox aria-label="Basit" value={amount} onChange={setAmount} />
              </Demo>
              <Demo title="Adım 5, sınır 0–100">
                <NumberBox
                  aria-label="Adımlı"
                  defaultValue={25}
                  step={5}
                  minValue={0}
                  maxValue={100}
                />
              </Demo>
              <Demo title="Para birimi">
                <NumberBox
                  aria-label="Tutar"
                  defaultValue={1250}
                  step={50}
                  minValue={0}
                  formatOptions={{ style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }}
                />
              </Demo>
              <Demo title="Yüzde">
                <NumberBox
                  aria-label="Oran"
                  defaultValue={0.15}
                  step={0.01}
                  minValue={0}
                  maxValue={1}
                  formatOptions={{ style: 'percent', maximumFractionDigits: 1 }}
                />
              </Demo>
              <Demo title="Birimli, ondalıklı">
                <NumberBox
                  aria-label="Mesafe"
                  defaultValue={12.5}
                  step={0.5}
                  formatOptions={{
                    style: 'unit',
                    unit: 'kilometer',
                    unitDisplay: 'short',
                    maximumFractionDigits: 1,
                  }}
                />
              </Demo>
              <Demo title="Düğmesiz, binlik ayraçlı">
                <NumberBox
                  aria-label="Nüfus"
                  defaultValue={15840000}
                  showControls={false}
                  formatOptions={{ useGrouping: true, maximumFractionDigits: 0 }}
                />
              </Demo>
              <Demo title="Devre dışı">
                <NumberBox aria-label="Devre dışı" defaultValue={42} isDisabled />
              </Demo>
            </Slide>
          </Tabs.Panel>

          {/* ------------------------------ Transfer ------------------------------ */}
          <Tabs.Panel id="transfer">
            <Slide title="Transfer" subtitle="İki listeli seçim">
              {/* İki liste yan yana; tek sütunda başlıklar sıkışıyor */}
              <Demo title="Aramalı" full>
                <Transfer
                  dataSource={transferData}
                  targetKeys={targetKeys}
                  onChange={(keys) => setTargetKeys(keys)}
                  titles={['Kaynak', 'Seçilenler']}
                  showSearch
                />
              </Demo>
            </Slide>
          </Tabs.Panel>

          {/* ------------------------------ TextBox ------------------------------ */}
          <Tabs.Panel id="textbox">
            <Slide title="TextBox" subtitle="Sonekli metin alanı ve çeviri popover’ı">
              <Demo title="Basit">
                <TextBox
                  label="Başlık"
                  placeholder="Başlık girin"
                  value={baslik}
                  onChange={setBaslik}
                />
              </Demo>

              <Demo title="Temizle + sayaç">
                <TextBox
                  label="Açıklama"
                  placeholder="Kısa bir açıklama"
                  description="Listede bu metin görünür"
                  allowClear
                  showCharacterCount
                  maxLength={40}
                  value={aciklama}
                  onChange={setAciklama}
                />
              </Demo>

              <Demo title="Çok dilli">
                <TextBox
                  label="Ürün adı"
                  placeholder="Ürün adı"
                  languages={DILLER}
                  value={urunAdi}
                  onChange={setUrunAdi}
                  translations={urunCevirileri}
                  onTranslationsChange={setUrunCevirileri}
                />
              </Demo>

              <Demo title="Çok dilli + temizle + sayaç">
                <TextBox
                  label="Not"
                  placeholder="Not ekleyin"
                  allowClear
                  showCharacterCount
                  maxLength={60}
                  languages={DILLER}
                  value={notMetni}
                  onChange={setNotMetni}
                  translations={notCevirileri}
                  onTranslationsChange={setNotCevirileri}
                />
              </Demo>

              <Demo title="Salt okunur / hatalı">
                <Surface variant="transparent" className="flex w-full flex-col items-center gap-3">
                  <TextBox label="Kayıt no" value="#152356" isReadOnly />
                  <TextBox
                    label="E-posta"
                    value="ornek(at)site"
                    isInvalid
                    errorMessage="Geçerli bir e-posta girin"
                    allowClear
                  />
                </Surface>
              </Demo>
            </Slide>
          </Tabs.Panel>

          {/* ------------------------------ DataGrid ------------------------------ */}
          <Tabs.Panel id="table">
            <Slide title="DataGrid" subtitle="Filtre, sıralama, seçim ve satır içi düzenleme">
              {/* Widget kendi başlığını ve kartlarını kuruyor; üstüne bir kat daha eklemiyoruz */}
              <Surface variant="transparent" className="col-span-full min-w-0">
                <RequestsWidget table={table} />
              </Surface>
            </Slide>
          </Tabs.Panel>

          {/* ------------------------------ DataGrid2 (hep açık düzenleme) ------------------------------ */}
          <Tabs.Panel id="table2">
            <Slide title="DataGrid2" subtitle="Satır içi düzenleyiciler hep açık">
              <Surface variant="transparent" className="col-span-full min-w-0">
                <RequestsWidget table={table2} showEditorAlways />
              </Surface>
            </Slide>
          </Tabs.Panel>

          {/* ------------------------------ HeroUI temelleri ------------------------------ */}
          <Tabs.Panel id="basics">
            <Slide title="HeroUI temelleri" subtitle="Butonlar, sayaç ve anahtarlar">
              <Demo title="Butonlar">
                <Surface variant="transparent" className="flex flex-row flex-wrap gap-2">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="tertiary">Tertiary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="danger-soft">Danger Soft</Button>
                </Surface>
              </Demo>
              <Demo title="Sayaç">
                <Surface variant="transparent" className="flex flex-row items-center gap-3">
                  <Typography className="min-w-12 text-3xl font-semibold tabular-nums">
                    {count}
                  </Typography>
                  <Button
                    size="sm"
                    variant="primary"
                    onPress={() => setCount((c) => c + 1)}
                    aria-label="Artır"
                  >
                    +
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => setCount((c) => c - 1)}
                    aria-label="Azalt"
                  >
                    −
                  </Button>
                  <Button size="sm" variant="ghost" onPress={() => setCount(0)}>
                    Sıfırla
                  </Button>
                </Surface>
              </Demo>
              <Demo title="Metin alanı">
                <TextField value={name} onChange={setName} fullWidth aria-label="Metin alanı">
                  <Input />
                </TextField>
              </Demo>
              <Demo title="Anahtar">
                <Switch isSelected={notifications} onChange={setNotifications}>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                  <Switch.Content>Bildirimler</Switch.Content>
                </Switch>
              </Demo>
            </Slide>
          </Tabs.Panel>
        </Surface>
      </Tabs>
    </Surface>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Parçalar
 * ------------------------------------------------------------------------------------------------- */

/**
 * Slaydın gövdesi: demolar alt alta.
 *
 * Bilerek çerçevesiz. HeroUI'nin varsayılan (primary) alan arka planı `bg-surface`, Card'ınki de
 * öyle; kart içine alınca alanlar zemine karışıp görünmez oluyor.
 */
/**
 * Bir slayt = sunumda bir ekran.
 *
 * Başlık + kısa bir alt satır, altında örneklerin **ızgarası**. Örnekler tek sütunda alt alta
 * dizildiğinde slayt ekrana sığmıyor ve ortalanmış dar bileşenlerin solunda kocaman bir boşluk
 * kalıyordu; ızgara ikisini birden çözüyor.
 */
function Slide({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <Surface variant="transparent" className="flex w-full flex-col gap-5">
      <Surface variant="transparent" className="flex flex-col gap-1">
        <Typography type="h4" weight="semibold">
          {title}
        </Typography>
        {subtitle && (
          <Typography type="body-sm" color="muted">
            {subtitle}
          </Typography>
        )}
      </Surface>

      <Surface
        variant="transparent"
        className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3"
      >
        {children}
      </Surface>
    </Surface>
  )
}

/**
 * Tek bir örnek: kendi kartı.
 *
 * Kart `secondary` (hafif gri): alanların kendi zemini beyaz, beyaz kartta kayboluyorlardı.
 * Sayfa zemini de daha açık olduğu için kart hem sayfadan hem içindeki alanlardan ayrışıyor.
 */
function Demo({
  title,
  children,
  raw,
  full,
  bare,
}: {
  title: string
  children: ReactNode
  /** Format dizgelerinde büyük/küçük harf anlamlı (D ≠ d); başlığa uppercase uygulanmaz. */
  raw?: boolean
  /** Izgaranın tamamını kaplasın (tablo gibi geniş örnekler için). */
  full?: boolean
  /** İçerik kendi kartını kuruyorsa (DataGrid widget'ı) kart sarmalayıcısını atla. */
  bare?: boolean
}) {
  const baslik = (
    <Typography
      type="body-xs"
      weight="medium"
      color="muted"
      className={raw ? 'font-mono' : 'tracking-wide uppercase'}
      truncate
      title={title}
    >
      {title}
    </Typography>
  )

  if (bare) {
    return (
      <Surface variant="transparent" className="col-span-full flex w-full min-w-0 flex-col gap-2">
        {baslik}
        {children}
      </Surface>
    )
  }

  return (
    <Card
      variant="secondary"
      className={cn('min-w-0 gap-3 border border-border', full && 'col-span-full')}
    >
      <Card.Header>{baslik}</Card.Header>
      <Card.Content className="flex-1 flex-row flex-wrap items-center justify-center gap-3">
        {children}
      </Card.Content>
    </Card>
  )
}
