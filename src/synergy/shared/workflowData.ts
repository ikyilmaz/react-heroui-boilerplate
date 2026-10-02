import type { LucideIcon } from 'lucide-react'
import {
  ArrowUpRight,
  BarChart3,
  BellRing,
  BookOpen,
  Car,
  Check,
  ClipboardCheck,
  CornerUpLeft,
  FileSignature,
  FileText,
  FolderOpen,
  Forward,
  GraduationCap,
  History,
  Inbox,
  Info,
  KeyRound,
  PenLine,
  Receipt,
  ShoppingCart,
  Timer,
  TreePalm,
  Users,
  Workflow,
  X,
} from 'lucide-react'

/* -------------------------------------------------------------------------------------------------
 * İş akışı maket verisi (Synergy WebInterface'in modeline göre)
 *
 * Sunucu yok; her şey burada, belirlenimci (deterministik) olarak üretiliyor. Orijinaldeki
 * kavramların karşılıkları:
 * - Kutular (`boxes`): wfManagement menüsü: beş kutu + "Geçmiş" altında Onaylar / Bilgi /
 *   Başlattığım İşler (modules/workflow/reducers/panelsReducer.ts). Etiketler tr_TR'den.
 * - Süreç grupları: wfList satırları ("proje – süreç" + talep sayısı).
 * - Talep satırları: wfProcessList ızgarası; sütunlar süreçten gelir (`columnsFor`).
 * - Tarih grupları: Bugün / Dün / Bu hafta / Geçen hafta / Bu ay / Geçen ay / Daha eski;
 *   gruplanan alan kutuya göre değişir (wfProcessList/helpers/itemGroup.ts).
 * - Olaylar (`FlowEvent`): akışın tanımladığı karar düğmeleri; sabit Onayla/Reddet yok.
 * - Akış tarihçesi, dokümanlar ve akış özellikleri: Flow Viewer başlığındaki açılır pencereler.
 * - Menü uygulamaları (`menuApps`): başlangıçtaki Favoriler / Son Kullanılan Uygulamalar.
 * Tarihler "şimdi"ye göre kaydırılıyor ki tarih grupları her zaman dolu olsun.
 * ------------------------------------------------------------------------------------------------- */

export interface Person {
  name: string
  department: string
}

export const CURRENT_USER: Person & { firstName: string; title: string } = {
  name: 'Fatma Tekin',
  firstName: 'Fatma',
  department: 'Operasyon',
  title: 'Operasyon Müdürü',
}

/** Maket: talep sahipleri, adım sahipleri ve yönlendirilecek kullanıcılar bu kişilerden seçilir. */
export const people: Person[] = [
  { name: 'Ahmet Yıldız', department: 'Muhasebe' },
  { name: 'Zeynep Kara', department: 'Pazarlama' },
  { name: 'Mert Demir', department: 'Üretim' },
  { name: 'Elif Aydın', department: 'Kalite' },
  { name: 'Burak Şahin', department: 'Satış' },
  { name: 'Selin Koç', department: 'İnsan Kaynakları' },
  { name: 'Emre Arslan', department: 'Bilgi Teknolojileri' },
  { name: 'Deniz Öztürk', department: 'Lojistik' },
]

/* -------------------------------------------------------------------------------------------------
 * Kutular
 * ------------------------------------------------------------------------------------------------- */

export type BoxId =
  | 'bekleyen'
  | 'baslattiklarim'
  | 'devam-eden'
  | 'bilgilendirmeler'
  | 'taslaklar'
  | 'gecmis-onaylar'
  | 'gecmis-bilgi'
  | 'gecmis-baslattiklarim'

/** Talebin tarih gruplamasında ve tarih aralığı süzgecinde kullanılan alanı. */
export type DateField = 'requestDate' | 'startDate' | 'createdAt'

export interface Box {
  id: BoxId
  /** Menüdeki ad (orijinal menü metni). */
  label: string
  /** Kutu açıldığındaki başlık (orijinal panel başlığı; ör. "Bekleyen İşler", "Onaylar (Geçmiş)"). */
  title: string
  icon: LucideIcon
  /** `main`: üstteki beş kutu; `gecmis`: "Geçmiş" başlığı altındaki alt kutular. */
  group: 'main' | 'gecmis'
  /** Tarih grupları ve tarih aralığı bu alana göre (RequestDate / ProcessStartDate / createdAt). */
  dateField: DateField
  /** Geçmiş kutusu: süreç listesinde Başlangıç / Bitiş Tarihi süzgeci var. */
  history: boolean
  /** Tarih aralığının varsayılanı: son kaç gün (yalnızca Geçmiş › Onaylar: 15). Yoksa aralık boş. */
  defaultRangeDays?: number
  /** Satırlarda hızlı onay menüsü ve ayrıntıda olay şeridi (yalnızca Bekleyen Onaylar). */
  decisions: boolean
  /** Satırlarda "Sil" (yalnızca Taslaklar). */
  draftDelete: boolean
}

export const boxes: Box[] = [
  { id: 'bekleyen', label: 'Bekleyen Onaylar', title: 'Bekleyen İşler', icon: Inbox, group: 'main', dateField: 'requestDate', history: false, decisions: true, draftDelete: false },
  { id: 'baslattiklarim', label: 'Başlattığım İşler', title: 'Başlattığım İşler', icon: ArrowUpRight, group: 'main', dateField: 'startDate', history: false, decisions: false, draftDelete: false },
  { id: 'devam-eden', label: 'Devam Eden İşler', title: 'Devam Eden İşler', icon: Timer, group: 'main', dateField: 'startDate', history: false, decisions: false, draftDelete: false },
  { id: 'bilgilendirmeler', label: 'Bilgilendirmeler', title: 'Bilgi', icon: BellRing, group: 'main', dateField: 'requestDate', history: false, decisions: false, draftDelete: false },
  { id: 'taslaklar', label: 'Taslaklar', title: 'Taslaklar', icon: PenLine, group: 'main', dateField: 'createdAt', history: false, decisions: false, draftDelete: true },
  { id: 'gecmis-onaylar', label: 'Onaylar', title: 'Onaylar (Geçmiş)', icon: History, group: 'gecmis', dateField: 'requestDate', history: true, defaultRangeDays: 15, decisions: false, draftDelete: false },
  { id: 'gecmis-bilgi', label: 'Bilgi', title: 'Bilgi (Geçmiş)', icon: Info, group: 'gecmis', dateField: 'requestDate', history: true, decisions: false, draftDelete: false },
  { id: 'gecmis-baslattiklarim', label: 'Başlattığım İşler', title: 'Başlattığım İşler (Geçmiş)', icon: FolderOpen, group: 'gecmis', dateField: 'startDate', history: true, decisions: false, draftDelete: false },
]

/** "Geçmiş" grubunun menü başlığı (tr_TR 101920). */
export const HISTORY_GROUP_LABEL = 'Geçmiş'

/** Üstteki beş kutu; başlangıçtaki kategori düğmeleri de bunlar (aynı sıra, aynı etiketler). */
export const mainBoxes = boxes.filter((b) => b.group === 'main')
export const historyBoxes = boxes.filter((b) => b.group === 'gecmis')

/** Başlangıçta "Tümünü Göster" yalnızca bu kategorilerde var (orijinal: Waiting ve Draft). */
export const SHOW_ALL_BOXES: readonly BoxId[] = ['bekleyen', 'taslaklar']

/* -------------------------------------------------------------------------------------------------
 * Süreçler, olaylar, sütunlar
 * ------------------------------------------------------------------------------------------------- */

export interface LineItem {
  name: string
  qty: number
  unit: string
  price: number
}

/**
 * Formdaki child form düğmesi (orijinalde form eylemi `OpenProcessArgs` / `OpenFormArgs`): düğme
 * formun içinde `after` alanının hemen ardında durur; basınca `id` talebi açılır.
 */
export interface ChildLink {
  /** Child talebin kimliği (`child-…`). */
  id: string
  /** Düğme metni ("Tedarikçi Teklifi Ekle"). */
  label: string
  /** Düğmenin ardına geldiği form alanı. */
  after: string
  /** Ekleme (yeni kayıt) mı, var olanı açma mı; ikon buna göre. */
  action: 'add' | 'open'
}

/**
 * Child formun panel boyutu (orijinalde dokümanın `viewOptions.panelSize`): ekran üç birimlik bir
 * şerit; 1 sağda üçte bir, 2 sağda üçte iki (açan form kalan yerde), 3 tam genişlik (yeni sekme).
 */
export type PanelSize = 1 | 2 | 3

/** Talebin formu: listede ve ayrıntıda gösterilen alanlar. */
interface RequestTemplate {
  /** Formun konu alanı ("Konu" sütunu ve ayrıntı başlığı). */
  title: string
  /** Form alanları; sürecin `columns` listesindeki anahtarlar burada bulunur. */
  fields: Record<string, string>
  /** Formdaki açıklama / gerekçe metni. */
  reason: string
  items?: LineItem[]
  /** Forma eklenmiş dosyalar (Dokümanlar penceresinde "dosya" olarak listelenir). */
  attachments?: string[]
  /** Formun içindeki child form düğmeleri (child'ın da child'ları olabilir). */
  children?: ChildLink[]
}

/**
 * Akışın tanımladığı olay (IFlowEvent). Yerleşik kimlikler orijinaldeki gibi: 4 Gönder, 5 Onayla,
 * 6 Reddet, 7 İptal, 9 Yönlendir, 10 Geri Gönder; 100 ve üstü akışa özel olaylar.
 */
export type EventKind = 'approve' | 'reject' | 'forward' | 'sendBack' | 'custom'

export interface FlowEvent {
  id: number
  /** Düğme metni. */
  description: string
  kind: EventKind
  icon: LucideIcon
  /** Şeritte birincil (siyah) düğme. */
  default?: boolean
  /** Önce onay penceresi: `confirmMessage` ya da `CONFIRM_MESSAGE`. */
  confirm: boolean
  confirmMessage?: string
  /** Sebep penceresi zorunlu: başlık `reasonTitle` ya da `REASON_TITLE`; boşsa `REASON_EMPTY`. */
  reason: boolean
  reasonTitle?: string
  /** Satırdaki hızlı onay menüsünde de görünür (FastApprovalEnabled). */
  fastApproval: boolean
  visible: boolean
  /** `false`: görünür ama devre dışı. */
  enable: boolean
}

/** Olay hattı metinleri (tr_TR). */
export const CONFIRM_MESSAGE = 'Devam etmek istediğinize emin misiniz?' // 100966
export const REASON_TITLE = 'Reddetme Nedeni' // 102664
export const REASON_EMPTY = 'Sebep alanı boş olamaz.' // 100744
export const FORWARD_LABEL = 'Yönlendirilecek Kullanıcı' // 102767
export const FORWARD_EMPTY = 'Yönlendirilecek kullanıcı seçilmedi' // 102768
export const DOCS_REQUIRED = 'İlerlemeden önce görüntülenmesi gereken dokümanlar var.' // 102435
export const DELETE_CONFIRM = 'Silmek istediğinize emin misiniz?' // 100653

/** Ortak olay kalıpları; süreçler bunları kendi metinleriyle çoğaltır. */
const approve = (over: Partial<FlowEvent> = {}): FlowEvent => ({
  id: 5, description: 'Onayla', kind: 'approve', icon: Check, default: true, confirm: true, reason: false, fastApproval: true, visible: true, enable: true, ...over,
})
const reject = (over: Partial<FlowEvent> = {}): FlowEvent => ({
  id: 6, description: 'Reddet', kind: 'reject', icon: X, confirm: true, reason: true, fastApproval: true, visible: true, enable: true, ...over,
})
const forward = (over: Partial<FlowEvent> = {}): FlowEvent => ({
  id: 9, description: 'Yönlendir', kind: 'forward', icon: Forward, confirm: false, reason: false, fastApproval: false, visible: true, enable: true, ...over,
})
const sendBack = (over: Partial<FlowEvent> = {}): FlowEvent => ({
  id: 10, description: 'Geri Gönder', kind: 'sendBack', icon: CornerUpLeft, confirm: true, reason: true, reasonTitle: 'Geri Gönderme Nedeni', fastApproval: false, visible: true, enable: true, ...over,
})

/** Sunucu yapısındaki alan tipi (EProcessStructureType'ın kullanılan kısmı). */
export type ColumnType = 'string' | 'number' | 'datetime' | 'status'

export interface Column {
  /** Satır değerinin anahtarı (`cellValue`). */
  key: string
  caption: string
  type: ColumnType
}

export interface Process {
  id: string
  /** Proje başlığı (wfList: "proje – süreç"). */
  project: string
  /** Süreç (akış) başlığı. */
  name: string
  /** Taslaklarda "Form" sütunu. */
  form: string
  icon: LucideIcon
  prefix: string
  steps: string[]
  /** Kullanıcının onay verdiği adımın indeksi. */
  approverStep: number
  /** Akışın olayları (Bekleyen Onaylar'da şerit ve hızlı onay menüsü bunlardan). */
  events: FlowEvent[]
  /** Süreçten gelen ek sütunlar: `template.fields` anahtarları. */
  columns: string[]
  /** İlk ek dosya ilerlemeden önce görüntülenmeli ("Görüntülenmesi gereken dokümanlar"). */
  mustViewFirstAttachment?: boolean
  /** Uygulama (paket) versiyonu. */
  packageVersion: number
  /** Child olarak açılınca panel boyutu (yoksa 1, orijinaldeki gibi). */
  panelSize?: PanelSize
  templates: RequestTemplate[]
}

const processes: Process[] = [
  {
    id: 'satin-alma',
    project: 'Satın Alma Yönetimi',
    name: 'Satın Alma Talebi',
    form: 'Satın Alma Talep Formu',
    icon: ShoppingCart,
    prefix: 'SAT',
    steps: ['Talep oluşturuldu', 'Bölüm yöneticisi onayı', 'Operasyon müdürü onayı', 'Satın alma değerlendirmesi', 'Finans onayı'],
    approverStep: 2,
    events: [approve(), reject(), sendBack({ description: 'Revizyon İste', reasonTitle: 'Revizyon Nedeni' }), forward()],
    columns: ['Toplam tutar', 'Maliyet merkezi', 'İstenen teslim'],
    mustViewFirstAttachment: true,
    packageVersion: 14,
    templates: [
      {
        title: 'Muhasebe ekibi için 6 adet dizüstü bilgisayar',
        fields: {
          'Toplam tutar': '₺325.800',
          'Maliyet merkezi': '1200 · Muhasebe',
          'Bütçe kalemi': 'BT Donanım 2026',
          'Bütçe kodu': 'BT-DON-2026-014',
          'Talep türü': 'Yenileme + yeni personel',
          'Kullanıcı sayısı': '8 kişi',
          'Tercih edilen tedarikçi': 'TeknoPlus Bilişim A.Ş.',
          'Alternatif tedarikçi': 'Bilişim A.Ş.',
          'Ödeme koşulu': '60 gün vadeli',
          'Para birimi': 'TRY',
          'Garanti beklentisi': '3 yıl yerinde servis',
          'Teslim yeri': 'Genel Müdürlük, 3. kat',
          'Teslim sorumlusu': 'Selin Aydın (BT Destek)',
          'İstenen teslim': '10 Ekim 2026',
          'Kurulum': 'BT ekibi imaj yükleyecek, masa başı kurulum tedarikçide',
          'Eski cihazların durumu': '4 adet envanterden düşülecek, veri imhası BT’de',
        },
        reason:
          'Ekipteki cihazların 4 tanesi 2019 alımı ve yıl sonu kapanış yoğunluğunda sık donma yaşanıyor; son üç ayda BT’ye 27 arıza kaydı açıldı ve iki kez kapanış raporları gecikti. Ekime katılacak 2 yeni personel için de cihaz gerekiyor. BT ekibinin önerdiği standart konfigürasyon seçildi; monitör, klavye-fare seti ve lisanslar tüm ekip (8 kişi) için tek seferde alınarak kurulum ve envanter işlemleri birleştirilecek. İki tedarikçiden teklif alındı; TeknoPlus teklifi toplamda %7 daha uygun ve 3 yıl yerinde servis içeriyor. Uzatılmış garanti, cihazların 4 yıllık kullanım planına göre eklendi.',
        items: [
          { name: 'Dizüstü bilgisayar 14" · i7 / 32 GB / 1 TB', qty: 6, unit: 'adet', price: 32_400 },
          { name: 'USB-C yerleştirme istasyonu', qty: 6, unit: 'adet', price: 3_400 },
          { name: '27" monitör', qty: 8, unit: 'adet', price: 4_800 },
          { name: 'Kablosuz klavye + fare seti', qty: 8, unit: 'set', price: 1_250 },
          { name: 'Dizüstü taşıma çantası', qty: 6, unit: 'adet', price: 850 },
          { name: 'Microsoft 365 İş Standart · 1 yıl', qty: 8, unit: 'lisans', price: 4_200 },
          { name: 'Uzatılmış garanti · 3 yıl yerinde servis', qty: 6, unit: 'adet', price: 2_900 },
          { name: 'Kurulum ve veri taşıma hizmeti', qty: 1, unit: 'hizmet', price: 6_500 },
        ],
        attachments: ['Teklif_TeknoPlus.pdf', 'Teklif_BilisimAS.pdf', 'BT_Konfigurasyon_Onerisi.docx'],
        children: [
          { id: 'child-tedarikci-teklif-0', label: 'Tedarikçi Teklifi Ekle', after: 'Tercih edilen tedarikçi', action: 'add' },
          { id: 'child-tedarikci-teklif-1', label: 'Alternatif Teklif Ekle', after: 'Alternatif tedarikçi', action: 'add' },
          { id: 'child-butce-kontrol-0', label: 'Bütçe Kontrolü Başlat', after: 'Bütçe kodu', action: 'add' },
        ],
      },
      {
        title: 'Depo forkliftleri için yıllık bakım hizmeti',
        fields: { 'Toplam tutar': '₺38.500', 'Maliyet merkezi': '3400 · Lojistik', 'Bütçe kalemi': 'Bakım Onarım', 'Teslim yeri': 'Gebze Depo', 'İstenen teslim': '1 Ekim 2026', 'Sözleşme süresi': '12 ay' },
        reason: 'Mevcut bakım sözleşmesi 30 Eylül’de bitiyor. Üç tedarikçiden teklif alındı; en uygun teklif mevcut firmadan geldi ve yanıt süresi 4 saatten 2 saate indirildi.',
        items: [
          { name: 'Periyodik bakım (3 ayda bir) · 4 forklift', qty: 4, unit: 'dönem', price: 7_250 },
          { name: 'Acil müdahale paketi', qty: 1, unit: 'yıl', price: 9_500 },
        ],
        attachments: ['Karsilastirma_Tablosu.xlsx'],
        children: [{ id: 'child-bakim-sozlesmesi-0', label: 'Mevcut Sözleşmeyi Aç', after: 'Sözleşme süresi', action: 'open' }],
      },
      {
        title: 'Toplantı odası video konferans seti',
        fields: { 'Toplam tutar': '₺62.000', 'Maliyet merkezi': '1000 · Genel Yönetim', 'Bütçe kalemi': 'Ofis Donanım', 'Teslim yeri': 'Genel Müdürlük, Boğaz toplantı odası', 'İstenen teslim': '15 Ekim 2026' },
        reason: 'Hibrit toplantılarda ses ve görüntü kalitesi yetersiz; müşteri sunumlarında sorun yaşandı. Kamera, tavan mikrofonu ve ekran paylaşım cihazı tek pakette alınacak.',
        items: [{ name: 'Video konferans seti (kamera + mikrofon + hub)', qty: 1, unit: 'set', price: 62_000 }],
        attachments: ['Teklif_AVSistem.pdf'],
      },
      {
        title: 'Ekim ayı ofis sarf malzemesi',
        fields: { 'Toplam tutar': '₺8.740', 'Maliyet merkezi': '1000 · Genel Yönetim', 'Bütçe kalemi': 'Kırtasiye', 'Teslim yeri': 'Genel Müdürlük', 'İstenen teslim': '1 Ekim 2026' },
        reason: 'Aylık rutin sarf malzemesi siparişi. Toner tüketimi yıl sonu raporları nedeniyle geçen aya göre arttı.',
        items: [
          { name: 'A4 fotokopi kâğıdı (koli)', qty: 20, unit: 'koli', price: 245 },
          { name: 'Toner · siyah', qty: 6, unit: 'adet', price: 640 },
        ],
      },
    ],
  },
  {
    id: 'izin',
    project: 'İnsan Kaynakları',
    name: 'Yıllık İzin Talebi',
    form: 'İzin Talep Formu',
    icon: TreePalm,
    prefix: 'IZN',
    steps: ['Talep oluşturuldu', 'Yönetici onayı', 'İK kontrolü'],
    approverStep: 1,
    events: [approve({ confirm: false }), reject()],
    columns: ['İzin türü', 'Başlangıç', 'Bitiş'],
    packageVersion: 7,
    templates: [
      {
        title: '5 gün yıllık izin',
        fields: { 'İzin türü': 'Yıllık ücretli izin', 'Başlangıç': '7 Ekim 2026 Pazartesi', 'Bitiş': '11 Ekim 2026 Cuma', 'Kalan hak': '14 gün → 9 gün', 'Vekil': 'Burak Şahin' },
        reason: 'Aile ziyareti için planlanmış izin. Açık işler vekile devredildi, müşteri görüşmeleri izin sonrasına alındı.',
      },
      {
        title: 'Yarım gün mazeret izni',
        fields: { 'İzin türü': 'Mazeret izni', 'Başlangıç': '26 Eylül 2026 13:00', 'Bitiş': '26 Eylül 2026 18:00', 'Kalan hak': '—', 'Vekil': 'Gerekmiyor' },
        reason: 'Tapu dairesinde randevu.',
      },
      {
        title: 'Babalık izni',
        fields: { 'İzin türü': 'Babalık izni (yasal)', 'Başlangıç': '25 Eylül 2026', 'Bitiş': '1 Ekim 2026', 'Kalan hak': 'Yıllık izinden düşülmez', 'Vekil': 'Deniz Öztürk' },
        reason: 'Doğum raporu ektedir.',
        attachments: ['Dogum_Raporu.pdf'],
      },
    ],
  },
  {
    id: 'masraf',
    project: 'Finans',
    name: 'Masraf Bildirimi',
    form: 'Masraf Bildirim Formu',
    icon: Receipt,
    prefix: 'MSR',
    steps: ['Bildirim oluşturuldu', 'Yönetici onayı', 'Muhasebe kontrolü', 'Ödeme'],
    approverStep: 1,
    events: [
      approve(),
      reject(),
      { id: 101, description: 'Eksik Belge', kind: 'sendBack', icon: CornerUpLeft, confirm: false, reason: true, reasonTitle: 'Eksik Belge Açıklaması', fastApproval: false, visible: true, enable: true },
    ],
    columns: ['Toplam tutar', 'Seyahat tarihi', 'Ödeme şekli'],
    packageVersion: 9,
    templates: [
      {
        title: 'İzmir müşteri ziyareti · ulaşım ve konaklama',
        fields: { 'Toplam tutar': '₺7.420', 'Seyahat tarihi': '16–18 Eylül 2026', 'Proje / müşteri': 'Ege Gıda A.Ş. yıllık değerlendirme', 'Ödeme şekli': 'Şirket kartı', 'Fiş sayısı': '6' },
        reason: 'Yıllık hizmet değerlendirme toplantısı ve fabrika ziyareti.',
        items: [
          { name: 'Uçak bileti (gidiş-dönüş)', qty: 1, unit: 'kişi', price: 3_180 },
          { name: 'Otel · 2 gece', qty: 2, unit: 'gece', price: 1_650 },
          { name: 'Araç kiralama', qty: 1, unit: 'gün', price: 940 },
        ],
        attachments: ['Fisler_Izmir.pdf'],
        children: [{ id: 'child-masraf-fisi-0', label: 'Fiş Detaylarını Aç', after: 'Fiş sayısı', action: 'open' }],
      },
      {
        title: 'Fuar standı ekip yemekleri',
        fields: { 'Toplam tutar': '₺3.180', 'Seyahat tarihi': '12–14 Eylül 2026', 'Proje / müşteri': 'WIN Eurasia Fuarı', 'Ödeme şekli': 'Kişisel · iade', 'Fiş sayısı': '5' },
        reason: 'Fuar süresince stant ekibinin (4 kişi) öğle ve akşam yemekleri.',
        attachments: ['Fisler_Fuar.pdf'],
      },
      {
        title: 'Eylül ayı taksi ve otopark giderleri',
        fields: { 'Toplam tutar': '₺1.265', 'Seyahat tarihi': 'Eylül 2026', 'Proje / müşteri': 'Çeşitli müşteri ziyaretleri', 'Ödeme şekli': 'Kişisel · iade', 'Fiş sayısı': '11' },
        reason: 'İstanbul içi müşteri ziyaretleri.',
      },
      {
        title: 'ISO 9001 semineri kayıt ücreti',
        fields: { 'Toplam tutar': '₺4.500', 'Seyahat tarihi': '3 Ekim 2026', 'Proje / müşteri': 'Kalite ekibi gelişim planı', 'Ödeme şekli': 'Şirket kartı', 'Fiş sayısı': '1' },
        reason: 'Yıllık eğitim planında yer alan seminer; erken kayıt indirimi 30 Eylül’de bitiyor.',
      },
    ],
  },
  {
    id: 'sozlesme',
    project: 'Hukuk',
    name: 'Sözleşme Onayı',
    form: 'Sözleşme Onay Formu',
    icon: FileSignature,
    prefix: 'SZL',
    steps: ['Taslak hazırlandı', 'Hukuk incelemesi', 'Operasyon müdürü onayı', 'Genel müdür imzası'],
    approverStep: 2,
    events: [
      approve({ description: 'Uygun Görüldü', fastApproval: false, confirmMessage: 'Sözleşme genel müdür imzasına gönderilecek. Devam etmek istediğinize emin misiniz?' }),
      sendBack({ description: 'Revizyon İste', reasonTitle: 'Revizyon Nedeni' }),
      reject({ fastApproval: false }),
      { id: 102, description: 'Hukuka Tekrar Gönder', kind: 'custom', icon: CornerUpLeft, confirm: true, reason: false, fastApproval: false, visible: true, enable: false },
    ],
    columns: ['Karşı taraf', 'Sözleşme türü', 'Bedel'],
    mustViewFirstAttachment: true,
    packageVersion: 5,
    templates: [
      {
        title: 'Bulut sunucu hizmeti yenileme · 12 ay',
        fields: { 'Karşı taraf': 'Nimbus Bulut Hizmetleri A.Ş.', 'Sözleşme türü': 'Hizmet alım · yenileme', 'Bedel': '₺486.000 / yıl', 'Süre': '1 Kasım 2026 – 31 Ekim 2027', 'Fesih bildirimi': '60 gün' },
        reason: 'Mevcut sözleşme 31 Ekim’de sona eriyor. Fiyat artışı %18 ile enflasyonun altında kaldı; SLA %99,9’dan %99,95’e yükseltildi.',
        attachments: ['Sozlesme_Taslak_v3.docx', 'Hukuk_Gorusu.pdf'],
        children: [{ id: 'child-hukuk-gorusu-0', label: 'Hukuk Görüşü Ekle', after: 'Sözleşme türü', action: 'add' }],
      },
      {
        title: 'Temizlik hizmet sözleşmesi ek protokolü',
        fields: { 'Karşı taraf': 'Parlak Tesis Yönetimi Ltd.', 'Sözleşme türü': 'Ek protokol', 'Bedel': '+2 personel', 'Süre': 'Mevcut sözleşme sonuna kadar', 'Fesih bildirimi': '30 gün' },
        reason: 'Yeni açılan Ar-Ge katı için iki ek temizlik personeli.',
        attachments: ['Ek_Protokol.docx'],
      },
    ],
  },
  {
    id: 'dokuman-revizyon',
    project: 'Kalite Yönetim Sistemi',
    name: 'Doküman Revizyon Onayı',
    form: 'Doküman Revizyon Formu',
    icon: FileText,
    prefix: 'DOK',
    steps: ['Revizyon hazırlandı', 'Süreç sahibi onayı', 'Kalite birimi kontrolü', 'Yayın'],
    approverStep: 1,
    events: [approve(), reject(), forward()],
    columns: ['Doküman türü', 'Yeni revizyon', 'Dağıtım'],
    packageVersion: 11,
    templates: [
      {
        title: 'PR-KAL-012 Tedarikçi Değerlendirme Prosedürü',
        fields: { 'Doküman türü': 'Prosedür', 'Yeni revizyon': 'Rev. 04', 'Mevcut revizyon': 'Rev. 03 · 12 Mart 2025', 'Değişiklik özeti': 'Puanlama kriterlerine sürdürülebilirlik eklendi', 'Dağıtım': 'Satın Alma, Kalite, Üretim' },
        reason: 'Müşteri denetiminde tedarikçilerin çevresel performansının da değerlendirilmesi istendi. Puanlama %10 ağırlıkla yeni kriteri içeriyor.',
        attachments: ['PR-KAL-012_Rev04.docx', 'Degisiklik_Karsilastirma.pdf'],
      },
      {
        title: 'TL-URT-031 Kalıp Değişim Talimatı',
        fields: { 'Doküman türü': 'Talimat', 'Yeni revizyon': 'Rev. 02', 'Mevcut revizyon': 'Rev. 01 · 4 Ocak 2026', 'Değişiklik özeti': 'SMED çalışması sonrası adımlar sadeleştirildi', 'Dağıtım': 'Üretim' },
        reason: 'Kalıp değişim süresi 42 dakikadan 18 dakikaya indirildi; talimat yeni sıralamaya göre güncellendi.',
        attachments: ['TL-URT-031_Rev02.pdf'],
      },
      {
        title: 'FR-IK-007 İşe Giriş Formu',
        fields: { 'Doküman türü': 'Form', 'Yeni revizyon': 'Rev. 05', 'Mevcut revizyon': 'Rev. 04 · 20 Haziran 2025', 'Değişiklik özeti': 'KVKK aydınlatma metni güncellendi', 'Dağıtım': 'İnsan Kaynakları' },
        reason: 'Güncel KVKK aydınlatma metni forma eklendi, kullanılmayan alanlar çıkarıldı.',
      },
    ],
  },
  {
    id: 'dof',
    project: 'Kalite Yönetim Sistemi',
    name: 'Düzeltici Faaliyet (DÖF)',
    form: 'DÖF Formu',
    icon: ClipboardCheck,
    prefix: 'DOF',
    steps: ['Uygunsuzluk kaydı', 'Kök neden analizi', 'Faaliyet planı onayı', 'Etkinlik doğrulama'],
    approverStep: 2,
    events: [
      approve({ description: 'Planı Onayla' }),
      reject({ description: 'Planı Reddet', reasonTitle: 'Ret Gerekçesi' }),
      sendBack({ description: 'Kök Nedeni Yeniden İncele', reasonTitle: 'İnceleme Notu' }),
    ],
    columns: ['Kaynak', 'Kök neden', 'Hedef tarih'],
    packageVersion: 6,
    templates: [
      {
        title: 'Müşteri şikâyeti #2291 · ambalaj hasarı',
        fields: { 'Kaynak': 'Müşteri şikâyeti', 'Müşteri': 'Anadolu Market Zinciri', 'Kök neden': 'Palet streç sarımı yetersiz', 'Hedef tarih': '15 Ekim 2026' },
        reason: 'Son iki sevkiyatta 38 kolide ezilme tespit edildi. Sarım makinesinin gerginlik ayarı standart dışı; operatör eğitimi ve günlük kontrol listesi öneriliyor.',
        attachments: ['Sikayet_Fotograflari.zip', '5Neden_Analizi.pdf'],
        children: [{ id: 'child-kok-neden-0', label: 'Kök Neden Analizini Aç', after: 'Kök neden', action: 'open' }],
      },
      {
        title: 'İç denetim bulgusu · kalibrasyon kaydı eksik',
        fields: { 'Kaynak': 'İç denetim · Eylül 2026', 'Müşteri': '—', 'Kök neden': 'Kalibrasyon takvimi manuel izleniyor', 'Hedef tarih': '31 Ekim 2026' },
        reason: '3 adet kumpasın kalibrasyon sertifikası süresi geçmiş. Takvimin sistemde otomatik hatırlatmalı izlenmesi öneriliyor.',
      },
    ],
  },
  {
    id: 'egitim',
    project: 'İnsan Kaynakları',
    name: 'Eğitim Talebi',
    form: 'Eğitim Talep Formu',
    icon: GraduationCap,
    prefix: 'EGT',
    steps: ['Talep oluşturuldu', 'Yönetici onayı', 'İK bütçe kontrolü'],
    approverStep: 1,
    events: [approve(), reject()],
    columns: ['Eğitim kurumu', 'Tarih', 'Ücret'],
    packageVersion: 3,
    templates: [
      {
        title: 'ISO 27001 İç Denetçi Eğitimi',
        fields: { 'Eğitim kurumu': 'Standart Akademi', 'Tarih': '21–23 Ekim 2026', 'Ücret': '₺12.900', 'Katılım': 'Çevrim içi', 'Sertifika': 'Var' },
        reason: 'Bilgi güvenliği iç denetim ekibine ikinci denetçi kazandırmak için.',
      },
    ],
  },
  {
    id: 'arac',
    project: 'İdari İşler',
    name: 'Araç Tahsis Talebi',
    form: 'Araç Tahsis Formu',
    icon: Car,
    prefix: 'ARC',
    steps: ['Talep oluşturuldu', 'Yönetici onayı', 'İdari işler planlaması'],
    approverStep: 1,
    events: [approve({ confirm: false }), reject()],
    columns: ['Güzergâh', 'Tarih', 'Yolcu sayısı'],
    packageVersion: 4,
    templates: [
      {
        title: 'Bursa tesis ziyareti için havuz aracı',
        fields: { 'Güzergâh': 'İstanbul → Bursa OSB → İstanbul', 'Tarih': '26 Eylül 2026, 07:30–19:00', 'Yolcu sayısı': '3', 'Sürücü': 'Talep eden' },
        reason: 'Yeni hat devreye alma toplantısı.',
      },
    ],
  },
  {
    id: 'yetki',
    project: 'Bilgi Teknolojileri',
    name: 'Yazılım Erişim Yetkisi',
    form: 'Erişim Yetkisi Formu',
    icon: KeyRound,
    prefix: 'YTK',
    steps: ['Talep oluşturuldu', 'Yönetici onayı', 'Uygulama sahibi onayı', 'BT tanımlama'],
    approverStep: 1,
    events: [approve(), reject(), forward()],
    columns: ['Uygulama', 'Yetki rolü', 'Süre'],
    packageVersion: 8,
    templates: [
      {
        title: 'ERP finans modülü okuma yetkisi',
        fields: { 'Uygulama': 'ERP · Finans (FI)', 'Yetki rolü': 'Raporlama · salt okuma', 'Süre': 'Süresiz', 'Gerekçe türü': 'Görev değişikliği' },
        reason: 'Bütçe takip raporlarını doğrudan sistemden alabilmek için.',
      },
      {
        title: 'Saha ekibi için VPN erişimi',
        fields: { 'Uygulama': 'Kurumsal VPN', 'Yetki rolü': 'Standart kullanıcı', 'Süre': '3 ay', 'Gerekçe türü': 'Proje' },
        reason: 'Bursa tesisindeki devreye alma projesinde çalışan ekip merkez sistemlere erişecek.',
      },
    ],
  },
]

/** "Proje – Süreç" başlığı (wfList satırı ve süreç talepleri panelinin başlığı). */
export function processCaption(p: Process) {
  return `${p.project} – ${p.name}`
}

/** Kutudaki başlık: taslaklar forma göre listelenir (sekmelerde de form adı var). */
export function boxProcessCaption(box: Box, p: Process) {
  return box.id === 'taslaklar' ? `${p.project} – ${p.form}` : processCaption(p)
}

/* -------------------------------------------------------------------------------------------------
 * Talepler
 * ------------------------------------------------------------------------------------------------- */

/** Sunucunun durum açıklaması (status.description). */
export type RequestStatus = 'Onay bekliyor' | 'Devam ediyor' | 'Tamamlandı' | 'Reddedildi' | 'Taslak'

/** Akış tarihçesindeki kayıt tipi (FlowHistoryRequestType'ın kullanılan kısmı). */
type HistoryType = 'starter' | 'approver' | 'notify' | 'end'

export interface HistoryEntry {
  id: string
  /** Adım açıklaması. */
  step: string
  type: HistoryType
  /** Adımın sahibi (approverDescription); `end` kaydında yok. */
  approver?: Person
  /** `delegated`: adımı `actioner` vekaleten yanıtladı ("Vekaleten", tr_TR 102921). */
  actionerType: 'self' | 'delegated'
  actioner?: Person
  /** İstek tarihi. */
  requestDate: Date
  /** Cevap tarihi; yoksa adım "Bekliyor" (tr_TR 102874). */
  responseDate?: Date
  /** Verilen olayın metni ("Onayla", "Reddet", "Gönder"...). */
  eventText?: string
  /** Sebep (varsa açılır pencerede). */
  reason?: string
}

export interface WorkRequest {
  id: string
  /** Talebin listelendiği kutu (ayrıntı adresi `/is-akislari/:box/:processId/:id`). */
  box: BoxId
  /** Form numarası (ör. SAT-2026-0412). */
  no: string
  /** Süreç No (ProcessId). */
  processNo: number
  processId: string
  template: RequestTemplate
  /** Başlatan (StarterUser). */
  requester: Person
  /** ProcessStartDate. */
  startDate: Date
  /** RequestDate: talebin bu kutunun sahibine (kullanıcıya) geldiği an. */
  requestDate: Date
  /** Taslak oluşturma tarihi (taslaklarda anlamlı; diğerlerinde `startDate`). */
  createdAt: Date
  /** Geçmiş kutularında kullanıcının yanıt / akışın bitiş tarihi. */
  responseDate?: Date
  /** Başlangıçtaki okunma durumu (IsRead); güncel değer için `useReadIds` / `isRead`. */
  read: boolean
  status: RequestStatus
  /** Akışın şu anki adımının indeksi (`process.steps`); akış bittiyse `steps.length`. */
  step: number
  /** Uygulama Versiyonu. */
  packageVersion: number
  /** Akış tarihçesi (eskiden yeniye). Karar verilince `withDecision` ile uzatılır. */
  history: HistoryEntry[]
}

/** Maket: her kutuda hangi süreçten kaç talep olduğu. */
const boxContents: Record<BoxId, Partial<Record<string, number>>> = {
  bekleyen: { 'satin-alma': 12, izin: 9, masraf: 12, sozlesme: 6, 'dokuman-revizyon': 9, dof: 6, egitim: 3, arac: 3, yetki: 6 },
  baslattiklarim: { 'satin-alma': 6, masraf: 9, egitim: 3, yetki: 3 },
  'devam-eden': { 'satin-alma': 9, sozlesme: 6, dof: 6, 'dokuman-revizyon': 3 },
  bilgilendirmeler: { sozlesme: 3, 'dokuman-revizyon': 6, 'satin-alma': 3, izin: 3 },
  taslaklar: { 'satin-alma': 3, masraf: 6, izin: 3 },
  'gecmis-onaylar': { 'satin-alma': 12, izin: 9, masraf: 15, 'dokuman-revizyon': 6, yetki: 6 },
  'gecmis-bilgi': { sozlesme: 6, 'dokuman-revizyon': 6, 'satin-alma': 3 },
  'gecmis-baslattiklarim': { 'satin-alma': 6, masraf: 9, izin: 6, egitim: 3 },
}

/** Maket verisinin "şimdi"si; talep tarihleri buna göre kaydırılır. */
const NOW = Date.now()
const HOUR = 3_600_000
const DAY = 24 * HOUR

/**
 * Talep yaşları (saat). Yedi tarih grubunun (Bugün … Daha eski) hepsine ve Geçmiş › Onaylar'ın
 * varsayılan 15 günlük aralığının hem içine hem dışına düşecek şekilde seçildi.
 */
const ages = [1.5, 5, 9, 27, 33, 60, 100, 170, 250, 420, 700, 1_100, 1_650]

const REASONS_REJECT = [
  'Bütçe bu çeyrekte uygun değil; gelecek dönem yeniden değerlendirilsin.',
  'Teklif karşılaştırması eksik, en az iki teklif daha eklenmeli.',
  'Aynı dönem için başka bir talep onaylandı.',
]

/** Adımın sahibi: 0. adım talep sahibi; kullanıcının adımı kullanıcı; diğerleri maket kişiler. */
function stepOwner(p: Process, requester: Person, step: number, mine: boolean, seed: number): Person {
  if (step === 0) return requester
  if (mine && step === p.approverStep) return CURRENT_USER
  const candidates = people.filter((x) => x.name !== requester.name)
  return candidates[(seed * 3 + step * 5) % candidates.length]
}

/**
 * Tarihçe: talep oluşturuldu (Gönder) → tamamlanan adımlar (Onayla) → şu anki adım (Bekliyor)
 * ya da akış bitti. Adımlar `startDate` ile `current` (şu anki adıma geliş) arasına eşit yayılır.
 */
function buildHistory(
  p: Process,
  r: Pick<WorkRequest, 'id' | 'requester' | 'startDate' | 'requestDate' | 'step' | 'status' | 'responseDate'>,
  opts: { mine: boolean; seed: number; notify: boolean },
): HistoryEntry[] {
  const out: HistoryEntry[] = []
  const ended = r.status === 'Tamamlandı' || r.status === 'Reddedildi'
  const rejected = r.status === 'Reddedildi'
  // Son hareketin zamanı: bitmişse yanıt tarihi, sürüyorsa şu anki adıma geliş
  const last = (ended ? r.responseDate : r.requestDate) ?? r.requestDate
  const doneUntil = rejected ? r.step : Math.min(r.step, p.steps.length) // bu indekse kadar (hariç) onaylanmış
  const span = Math.max(1, rejected ? r.step + 1 : doneUntil)
  const at = (i: number) => new Date(r.startDate.getTime() + ((last.getTime() - r.startDate.getTime()) * i) / span)

  for (let i = 0; i < p.steps.length; i++) {
    const owner = stepOwner(p, r.requester, i, opts.mine, opts.seed)
    const base = { id: `${r.id}-h${i}`, step: p.steps[i], approver: owner, actionerType: 'self' as const }
    if (i === 0) {
      out.push({ ...base, type: 'starter', requestDate: r.startDate, responseDate: r.startDate, eventText: 'Gönder' })
      continue
    }
    if (i < doneUntil) {
      // Maket: her beşinci talepte ilk onay adımı vekaleten yanıtlanmış
      const delegated = i === 1 && opts.seed % 5 === 0
      out.push({
        ...base,
        type: 'approver',
        ...(delegated && { actionerType: 'delegated' as const, actioner: people[(opts.seed + 4) % people.length] }),
        requestDate: at(i),
        responseDate: at(i + 1),
        eventText: 'Onayla',
      })
      continue
    }
    if (i === r.step && rejected) {
      out.push({ ...base, type: 'approver', requestDate: at(i), responseDate: last, eventText: 'Reddet', reason: REASONS_REJECT[opts.seed % REASONS_REJECT.length] })
      break
    }
    if (i === r.step && !ended) {
      out.push({ ...base, type: 'approver', requestDate: r.requestDate })
    }
    break
  }
  if (opts.notify) {
    out.push({ id: `${r.id}-hn`, step: 'Bilgilendirme', type: 'notify', approver: CURRENT_USER, actionerType: 'self', requestDate: r.requestDate, responseDate: r.requestDate })
  }
  if (ended) out.push({ id: `${r.id}-he`, step: 'Akış sonlandı', type: 'end', actionerType: 'self', requestDate: last, responseDate: last })
  return out
}

function build(box: BoxId): WorkRequest[] {
  const list: WorkRequest[] = []
  let seq = 0
  const boxIndex = boxes.findIndex((b) => b.id === box)
  for (const p of processes) {
    const n = boxContents[box][p.id] ?? 0
    for (let i = 0; i < n; i++, seq++) {
      const seed = boxIndex * 31 + seq
      const template = p.templates[i % p.templates.length]
      const age = ages[(seq + i * 2 + boxIndex) % ages.length] * HOUR + i * 7 * HOUR
      const anchor = new Date(NOW - age)
      const mine = box === 'baslattiklarim' || box === 'taslaklar' || box === 'gecmis-baslattiklarim'
      const requester = mine ? { name: CURRENT_USER.name, department: CURRENT_USER.department } : people[(seq * 3 + i) % people.length]
      const len = p.steps.length

      let step: number
      let status: RequestStatus
      let startDate: Date
      let requestDate: Date
      let responseDate: Date | undefined
      switch (box) {
        case 'bekleyen':
          step = p.approverStep
          status = 'Onay bekliyor'
          requestDate = anchor
          startDate = new Date(anchor.getTime() - step * 18 * HOUR)
          break
        case 'baslattiklarim':
        case 'devam-eden':
          step = 1 + ((seq + i) % (len - 1))
          status = 'Devam ediyor'
          startDate = anchor
          requestDate = new Date(anchor.getTime() + (NOW - anchor.getTime()) * 0.4)
          break
        case 'bilgilendirmeler':
          step = Math.min(p.approverStep + 1, len)
          status = step >= len ? 'Tamamlandı' : 'Devam ediyor'
          requestDate = anchor
          startDate = new Date(anchor.getTime() - step * 20 * HOUR)
          if (step >= len) responseDate = anchor
          break
        case 'taslaklar':
          step = 0
          status = 'Taslak'
          startDate = requestDate = anchor
          break
        case 'gecmis-onaylar': {
          // Kullanıcının adımı yanıtlanmış; her dördüncüsü reddedilmiş, kalanlar sonraki adımda ya da bitmiş
          const rejected = seq % 4 === 3
          requestDate = anchor
          startDate = new Date(anchor.getTime() - p.approverStep * 18 * HOUR)
          responseDate = new Date(Math.min(NOW - HOUR / 2, anchor.getTime() + 6 * HOUR))
          step = rejected ? p.approverStep : p.approverStep + 1
          status = rejected ? 'Reddedildi' : step >= len ? 'Tamamlandı' : 'Devam ediyor'
          break
        }
        case 'gecmis-bilgi':
          step = len
          status = 'Tamamlandı'
          requestDate = anchor
          startDate = new Date(anchor.getTime() - len * 20 * HOUR)
          responseDate = anchor
          break
        case 'gecmis-baslattiklarim': {
          const rejected = seq % 3 === 2
          startDate = anchor
          requestDate = anchor
          responseDate = new Date(Math.min(NOW - HOUR / 2, anchor.getTime() + len * 22 * HOUR))
          step = rejected ? 1 : len
          status = rejected ? 'Reddedildi' : 'Tamamlandı'
          break
        }
      }

      const id = `${box}-${p.id}-${i}`
      const partial = { id, requester, startDate, requestDate, step, status, responseDate }
      // Geçmiş › Onaylar'da "şu anki adıma geliş" kullanıcının yanıtıdır
      const historyBase = box === 'gecmis-onaylar' && status === 'Devam ediyor' ? { ...partial, requestDate: responseDate! } : partial
      list.push({
        id,
        box,
        no: `${p.prefix}-2026-${String(412 + seq * 37 + i * 11 + boxIndex * 5).padStart(4, '0')}`,
        processNo: 20_000 + boxIndex * 1_000 + seq * 13 + i,
        processId: p.id,
        template,
        requester,
        startDate,
        requestDate,
        createdAt: startDate,
        ...(responseDate && { responseDate }),
        // Maket: yalnızca bekleyen ve bilgilendirme kutularında okunmamış talepler var
        read: box === 'bekleyen' || box === 'bilgilendirmeler' ? (seq + i) % 3 !== 0 : true,
        status,
        step,
        packageVersion: p.packageVersion,
        history:
          box === 'taslaklar'
            ? []
            : buildHistory(p, historyBase, {
                mine: box === 'bekleyen' || box === 'gecmis-onaylar',
                seed,
                notify: box === 'bilgilendirmeler' || box === 'gecmis-bilgi',
              }),
      })
    }
  }
  return list
}

const cache = new Map<BoxId, WorkRequest[]>()

/**
 * Kutunun ham (sunucudan gelmiş gibi) talepleri; kararlar, silinen taslaklar ve okunma bu listeye
 * yansımaz. Arayüzde bunun yerine `decisions.ts › useBoxRequests` kullanılır.
 */
export function requestsOf(box: BoxId): WorkRequest[] {
  if (!cache.has(box)) cache.set(box, build(box))
  return cache.get(box)!
}

/* -------------------------------------------------------------------------------------------------
 * Child süreçler (maket): bir formdan açılan talepler. Kutu listelerinde görünmezler; yalnızca
 * parent formdaki bağlantıyla açılırlar (`childrenOf`). Hepsi kullanıcının onayını bekler.
 * ------------------------------------------------------------------------------------------------- */

const childProcesses: Process[] = [
  {
    id: 'tedarikci-teklif',
    project: 'Satın Alma Yönetimi',
    name: 'Tedarikçi Teklifi',
    form: 'Tedarikçi Teklif Formu',
    icon: Receipt,
    prefix: 'TKL',
    steps: ['Teklif girildi', 'Satın alma kontrolü', 'Satın alma müdürü onayı'],
    approverStep: 2,
    events: [approve(), reject(), sendBack({ description: 'Revizyon İste', reasonTitle: 'Revizyon Nedeni' }), forward()],
    columns: ['Tedarikçi', 'Teklif tutarı'],
    packageVersion: 6,
    panelSize: 2,
    templates: [
      {
        title: 'TeknoPlus teklifi · 6 adet dizüstü bilgisayar',
        fields: {
          Tedarikçi: 'TeknoPlus Bilişim A.Ş.',
          'Teklif no': 'TP-2026-0918',
          'Teklif tarihi': '18 Eylül 2026',
          'Geçerlilik tarihi': '18 Ekim 2026',
          'Teklif tutarı': '₺325.800',
          'Ödeme koşulu': '60 gün vadeli',
          'Teslim süresi': '10 iş günü',
          'Para birimi': 'TRY',
        },
        reason: 'Fiyatlara kurulum ve eski cihazlardan veri taşıma dahildir. Teslimat tek seferde Genel Müdürlük adresine yapılacaktır.',
        items: [
          { name: 'Dizüstü bilgisayar 14" · i7 / 32 GB / 1 TB', qty: 6, unit: 'adet', price: 32_400 },
          { name: '27" monitör', qty: 8, unit: 'adet', price: 4_800 },
          { name: 'Uzatılmış garanti · 3 yıl yerinde servis', qty: 6, unit: 'adet', price: 2_900 },
        ],
        attachments: ['Teklif_TeknoPlus.pdf'],
        children: [
          { id: 'child-tedarikci-karti-0', label: 'Tedarikçi Kartını Aç', after: 'Tedarikçi', action: 'open' },
          { id: 'child-teklif-kalemi-0', label: 'Kalem Detayı Ekle', after: 'Teslim süresi', action: 'add' },
        ],
      },
      {
        title: 'Bilişim A.Ş. teklifi · 6 adet dizüstü bilgisayar',
        fields: {
          Tedarikçi: 'Bilişim A.Ş.',
          'Teklif no': 'BA-26-4471',
          'Teklif tarihi': '19 Eylül 2026',
          'Geçerlilik tarihi': '3 Ekim 2026',
          'Teklif tutarı': '₺350.600',
          'Ödeme koşulu': '30 gün vadeli',
          'Teslim süresi': '15 iş günü',
          'Para birimi': 'TRY',
        },
        reason: 'Kurulum hizmeti teklife dahil değildir; ayrıca fiyatlandırılacaktır.',
        attachments: ['Teklif_BilisimAS.pdf'],
      },
    ],
  },
  {
    id: 'teklif-kalemi',
    project: 'Satın Alma Yönetimi',
    name: 'Teklif Kalemi Detayı',
    form: 'Teklif Kalemi Detay Formu',
    icon: ClipboardCheck,
    prefix: 'TKD',
    steps: ['Kalem girildi', 'Teknik uygunluk onayı'],
    approverStep: 1,
    events: [approve(), reject(), forward()],
    columns: ['Kalem', 'Birim fiyat'],
    packageVersion: 3,
    panelSize: 3,
    templates: [
      {
        title: 'ThinkPad T14 Gen 5 · teknik uygunluk',
        fields: {
          Kalem: 'Dizüstü bilgisayar 14"',
          Marka: 'Lenovo',
          Model: 'ThinkPad T14 Gen 5',
          İşlemci: 'Intel Core i7-1365U',
          Bellek: '32 GB',
          Disk: '1 TB SSD',
          Ekran: '14" WUXGA IPS',
          Garanti: '3 yıl yerinde servis',
          Adet: '6',
          'Birim fiyat': '₺32.400',
        },
        reason: 'Konfigürasyon BT standardıyla uyumlu; imaj ve cihaz yönetimi yazılımı destekleniyor.',
      },
    ],
  },
  {
    id: 'tedarikci-karti',
    project: 'Satın Alma Yönetimi',
    name: 'Tedarikçi Kartı',
    form: 'Tedarikçi Kartı Formu',
    icon: Users,
    prefix: 'TDK',
    steps: ['Kart güncellendi', 'Tedarikçi onayı'],
    approverStep: 1,
    events: [approve(), reject(), forward()],
    columns: ['Unvan', 'Tedarikçi puanı'],
    packageVersion: 4,
    panelSize: 1,
    templates: [
      {
        title: 'TeknoPlus Bilişim · kart güncelleme',
        fields: {
          Unvan: 'TeknoPlus Bilişim Teknolojileri A.Ş.',
          'Vergi dairesi': 'Kozyatağı',
          'Vergi no': '8410293756',
          Yetkili: 'Murat Kılıç',
          Telefon: '0216 555 18 40',
          Adres: 'Ataşehir, İstanbul',
          'Çalışma başlangıcı': '12 Mart 2021',
          'Tedarikçi puanı': '4,6 / 5',
        },
        reason: 'Yetkili kişi ve telefon bilgisi güncellendi.',
      },
    ],
  },
  {
    id: 'butce-kontrol',
    project: 'Finans',
    name: 'Bütçe Kontrolü',
    form: 'Bütçe Kontrol Formu',
    icon: BarChart3,
    prefix: 'BTK',
    steps: ['Kontrol başlatıldı', 'Bütçe sorumlusu onayı'],
    approverStep: 1,
    events: [approve(), reject(), forward()],
    columns: ['Bütçe kalemi', 'Talep sonrası kalan'],
    packageVersion: 9,
    panelSize: 1,
    templates: [
      {
        title: 'BT Donanım 2026 · bütçe uygunluğu',
        fields: {
          'Bütçe kalemi': 'BT Donanım 2026',
          'Yıllık bütçe': '₺1.200.000',
          Harcanan: '₺612.400',
          'Bu talep': '₺325.800',
          'Talep sonrası kalan': '₺261.800',
          'Bütçe sorumlusu': 'Kerem Aksoy',
        },
        reason: 'Talep yıllık bütçe içinde kalıyor; kalan tutar yıl sonu yenilemeleri için yeterli.',
      },
    ],
  },
  {
    id: 'bakim-sozlesmesi',
    project: 'Satın Alma Yönetimi',
    name: 'Bakım Sözleşmesi',
    form: 'Bakım Sözleşmesi Formu',
    icon: FileSignature,
    prefix: 'BKS',
    steps: ['Sözleşme açıldı', 'Lojistik müdürü onayı'],
    approverStep: 1,
    events: [approve(), reject(), forward()],
    columns: ['Yüklenici', 'Bitiş tarihi'],
    packageVersion: 5,
    panelSize: 3,
    templates: [
      {
        title: 'Forklift periyodik bakım sözleşmesi · 2025–2026',
        fields: {
          Yüklenici: 'Marmara İstif Makineleri Ltd.',
          'Sözleşme no': 'LJS-2025-014',
          'Başlangıç tarihi': '1 Ekim 2025',
          'Bitiş tarihi': '30 Eylül 2026',
          Kapsam: '4 forklift · 3 ayda bir periyodik bakım',
          'Müdahale süresi': '4 saat',
          'Yıllık bedel': '₺34.200',
          Yenileme: 'Yazılı bildirimle 12 ay',
        },
        reason: 'Geçen dönemde 4 periyodik bakım ve 2 acil müdahale yapıldı; arıza kaynaklı duruş toplam 9 saat.',
        attachments: ['Bakim_Sozlesmesi_2025.pdf'],
      },
    ],
  },
  {
    id: 'masraf-fisi',
    project: 'Finans',
    name: 'Masraf Fişi',
    form: 'Masraf Fişi Formu',
    icon: Receipt,
    prefix: 'FIS',
    steps: ['Fiş girildi', 'Muhasebe kontrolü'],
    approverStep: 1,
    events: [approve(), reject(), forward()],
    columns: ['Fiş türü', 'Tutar'],
    packageVersion: 2,
    panelSize: 1,
    templates: [
      {
        title: 'İzmir ziyareti · 6 fiş',
        fields: {
          'Fiş türü': 'Ulaşım ve konaklama',
          Tutar: '₺7.420',
          'KDV dahil': 'Evet',
          'Fiş adedi': '6',
          'Belge tarihleri': '16–18 Eylül 2026',
        },
        reason: 'Uçak bileti, iki gece otel ve bir günlük araç kiralama fişleri. Otel faturası şirket unvanına kesildi.',
        attachments: ['Fisler_Izmir.pdf'],
      },
    ],
  },
  {
    id: 'hukuk-gorusu',
    project: 'Hukuk',
    name: 'Hukuk Görüşü',
    form: 'Hukuk Görüşü Formu',
    icon: BookOpen,
    prefix: 'HKG',
    steps: ['Görüş istendi', 'Hukuk müşaviri değerlendirmesi'],
    approverStep: 1,
    events: [approve(), reject(), sendBack({ description: 'Revizyon İste', reasonTitle: 'Revizyon Nedeni' }), forward()],
    columns: ['Risk düzeyi', 'Hazırlayan'],
    packageVersion: 7,
    panelSize: 2,
    templates: [
      {
        title: 'Nimbus bulut hizmet sözleşmesi · hukuki değerlendirme',
        fields: {
          Sözleşme: 'Bulut sunucu hizmeti yenileme · 12 ay',
          Hazırlayan: 'Av. Deniz Arslan',
          'Risk düzeyi': 'Düşük',
          'Uygulanacak hukuk': 'Türk hukuku · İstanbul mahkemeleri',
          'Kişisel veri': 'KVKK ek protokolü imzalanacak',
          'Sorumluluk sınırı': 'Yıllık bedelin %100’ü',
          Fesih: '60 gün önceden yazılı bildirim',
          'Önerilen değişiklik': 'SLA ihlalinde hizmet kredisi maddesi',
        },
        reason: 'Taslak v3 şirket standartlarına genel olarak uygun. SLA ihlalinde hizmet kredisinin kendiliğinden uygulanması ve verilerin fesihten sonra 30 gün içinde iadesi maddelerinin eklenmesi önerilir.',
        attachments: ['Hukuk_Gorusu.pdf'],
      },
    ],
  },
  {
    id: 'kok-neden',
    project: 'Kalite Yönetim Sistemi',
    name: 'Kök Neden Analizi',
    form: 'Kök Neden Analizi Formu',
    icon: ClipboardCheck,
    prefix: 'KNA',
    steps: ['Analiz başlatıldı', 'Kalite müdürü onayı'],
    approverStep: 1,
    events: [approve(), reject(), forward()],
    columns: ['Yöntem', 'Sorumlu'],
    packageVersion: 4,
    panelSize: 2,
    templates: [
      {
        title: 'Ambalaj hasarı · 5 Neden analizi',
        fields: {
          Yöntem: '5 Neden',
          Sorumlu: 'Sevkiyat ve bakım ekibi',
          '1. Neden': 'Kolilerde ezilme',
          '2. Neden': 'Paletler taşımada kaydı',
          '3. Neden': 'Streç sarım gevşek',
          '4. Neden': 'Sarım makinesinin gerginliği düşük',
          '5. Neden': 'Günlük ayar kontrolü tanımlı değil',
          'Önerilen faaliyet': 'Günlük kontrol listesi ve operatör eğitimi',
        },
        reason: 'Analiz sevkiyat ve bakım ekibiyle yapıldı. Sarım makinesinin gerginlik ayarı bakım sonrasında standart değere getirilmemiş.',
        attachments: ['5Neden_Analizi.pdf'],
      },
    ],
  },
]

let childCache: WorkRequest[] | null = null

/** Child talepler: her child süreç şablonundan bir talep (`child-<süreç>-<şablon>`), onay bekler. */
function childRequests(): WorkRequest[] {
  if (childCache) return childCache
  childCache = childProcesses.flatMap((p, pi) =>
    p.templates.map((template, i) => {
      const seq = pi * 3 + i
      const id = `child-${p.id}-${i}`
      const requester = people[(seq * 5 + 2) % people.length]
      const requestDate = new Date(NOW - (3 + seq * 4) * HOUR)
      const startDate = new Date(requestDate.getTime() - p.approverStep * 10 * HOUR)
      const step = p.approverStep
      const status: RequestStatus = 'Onay bekliyor'
      return {
        id,
        box: 'bekleyen' as BoxId,
        no: `${p.prefix}-2026-${String(1180 + seq * 23).padStart(4, '0')}`,
        processNo: 28_000 + seq * 7,
        processId: p.id,
        template,
        requester,
        startDate,
        requestDate,
        createdAt: startDate,
        read: true,
        status,
        step,
        packageVersion: p.packageVersion,
        history: buildHistory(p, { id, requester, startDate, requestDate, step, status }, { mine: true, seed: seq, notify: false }),
      }
    }),
  )
  return childCache
}


export function findBox(id: string | undefined) {
  return boxes.find((b) => b.id === id)
}

export function findProcess(id: string | undefined) {
  return processes.find((p) => p.id === id) ?? childProcesses.find((p) => p.id === id)
}

export function processOf(r: WorkRequest): Process {
  return findProcess(r.processId)!
}

/** Child olarak açılacak talebin panel boyutu (sürecinde yoksa 1). */
export function panelSizeOf(id: string): PanelSize {
  const r = findRequest(id)
  return (r && processOf(r).panelSize) || 1
}

/** Kimliğe göre ham talep (tüm kutularda; kimliğin öneki kutuyu söyler). */
export function findRequest(id: string | undefined): WorkRequest | undefined {
  if (!id) return undefined
  if (id.startsWith('child-')) return childRequests().find((r) => r.id === id)
  // Uzun önekler önce: "gecmis-baslattiklarim-..." "baslattiklarim-..." ile karışmasın
  const box = [...boxes].sort((a, b) => b.id.length - a.id.length).find((b) => id.startsWith(`${b.id}-`))
  return box ? requestsOf(box.id).find((r) => r.id === id) : undefined
}

/** Talebin ayrıntı adresi (kutusu `r.box`). */
export function requestHref(r: WorkRequest) {
  return `/is-akislari/${r.box}/${r.processId}/${r.id}`
}

/** Kutu ve süreç adresleri. */
export const boxHref = (box: BoxId) => `/is-akislari/${box}`
export const processHref = (box: BoxId, processId: string) => `/is-akislari/${box}/${processId}`

/**
 * Ayrıntı sayfasına listeden gidilirken `navigate(href, { state })` ile verilen gezinme listesi:
 * Geri / İleri bu kimlikler arasında dolaşır (orijinal: yüklenen satırlar gezinme listesi olur).
 * Yoksa ayrıntı sayfası aynı kutu + süreçteki talepleri kullanır.
 */
export interface DetailNavState {
  ids: string[]
}

/** Talebin kutusuna göre tarih alanı (gruplama ve tarih aralığı için). */
export function dateOf(r: WorkRequest, box: Box = findBox(r.box)!): Date {
  return r[box.dateField]
}

/* -------------------------------------------------------------------------------------------------
 * Sütunlar
 * ------------------------------------------------------------------------------------------------- */

/** Taslakların sabit sütunları (useProcessListColumns: Proje adı / Form / Süreç / Oluşturma tarihi / Uygulama Versiyonu). */
const draftColumns: Column[] = [
  { key: 'projectCaption', caption: 'Proje adı', type: 'string' },
  { key: 'formCaption', caption: 'Form', type: 'string' },
  { key: 'flowCaption', caption: 'Süreç', type: 'string' },
  { key: 'createdAt', caption: 'Oluşturma tarihi', type: 'datetime' },
  { key: 'projectPackageVersion', caption: 'Uygulama Versiyonu', type: 'number' },
]

/**
 * Süreç talepleri ızgarasının sütunları. Orijinalde sunucu süreç yapısından gelir; maket:
 * Süreç No, Konu, sürecin kendi alanları, Başlatan, kutunun tarih alanı, (geçmişte) Cevap Tarihi, Durum.
 */
export function columnsFor(box: Box, p: Process): Column[] {
  if (box.id === 'taslaklar') return draftColumns
  const cols: Column[] = [
    { key: 'ProcessId', caption: 'Süreç No', type: 'number' },
    { key: 'Subject', caption: 'Konu', type: 'string' },
    ...p.columns.map((c): Column => ({ key: c, caption: c, type: 'string' })),
    { key: 'StarterUser', caption: 'Başlatan', type: 'string' },
    box.dateField === 'startDate'
      ? { key: 'ProcessStartDate', caption: 'Başlangıç Tarihi', type: 'datetime' }
      : { key: 'RequestDate', caption: 'İstek tarihi', type: 'datetime' },
  ]
  if (box.history) cols.push({ key: 'ResponseDate', caption: 'Cevap Tarihi', type: 'datetime' })
  cols.push({ key: 'status', caption: 'Durum', type: 'status' })
  return cols
}

/** Hücre değeri (tarih sütunlarında `Date`; boşsa `null`, gösterimde "-"). */
export function cellValue(r: WorkRequest, key: string): string | number | Date | null {
  const p = processOf(r)
  switch (key) {
    case 'ProcessId':
      return r.processNo
    case 'Subject':
      return r.template.title
    case 'StarterUser':
      return r.requester.name
    case 'ProcessStartDate':
      return r.startDate
    case 'RequestDate':
      return r.requestDate
    case 'ResponseDate':
      return r.responseDate ?? null
    case 'status':
      return r.status
    case 'projectCaption':
      return p.project
    case 'formCaption':
      return p.form
    case 'flowCaption':
      return p.name
    case 'createdAt':
      return r.createdAt
    case 'projectPackageVersion':
      return r.packageVersion
    default:
      return r.template.fields[key] ?? null
  }
}

/* -------------------------------------------------------------------------------------------------
 * Tarih grupları (itemGroup.ts): kovalar öncelik sırasıyla birbirinden kesilir
 * ------------------------------------------------------------------------------------------------- */

type DateBucket = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'older'

export const dateBuckets: { id: DateBucket; label: string }[] = [
  { id: 'today', label: 'Bugün' },
  { id: 'yesterday', label: 'Dün' },
  { id: 'thisWeek', label: 'Bu hafta' },
  { id: 'lastWeek', label: 'Geçen hafta' },
  { id: 'thisMonth', label: 'Bu ay' },
  { id: 'lastMonth', label: 'Geçen ay' },
  { id: 'older', label: 'Daha eski' },
]

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Kova başlangıçları (Türkçe yerel ayar: hafta pazartesi başlar). */
function bucketStarts(now = new Date()): [DateBucket, Date][] {
  const today = startOfDay(now)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const week = new Date(today)
  week.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const lastWeek = new Date(week)
  lastWeek.setDate(week.getDate() - 7)
  const month = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  return [
    ['today', today],
    ['yesterday', yesterday],
    ['thisWeek', week],
    ['lastWeek', lastWeek],
    ['thisMonth', month],
    ['lastMonth', lastMonth],
  ]
}

/**
 * Tarihin kovası. Öncelikli kovanın içinde kalan geniş kova satır sahiplenmez (ör. pazartesi
 * "Bu hafta" boş kalır, dünkü satır "Dün"de görünür).
 */
export function dateBucket(d: Date, now = new Date()): DateBucket {
  let claimedFrom: Date | null = null
  for (const [key, start] of bucketStarts(now)) {
    if (claimedFrom && start >= claimedFrom) continue
    if (d >= start && (!claimedFrom || d < claimedFrom)) return key
    claimedFrom = start
  }
  return 'older'
}

/** Satırları kovalara ayırır; boş kovalar atlanır, sıra `dateBuckets` sırasıdır. */
export function groupByDate<T>(rows: T[], dateOfRow: (row: T) => Date): { bucket: (typeof dateBuckets)[number]; rows: T[] }[] {
  const map = new Map<DateBucket, T[]>()
  for (const row of rows) {
    const k = dateBucket(dateOfRow(row))
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(row)
  }
  return dateBuckets.filter((b) => map.has(b.id)).map((bucket) => ({ bucket, rows: map.get(bucket.id)! }))
}

/* -------------------------------------------------------------------------------------------------
 * Süreç grupları (wfList / başlangıçtaki "Proje / Süreç" listesi): arama, sıralama, tarih aralığı
 * ------------------------------------------------------------------------------------------------- */

export type SortField = 'project' | 'flow' | 'form' | 'date' | 'count'
export type SortDirection = 'ascending' | 'descending'

/** Kutuya göre sıralama alanları (WorkflowPanelHeader / SortBy). */
export function sortFieldsFor(box: Box): { id: SortField; label: string }[] {
  if (box.id === 'taslaklar') {
    return [
      { id: 'date', label: 'Oluşturma tarihi' },
      { id: 'project', label: 'Proje Başlığı' },
      { id: 'flow', label: 'Süreç Başlığı' },
      { id: 'form', label: 'Form Başlığı' },
      { id: 'count', label: 'Taslak Sayısı' },
    ]
  }
  return [
    { id: 'project', label: 'Proje Başlığı' },
    { id: 'flow', label: 'Süreç Başlığı' },
    { id: 'date', label: 'İstek tarihi' },
    { id: 'count', label: 'Talep Sayısı' },
  ]
}

/** Sıralama metinleri (tr_TR 104087, 104057, 104060, 101723, 101724). */
export const SORT_LABELS = { title: 'Sıralama', field: 'Sıralama alanı', direction: 'Yön', ascending: 'Artan', descending: 'Azalan' } as const
/** Varsayılan sıralama: tarih, azalan. */
export const DEFAULT_SORT: { field: SortField; direction: SortDirection } = { field: 'date', direction: 'descending' }

/** Başlangıç / Bitiş Tarihi (tr_TR 100995 / 100996); uçlar dahil, gün bazında. */
export interface DateRange {
  start: Date | null
  end: Date | null
}

/** Kutunun varsayılan aralığı: Geçmiş › Onaylar son 15 gün, diğerleri sınırsız. */
export function defaultRange(box: Box): DateRange {
  if (!box.defaultRangeDays) return { start: null, end: null }
  const end = new Date()
  end.setHours(23, 59, 59, 999)
  const start = startOfDay(new Date(Date.now() - box.defaultRangeDays * DAY))
  return { start, end }
}

export function inRange(d: Date, range: DateRange | undefined) {
  if (!range) return true
  return (!range.start || d >= range.start) && (!range.end || d <= range.end)
}

export interface ProcessGroup {
  process: Process
  /** "Talep Sayısı" / "Taslak Sayısı". */
  count: number
  /** Gruptaki en yeni tarih (kutunun tarih alanına göre). */
  latest: Date
  requests: WorkRequest[]
}

/** Süreç aramada eşleşiyor mu: proje ve süreç başlığında, Türkçe küçük harfle alt dize. */
function matchesProcess(p: Process, q: string) {
  const needle = q.trim().toLocaleLowerCase('tr')
  if (!needle) return true
  return [p.project, p.name, p.form].some((s) => s.toLocaleLowerCase('tr').includes(needle))
}

/**
 * Kutunun taleplerinden süreç grupları: tarih aralığı (geçmiş kutuları), arama ve sıralama.
 * Boş gruplar dönmez. `requests` genelde `useBoxRequests(box.id)`'den gelir.
 */
export function processGroups(
  box: Box,
  requests: WorkRequest[],
  opts: { search?: string; sort?: { field: SortField; direction: SortDirection }; range?: DateRange } = {},
): ProcessGroup[] {
  const sort = opts.sort ?? DEFAULT_SORT
  const groups: ProcessGroup[] = []
  for (const p of processes) {
    if (!matchesProcess(p, opts.search ?? '')) continue
    const rs = requests.filter((r) => r.processId === p.id && inRange(dateOf(r, box), opts.range))
    if (!rs.length) continue
    const latest = new Date(Math.max(...rs.map((r) => dateOf(r, box).getTime())))
    groups.push({ process: p, count: rs.length, latest, requests: rs })
  }
  const text = (g: ProcessGroup) => (sort.field === 'project' ? g.process.project : sort.field === 'form' ? g.process.form : g.process.name)
  groups.sort((a, b) => {
    const d =
      sort.field === 'count'
        ? a.count - b.count
        : sort.field === 'date'
          ? a.latest.getTime() - b.latest.getTime()
          : text(a).localeCompare(text(b), 'tr')
    return sort.direction === 'ascending' ? d : -d
  })
  return groups
}

/* -------------------------------------------------------------------------------------------------
 * Flow Viewer: olaylar, dokümanlar, akış özellikleri
 * ------------------------------------------------------------------------------------------------- */

/**
 * Talepte kullanılabilir olaylar (görünür olanlar; `enable: false` olanlar devre dışı çizilir).
 * Yalnızca Bekleyen Onaylar'daki talepler için dolu; diğer kutularda ayrıntı salt okunur.
 */
export function eventsFor(r: WorkRequest): FlowEvent[] {
  if (r.box !== 'bekleyen') return []
  return processOf(r).events.filter((e) => e.visible)
}

/** Satırdaki hızlı onay menüsü: FastApprovalEnabled && Visible (devre dışılar da listelenir). */
export function fastApprovalEvents(r: WorkRequest): FlowEvent[] {
  return eventsFor(r).filter((e) => e.fastApproval)
}

export function findEvent(r: WorkRequest, eventId: number): FlowEvent | undefined {
  return processOf(r).events.find((e) => e.id === eventId)
}

/** Yönlendirilebilecek kullanıcılar (GetForwardingMembers maketi). */
export function forwardCandidates(r: WorkRequest): Person[] {
  return people.filter((x) => x.name !== r.requester.name)
}

export interface FlowDocument {
  /** Doküman No. */
  id: number
  name: string
  /** `form`: akışın formu; `file`: ek dosya. */
  kind: 'form' | 'file'
  /** "Görüntülenmesi gereken dokümanlar" grubunda; görüntülenmeden olay verilemez. */
  mustView: boolean
}

/** Doküman metinleri (tr_TR). */
export const DOCUMENT_LABELS = {
  title: 'Dokümanlar', // 100190
  mustView: 'Görüntülenmesi gereken dokümanlar', // 103760
  other: 'Diğer Dokümanlar', // 103796
  no: 'Doküman No', // 100749
  empty: 'Hiç Doküman Yok', // 100750
} as const

/** Talebin dokümanları: önce form, sonra ek dosyalar. */
export function documentsOf(r: WorkRequest): FlowDocument[] {
  const p = processOf(r)
  const base = r.processNo * 10
  const docs: FlowDocument[] = [{ id: base, name: p.form, kind: 'form', mustView: false }]
  ;(r.template.attachments ?? []).forEach((name, i) =>
    docs.push({ id: base + i + 1, name, kind: 'file', mustView: !!p.mustViewFirstAttachment && i === 0 && r.box === 'bekleyen' }),
  )
  return docs
}

export interface FlowProperty {
  name: string
  /** Boşsa `null` (gösterimde "-"). */
  value: string | null
}

/** Akış özellikleri (GetProcessProperties maketi; sıra orderNo). */
export function propertiesOf(r: WorkRequest): FlowProperty[] {
  const p = processOf(r)
  const current = r.step < p.steps.length && r.status !== 'Taslak' ? p.steps[r.step] : null
  return [
    { name: 'Süreç No', value: String(r.processNo) },
    { name: 'Form No', value: r.no },
    { name: 'Proje', value: p.project },
    { name: 'Süreç', value: p.name },
    { name: 'Başlatan', value: r.requester.name },
    { name: 'Birim', value: r.requester.department },
    { name: 'Başlangıç Tarihi', value: formatDateTime(r.startDate) },
    { name: 'Durum', value: r.status },
    { name: 'Bulunduğu adım', value: current },
    { name: 'Bitiş Tarihi', value: r.status === 'Tamamlandı' || r.status === 'Reddedildi' ? formatDateTime(r.responseDate ?? r.requestDate) : null },
    { name: 'Uygulama Versiyonu', value: String(r.packageVersion) },
  ]
}

/** Flow Viewer metinleri (tr_TR). */
export const VIEWER_LABELS = {
  properties: 'Akış özellikleri', // 100063
  propertiesEmpty: 'Akış Bilgilerine Ulaşılamadı!', // 100748
  history: 'Akış Tarihçesi', // 100757
  showFullHistory: 'Tüm Tarihçeyi Göster', // 100760
  waiting: 'Bekliyor', // 102874
  delegated: 'Vekaleten', // 102921
  reason: 'Sebep', // 100083
  requestDate: 'İstek tarihi', // 100084
  responseDate: 'Cevap Tarihi', // 100762
  prev: 'Geri', // 102994
  next: 'İleri', // 102993
  processes: 'Süreçler', // 102316
} as const

/* -------------------------------------------------------------------------------------------------
 * Menü uygulamaları: Favoriler / Son Kullanılan Uygulamalar (RecentApps)
 * ------------------------------------------------------------------------------------------------- */

export interface MenuApp {
  id: string
  caption: string
  /** Yoksa kart baş harfleri (`initials`) ve `avatarColor` ile çizilir. */
  icon?: LucideIcon
  /** Uygulamanın adresi; sayfası olmayanlar `/uygulamalar/:id` ("Yakında"). */
  href: string
  /** Başlangıçta favori mi (sunucudaki pinned). Güncel değer için `useMenuApps`. */
  pinned: boolean
}

const app = (id: string, caption: string, pinned: boolean, icon?: LucideIcon, href = `/uygulamalar/${id}`): MenuApp => ({
  id,
  caption,
  pinned,
  href,
  ...(icon && { icon }),
})

/** Son kullanılan menü öğeleri, en yeni önce (orijinal ilk 20'yi gösterir). */
export const menuApps: MenuApp[] = [
  app('is-akis-yonetimi', 'İş Akış Yönetimi', true, Workflow, '/is-akislari/bekleyen'),
  app('satin-alma-talebi', 'Satın Alma Talebi', true, ShoppingCart),
  app('izin-talebi', 'Yıllık İzin Talebi', false, TreePalm),
  app('masraf-bildirimi', 'Masraf Bildirimi', true, Receipt),
  app('tedarikci-listesi', 'Tedarikçi Listesi', false),
  app('personel-rehberi', 'Personel Rehberi', true, Users),
  app('butce-takip', 'Bütçe Takip Raporu', false, BarChart3),
  app('kalite-dokumanlari', 'Kalite Dokümanları', false, BookOpen),
  app('toplanti-odasi', 'Toplantı Odası Rezervasyonu', false),
  app('arac-tahsis', 'Araç Tahsis Talebi', false, Car),
  app('stok-raporu', 'Stok Durum Raporu', false),
  app('egitim-katalogu', 'Eğitim Kataloğu', false, GraduationCap),
]

export const RECENT_LIMIT = 20

export function findApp(id: string | undefined) {
  return menuApps.find((a) => a.id === id)
}

/** Başlangıç metinleri (tr_TR). */
export const APPS_LABELS = {
  favorites: 'Favoriler', // 100862
  recent: 'Son Kullanılan Uygulamalar', // 102974
  pin: 'Favorilere Ekle', // 101195
  unpin: 'Favorilerden Kaldır', // 101170
} as const

/* -------------------------------------------------------------------------------------------------
 * Biçimlendirme yardımcıları
 * ------------------------------------------------------------------------------------------------- */

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase('tr'))
    .join('')
}

const avatarColors = ['success', 'accent', 'default'] as const

/** Avatar rengi isme göre sabit seçilir; aynı kişi her yerde aynı renkte. */
export function avatarColor(name: string): (typeof avatarColors)[number] {
  return avatarColors[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length]
}

export const tl = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })

const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })

/** Göreli zaman ("3 saat önce", "dün"); ipucunda `formatDateTime` ile tam tarih verilir. */
export function relative(date: Date) {
  const h = (date.getTime() - Date.now()) / HOUR
  if (Math.abs(h) < 1) return 'az önce'
  if (Math.abs(h) < 24) return rtf.format(Math.round(h), 'hour')
  if (Math.abs(h) < 24 * 30) return rtf.format(Math.round(h / 24), 'day')
  return rtf.format(Math.round(h / 24 / 30), 'month')
}

const dateTimeFmt = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const longDateFmt = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })
const weekdayFmt = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' })

/** 26.09.2026 14:05 */
export function formatDateTime(d: Date) {
  return dateTimeFmt.format(d)
}
/** 26 Eylül 2026 (karşılamadaki tarih, dayjs 'LL'). */
export function formatLongDate(d: Date) {
  return longDateFmt.format(d)
}
/** Cumartesi */
export function formatWeekday(d: Date) {
  return weekdayFmt.format(d)
}

/**
 * Karşılama (dashboard/utils.tsx): 0–5 İyi Geceler, 5–12 Günaydın, 12–20 Tünaydın, 20–24 İyi
 * Akşamlar; 05:00–20:00 arası güneş, diğer saatlerde ay simgesi.
 */
export function greetingOf(d = new Date()): { text: string; daytime: boolean } {
  const h = d.getHours()
  const text = h < 5 ? 'İyi Geceler' : h < 12 ? 'Günaydın' : h < 20 ? 'Tünaydın' : 'İyi Akşamlar'
  return { text, daytime: h >= 5 && h < 20 }
}

/** "İş akışlarınızda {0} bekleyen onayınız var." (tr_TR 104056) */
export function pendingSentence(count: number) {
  return `İş akışlarınızda ${count} bekleyen onayınız var.`
}
