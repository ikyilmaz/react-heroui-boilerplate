import { useCallback, useState, type ReactNode } from 'react'
import {
  Button,
  Card,
  Chip,
  Input,
  Surface,
  Switch,
  Tabs,
  TextField,
  Toolbar,
  Typography,
  cn,
} from '@heroui/react'
import { CalendarDateTime, Time } from '@internationalized/date'
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  CalendarClock,
  CircleCheck,
  CircleDashed,
  CircleX,
  Hash,
  ListTree,
  Loader,
  Search,
  Sparkles,
  Table2,
  Type,
} from 'lucide-react'
import { Combobox, type ComboboxOption } from '@/components/Combobox'
import { DateTimePicker } from '@/components/DateTimePicker'
import { NumberBox } from '@/components/NumberBox'
import { TextBox } from '@/components/TextBox'
import { TimePicker } from '@/components/TimePicker'
import { Transfer, type TransferItem } from '@/components/Transfer'
import { TreeSelect, type TreeSelectNode } from '@/components/TreeSelect'
import { DataGridShowcase } from '@/pages/dataGridShowcase/DataGridShowcase'
import { useMediaQuery } from '@/synergy/shared/hooks'

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

/** TextBox çeviri örneği için diller; ilki ana alandır. */
const DILLER = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
]

/* -------------------------------------------------------------------------------------------------
 * Sayfa
 * ------------------------------------------------------------------------------------------------- */

export function ShowcasePage() {
  const [slide, setSlide] = useState(slides[0].id)
  // Dar ekranda dikey şerit paneli ~120px'e sıkıştırıyordu; orada şerit yatay ve kayar
  const wide = useMediaQuery('(min-width: 768px)')

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
  const [announcement, setAnnouncement] = useState('')

  const announce = useCallback((msg: string) => {
    // Aynı metin art arda gelirse ekran okuyucu tekrar okumaz; önce boşalt
    setAnnouncement('')
    requestAnimationFrame(() => setAnnouncement(msg))
  }, [])

  const [baslik, setBaslik] = useState('')
  const [aciklama, setAciklama] = useState('Talep formu')
  const [urunAdi, setUrunAdi] = useState('Kablosuz klavye')
  const [urunCevirileri, setUrunCevirileri] = useState<Record<string, string>>({
    en: 'Wireless keyboard',
  })
  const [notMetni, setNotMetni] = useState('')
  const [notCevirileri, setNotCevirileri] = useState<Record<string, string>>({})

  const index = slides.findIndex((s) => s.id === slide)
  const prev = index > 0 ? slides[index - 1] : null
  const next = index < slides.length - 1 ? slides[index + 1] : null

  const goTo = (target: SlideMeta) => setSlide(target.id)

  return (
    <Surface variant="transparent" className="flex flex-col gap-6">
      {/* Canlı bölge: tablo duyuruları */}
      <Typography role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </Typography>

      <Typography.Heading level={1}>Vitrin</Typography.Heading>

      {/* Dikey sekmeler: şerit solda, panel sağda; DOM sırası da liste → panel */}
      <Tabs
        orientation={wide ? 'vertical' : 'horizontal'}
        align="start"
        selectedKey={slide}
        onSelectionChange={(k) => setSlide(String(k))}
        className={cn('gap-6', wide && 'items-start')}
      >
        {/* Dikey şerit hiç kaymıyor, ama HeroUI'nin kaydırma düğmesi ilk ölçümden kalma bir
            boyamayla "HeroUI" sekmesinin altında görünüyordu; dikeyde düğmeler kapalı */}
        <Tabs.ListContainer className={cn(wide ? '[&>button]:hidden' : 'w-full')}>
          <Tabs.List aria-label="Bileşenler" className={cn(wide && 'w-48')}>
            {slides.map((s) => (
              <Tabs.Tab key={s.id} id={s.id} className="gap-2 whitespace-nowrap">
                <Tabs.Indicator />
                {s.icon}
                {s.label}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.ListContainer>

        <Surface variant="transparent" className="flex min-w-0 flex-1 flex-col gap-4">
          {/* `px-2` = Tabs.Panel'in dolgusu; çubuk slayt içeriğiyle aynı kenarlarda durur */}
          <Toolbar aria-label="Slayt gezinmesi" className="flex w-full px-2">
            <Chip size="sm" className="tabular-nums">
              {index + 1} / {slides.length}
            </Chip>
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              className="ml-auto"
              isDisabled={!prev}
              onPress={() => prev && goTo(prev)}
              aria-label="Önceki slayt"
            >
              <ArrowLeft size={16} aria-hidden />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              isIconOnly
              isDisabled={!next}
              onPress={() => next && goTo(next)}
              aria-label="Sonraki slayt"
            >
              <ArrowRight size={16} aria-hidden />
            </Button>
          </Toolbar>

          {/* ------------------------------ Genel Bakış ------------------------------ */}
          <Tabs.Panel id="overview">
            <Surface variant="transparent" className="flex flex-col gap-2">
              {slides.slice(1).map((s) => (
                <Card key={s.id} className="flex-row items-center border border-border py-3">
                  {s.icon}
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
                <TimePicker aria-label="Saat" value={time} onChange={setTime} />
              </Demo>
              <Demo title="Saat, saniyeli ve 5 dk adımlı">
                <TimePicker
                  aria-label="Saniyeli saat"
                  showSecond
                  minuteStep={5}
                  defaultValue={new Time(12, 25, 30)}
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
              {/* İki liste yan yana; yarım kartta başlıklar sıkışıyor */}
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
                <TextBox label="Kayıt no" value="#152356" isReadOnly />
                <TextBox
                  label="E-posta"
                  value="ornek(at)site"
                  isInvalid
                  errorMessage="Geçerli bir e-posta girin"
                  allowClear
                />
              </Demo>
            </Slide>
          </Tabs.Panel>

          {/* ------------------------------ DataGrid ------------------------------ */}
          <Tabs.Panel id="table">
            <Slide title="DataGrid" subtitle="DevExtreme API'li veri tablosu — örnekler">
              {/* Örnekler beyaz kartta (diğer bölümlerin kartlarıyla aynı çerçeve) */}
              <Card className="col-span-full min-w-0 border border-border bg-surface p-4 sm:p-5">
                <DataGridShowcase onAnnounce={announce} />
              </Card>
            </Slide>
          </Tabs.Panel>

          {/* ------------------------------ HeroUI temelleri ------------------------------ */}
          <Tabs.Panel id="basics">
            <Slide title="HeroUI temelleri" subtitle="Butonlar, sayaç ve anahtarlar">
              <Demo title="Butonlar">
                <Surface variant="transparent" className="flex flex-wrap gap-2">
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
                <Surface variant="transparent" className="flex items-center gap-3">
                  <Typography type="h3" className="min-w-8 tabular-nums">
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
                <TextField value={name} onChange={setName} aria-label="Metin alanı">
                  <Input />
                </TextField>
              </Demo>
              <Demo title="Anahtar">
                <Switch isSelected={notifications} onChange={setNotifications}>
                  <Switch.Content>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                    Bildirimler
                  </Switch.Content>
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

/** Bir slayt: başlık + alt satır, altında örneklerin ızgarası. */
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
    <Surface variant="transparent" className="flex flex-col gap-5">
      <Surface variant="transparent">
        <Typography type="h4" weight="semibold">
          {title}
        </Typography>
        {subtitle && (
          <Typography type="body-sm" color="muted">
            {subtitle}
          </Typography>
        )}
      </Surface>

      <Surface variant="transparent" className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {children}
      </Surface>
    </Surface>
  )
}

/** Tek bir örnek: beyaz kart; içindeki alanlar kartı doldurur (`*:w-full`). */
function Demo({
  title,
  children,
  raw,
  full,
}: {
  title: string
  children: ReactNode
  /** Format dizgelerinde büyük/küçük harf anlamlı (D ≠ d); başlığa uppercase uygulanmaz. */
  raw?: boolean
  /** Izgaranın tamamını kaplasın. */
  full?: boolean
}) {
  return (
    <Card className={cn('min-w-0 border border-border', full && 'col-span-full')}>
      <Card.Header>
        <Typography
          type="body-xs"
          weight="medium"
          color="muted"
          className={raw ? 'font-mono' : 'uppercase'}
          truncate
        >
          {title}
        </Typography>
      </Card.Header>
      <Card.Content className="gap-3 *:w-full">{children}</Card.Content>
    </Card>
  )
}
