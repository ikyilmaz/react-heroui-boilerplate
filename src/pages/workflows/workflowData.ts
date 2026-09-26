import type { LucideIcon } from 'lucide-react'
import {
  BellRing,
  Car,
  ClipboardCheck,
  FileSignature,
  FileText,
  GraduationCap,
  History,
  Inbox,
  KeyRound,
  Loader,
  TreePalm,
  PenLine,
  Receipt,
  Rocket,
  ShoppingCart,
} from 'lucide-react'

/* -------------------------------------------------------------------------------------------------
 * İş akışı maket verisi
 *
 * Gerçek hayattan senaryolar: satın alma, izin, masraf, sözleşme, doküman revizyonu, DÖF, eğitim,
 * araç tahsisi ve yetki talepleri. Her talep bir şablondan türetiliyor; şablon hem listede görünen
 * özeti hem de detay sayfasındaki form alanlarını ve onay adımlarını taşıyor. Tarihler "şimdi"ye
 * göre kaydırılıyor ki gruplar (Bugün / Bu hafta / Daha eski) her zaman anlamlı dolsun.
 * ------------------------------------------------------------------------------------------------- */

export const CURRENT_USER = { name: 'Fatma Tekin', title: 'Operasyon Müdürü' }

export type BoxId = 'bekleyen' | 'baslattiklarim' | 'devam-eden' | 'bilgilendirmeler' | 'taslaklar' | 'gecmis'

export interface Box {
  id: BoxId
  label: string
  icon: LucideIcon
  /** Kutunun sayfa başlığı altındaki açıklaması; `{n}` talep, `{p}` süreç sayısı. */
  summary: string
}

export const boxes: Box[] = [
  { id: 'bekleyen', label: 'Bekleyen Onaylar', icon: Inbox, summary: 'Onayınızı bekleyen {n} talep, {p} süreçte.' },
  { id: 'baslattiklarim', label: 'Başlattığım İşler', icon: Rocket, summary: 'Sizin başlattığınız {n} talep, {p} süreçte ilerliyor.' },
  { id: 'devam-eden', label: 'Devam Eden İşler', icon: Loader, summary: 'Dahil olduğunuz ve henüz kapanmamış {n} talep.' },
  { id: 'bilgilendirmeler', label: 'Bilgilendirmeler', icon: BellRing, summary: 'Size bilgi amaçlı iletilen {n} talep.' },
  { id: 'taslaklar', label: 'Taslaklar', icon: PenLine, summary: 'Henüz göndermediğiniz {n} taslak.' },
  { id: 'gecmis', label: 'Geçmiş', icon: History, summary: 'Son 90 günde sonuçlandırdığınız {n} talep.' },
]

export interface Person {
  name: string
  department: string
}

/** Maket: talep sahipleri ve adım sahipleri bu kişilerden seçilir. */
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

export interface LineItem {
  name: string
  qty: number
  unit: string
  price: number
}

export interface RequestTemplate {
  title: string
  /** Listede başlığın yanında görünen kısa bilgi (tutar, tarih aralığı, revizyon...). */
  highlight?: string
  urgent?: boolean
  fields: Record<string, string>
  reason: string
  items?: LineItem[]
  attachments?: string[]
}

export interface Process {
  id: string
  name: string
  department: string
  icon: LucideIcon
  prefix: string
  steps: string[]
  /** Kullanıcının onay verdiği adımın indeksi. */
  approverStep: number
  templates: RequestTemplate[]
}

export const processes: Process[] = [
  {
    id: 'satin-alma',
    name: 'Satın Alma Talebi',
    department: 'Satın Alma',
    icon: ShoppingCart,
    prefix: 'SAT',
    steps: ['Talep oluşturuldu', 'Bölüm yöneticisi onayı', 'Operasyon müdürü onayı', 'Satın alma değerlendirmesi', 'Finans onayı'],
    approverStep: 2,
    templates: [
      {
        title: 'Muhasebe ekibi için 6 adet dizüstü bilgisayar',
        highlight: '₺224.400',
        urgent: true,
        fields: { 'Maliyet merkezi': '1200 · Muhasebe', 'Bütçe kalemi': 'BT Donanım 2026', 'Teslim yeri': 'Genel Müdürlük, 3. kat', 'İstenen teslim': '10 Ekim 2026' },
        reason:
          'Ekipteki cihazların 4 tanesi 2019 alımı ve yıl sonu kapanış yoğunluğunda sık donma yaşanıyor. Ekime katılacak 2 yeni personel için de cihaz gerekiyor. BT ekibinin önerdiği standart konfigürasyon seçildi.',
        items: [
          { name: 'Dizüstü bilgisayar 14" · i7 / 32 GB / 1 TB', qty: 6, unit: 'adet', price: 32_400 },
          { name: 'USB-C yerleştirme istasyonu', qty: 6, unit: 'adet', price: 3_400 },
          { name: '27" monitör', qty: 2, unit: 'adet', price: 4_800 },
        ],
        attachments: ['Teklif_TeknoPlus.pdf', 'Teklif_BilisimAS.pdf', 'BT_Konfigurasyon_Onerisi.docx'],
      },
      {
        title: 'Depo forkliftleri için yıllık bakım hizmeti',
        highlight: '₺38.500',
        fields: { 'Maliyet merkezi': '3400 · Lojistik', 'Bütçe kalemi': 'Bakım Onarım', 'Teslim yeri': 'Gebze Depo', 'Sözleşme süresi': '12 ay' },
        reason: 'Mevcut bakım sözleşmesi 30 Eylül’de bitiyor. Üç tedarikçiden teklif alındı; en uygun teklif mevcut firmadan geldi ve yanıt süresi 4 saatten 2 saate indirildi.',
        items: [
          { name: 'Periyodik bakım (3 ayda bir) · 4 forklift', qty: 4, unit: 'dönem', price: 7_250 },
          { name: 'Acil müdahale paketi', qty: 1, unit: 'yıl', price: 9_500 },
        ],
        attachments: ['Karsilastirma_Tablosu.xlsx'],
      },
      {
        title: 'Toplantı odası video konferans seti',
        highlight: '₺62.000',
        fields: { 'Maliyet merkezi': '1000 · Genel Yönetim', 'Bütçe kalemi': 'Ofis Donanım', 'Teslim yeri': 'Genel Müdürlük, Boğaz toplantı odası', 'İstenen teslim': '15 Ekim 2026' },
        reason: 'Hibrit toplantılarda ses ve görüntü kalitesi yetersiz; müşteri sunumlarında sorun yaşandı. Kamera, tavan mikrofonu ve ekran paylaşım cihazı tek pakette alınacak.',
        items: [{ name: 'Video konferans seti (kamera + mikrofon + hub)', qty: 1, unit: 'set', price: 62_000 }],
        attachments: ['Teklif_AVSistem.pdf'],
      },
      {
        title: 'Ekim ayı ofis sarf malzemesi',
        highlight: '₺8.740',
        fields: { 'Maliyet merkezi': '1000 · Genel Yönetim', 'Bütçe kalemi': 'Kırtasiye', 'Teslim yeri': 'Genel Müdürlük', 'İstenen teslim': '1 Ekim 2026' },
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
    name: 'Yıllık İzin Talebi',
    department: 'İnsan Kaynakları',
    icon: TreePalm,
    prefix: 'IZN',
    steps: ['Talep oluşturuldu', 'Yönetici onayı', 'İK kontrolü'],
    approverStep: 1,
    templates: [
      {
        title: '5 gün yıllık izin',
        highlight: '7–11 Ekim',
        fields: { 'İzin türü': 'Yıllık ücretli izin', 'Başlangıç': '7 Ekim 2026 Pazartesi', 'Bitiş': '11 Ekim 2026 Cuma', 'Kalan hak': '14 gün → 9 gün', 'Vekil': 'Burak Şahin' },
        reason: 'Aile ziyareti için planlanmış izin. Açık işler vekile devredildi, müşteri görüşmeleri izin sonrasına alındı.',
      },
      {
        title: 'Yarım gün mazeret izni',
        highlight: '26 Eylül öğleden sonra',
        fields: { 'İzin türü': 'Mazeret izni', 'Başlangıç': '26 Eylül 2026 13:00', 'Bitiş': '26 Eylül 2026 18:00', 'Kalan hak': '—', 'Vekil': 'Gerekmiyor' },
        reason: 'Tapu dairesinde randevu.',
      },
      {
        title: 'Babalık izni',
        highlight: '5 gün',
        urgent: true,
        fields: { 'İzin türü': 'Babalık izni (yasal)', 'Başlangıç': '25 Eylül 2026', 'Bitiş': '1 Ekim 2026', 'Kalan hak': 'Yıllık izinden düşülmez', 'Vekil': 'Deniz Öztürk' },
        reason: 'Doğum raporu ektedir.',
        attachments: ['Dogum_Raporu.pdf'],
      },
    ],
  },
  {
    id: 'masraf',
    name: 'Masraf Bildirimi',
    department: 'Finans',
    icon: Receipt,
    prefix: 'MSR',
    steps: ['Bildirim oluşturuldu', 'Yönetici onayı', 'Muhasebe kontrolü', 'Ödeme'],
    approverStep: 1,
    templates: [
      {
        title: 'İzmir müşteri ziyareti · ulaşım ve konaklama',
        highlight: '₺7.420',
        fields: { 'Seyahat tarihi': '16–18 Eylül 2026', 'Proje / müşteri': 'Ege Gıda A.Ş. yıllık değerlendirme', 'Ödeme şekli': 'Şirket kartı', 'Fiş sayısı': '6' },
        reason: 'Yıllık hizmet değerlendirme toplantısı ve fabrika ziyareti.',
        items: [
          { name: 'Uçak bileti (gidiş-dönüş)', qty: 1, unit: 'kişi', price: 3_180 },
          { name: 'Otel · 2 gece', qty: 2, unit: 'gece', price: 1_650 },
          { name: 'Araç kiralama', qty: 1, unit: 'gün', price: 940 },
        ],
        attachments: ['Fisler_Izmir.pdf'],
      },
      {
        title: 'Fuar standı ekip yemekleri',
        highlight: '₺3.180',
        fields: { 'Seyahat tarihi': '12–14 Eylül 2026', 'Proje / müşteri': 'WIN Eurasia Fuarı', 'Ödeme şekli': 'Kişisel · iade', 'Fiş sayısı': '5' },
        reason: 'Fuar süresince stant ekibinin (4 kişi) öğle ve akşam yemekleri.',
        attachments: ['Fisler_Fuar.pdf'],
      },
      {
        title: 'Eylül ayı taksi ve otopark giderleri',
        highlight: '₺1.265',
        fields: { 'Seyahat tarihi': 'Eylül 2026', 'Proje / müşteri': 'Çeşitli müşteri ziyaretleri', 'Ödeme şekli': 'Kişisel · iade', 'Fiş sayısı': '11' },
        reason: 'İstanbul içi müşteri ziyaretleri.',
      },
      {
        title: 'ISO 9001 semineri kayıt ücreti',
        highlight: '₺4.500',
        fields: { 'Seyahat tarihi': '3 Ekim 2026', 'Proje / müşteri': 'Kalite ekibi gelişim planı', 'Ödeme şekli': 'Şirket kartı', 'Fiş sayısı': '1' },
        reason: 'Yıllık eğitim planında yer alan seminer; erken kayıt indirimi 30 Eylül’de bitiyor.',
      },
    ],
  },
  {
    id: 'sozlesme',
    name: 'Sözleşme Onayı',
    department: 'Hukuk',
    icon: FileSignature,
    prefix: 'SZL',
    steps: ['Taslak hazırlandı', 'Hukuk incelemesi', 'Operasyon müdürü onayı', 'Genel müdür imzası'],
    approverStep: 2,
    templates: [
      {
        title: 'Bulut sunucu hizmeti yenileme · 12 ay',
        highlight: '₺486.000 / yıl',
        urgent: true,
        fields: { 'Karşı taraf': 'Nimbus Bulut Hizmetleri A.Ş.', 'Sözleşme türü': 'Hizmet alım · yenileme', 'Süre': '1 Kasım 2026 – 31 Ekim 2027', 'Fesih bildirimi': '60 gün' },
        reason: 'Mevcut sözleşme 31 Ekim’de sona eriyor. Fiyat artışı %18 ile enflasyonun altında kaldı; SLA %99,9’dan %99,95’e yükseltildi.',
        attachments: ['Sozlesme_Taslak_v3.docx', 'Hukuk_Gorusu.pdf'],
      },
      {
        title: 'Temizlik hizmet sözleşmesi ek protokolü',
        highlight: '+2 personel',
        fields: { 'Karşı taraf': 'Parlak Tesis Yönetimi Ltd.', 'Sözleşme türü': 'Ek protokol', 'Süre': 'Mevcut sözleşme sonuna kadar', 'Fesih bildirimi': '30 gün' },
        reason: 'Yeni açılan Ar-Ge katı için iki ek temizlik personeli.',
        attachments: ['Ek_Protokol.docx'],
      },
    ],
  },
  {
    id: 'dokuman-revizyon',
    name: 'Doküman Revizyon Onayı',
    department: 'Kalite',
    icon: FileText,
    prefix: 'DOK',
    steps: ['Revizyon hazırlandı', 'Süreç sahibi onayı', 'Kalite birimi kontrolü', 'Yayın'],
    approverStep: 1,
    templates: [
      {
        title: 'PR-KAL-012 Tedarikçi Değerlendirme Prosedürü',
        highlight: 'Rev. 04',
        fields: { 'Doküman türü': 'Prosedür', 'Mevcut revizyon': 'Rev. 03 · 12 Mart 2025', 'Değişiklik özeti': 'Puanlama kriterlerine sürdürülebilirlik eklendi', 'Dağıtım': 'Satın Alma, Kalite, Üretim' },
        reason: 'Müşteri denetiminde tedarikçilerin çevresel performansının da değerlendirilmesi istendi. Puanlama %10 ağırlıkla yeni kriteri içeriyor.',
        attachments: ['PR-KAL-012_Rev04.docx', 'Degisiklik_Karsilastirma.pdf'],
      },
      {
        title: 'TL-URT-031 Kalıp Değişim Talimatı',
        highlight: 'Rev. 02',
        fields: { 'Doküman türü': 'Talimat', 'Mevcut revizyon': 'Rev. 01 · 4 Ocak 2026', 'Değişiklik özeti': 'SMED çalışması sonrası adımlar sadeleştirildi', 'Dağıtım': 'Üretim' },
        reason: 'Kalıp değişim süresi 42 dakikadan 18 dakikaya indirildi; talimat yeni sıralamaya göre güncellendi.',
        attachments: ['TL-URT-031_Rev02.pdf'],
      },
      {
        title: 'FR-IK-007 İşe Giriş Formu',
        highlight: 'Rev. 05',
        fields: { 'Doküman türü': 'Form', 'Mevcut revizyon': 'Rev. 04 · 20 Haziran 2025', 'Değişiklik özeti': 'KVKK aydınlatma metni güncellendi', 'Dağıtım': 'İnsan Kaynakları' },
        reason: 'Güncel KVKK aydınlatma metni forma eklendi, kullanılmayan alanlar çıkarıldı.',
      },
    ],
  },
  {
    id: 'dof',
    name: 'Düzeltici Faaliyet (DÖF)',
    department: 'Kalite',
    icon: ClipboardCheck,
    prefix: 'DOF',
    steps: ['Uygunsuzluk kaydı', 'Kök neden analizi', 'Faaliyet planı onayı', 'Etkinlik doğrulama'],
    approverStep: 2,
    templates: [
      {
        title: 'Müşteri şikâyeti #2291 · ambalaj hasarı',
        highlight: 'Yüksek öncelik',
        urgent: true,
        fields: { 'Kaynak': 'Müşteri şikâyeti', 'Müşteri': 'Anadolu Market Zinciri', 'Kök neden': 'Palet streç sarımı yetersiz', 'Hedef tarih': '15 Ekim 2026' },
        reason: 'Son iki sevkiyatta 38 kolide ezilme tespit edildi. Sarım makinesinin gerginlik ayarı standart dışı; operatör eğitimi ve günlük kontrol listesi öneriliyor.',
        attachments: ['Sikayet_Fotograflari.zip', '5Neden_Analizi.pdf'],
      },
      {
        title: 'İç denetim bulgusu · kalibrasyon kaydı eksik',
        highlight: 'Orta öncelik',
        fields: { 'Kaynak': 'İç denetim · Eylül 2026', 'Müşteri': '—', 'Kök neden': 'Kalibrasyon takvimi manuel izleniyor', 'Hedef tarih': '31 Ekim 2026' },
        reason: '3 adet kumpasın kalibrasyon sertifikası süresi geçmiş. Takvimin sistemde otomatik hatırlatmalı izlenmesi öneriliyor.',
      },
    ],
  },
  {
    id: 'egitim',
    name: 'Eğitim Talebi',
    department: 'İnsan Kaynakları',
    icon: GraduationCap,
    prefix: 'EGT',
    steps: ['Talep oluşturuldu', 'Yönetici onayı', 'İK bütçe kontrolü'],
    approverStep: 1,
    templates: [
      {
        title: 'ISO 27001 İç Denetçi Eğitimi',
        highlight: '3 gün · ₺12.900',
        fields: { 'Eğitim kurumu': 'Standart Akademi', 'Tarih': '21–23 Ekim 2026', 'Katılım': 'Çevrim içi', 'Sertifika': 'Var' },
        reason: 'Bilgi güvenliği iç denetim ekibine ikinci denetçi kazandırmak için.',
      },
    ],
  },
  {
    id: 'arac',
    name: 'Araç Tahsis Talebi',
    department: 'İdari İşler',
    icon: Car,
    prefix: 'ARC',
    steps: ['Talep oluşturuldu', 'Yönetici onayı', 'İdari işler planlaması'],
    approverStep: 1,
    templates: [
      {
        title: 'Bursa tesis ziyareti için havuz aracı',
        highlight: '26 Eylül',
        fields: { 'Güzergâh': 'İstanbul → Bursa OSB → İstanbul', 'Tarih': '26 Eylül 2026, 07:30–19:00', 'Yolcu sayısı': '3', 'Sürücü': 'Talep eden' },
        reason: 'Yeni hat devreye alma toplantısı.',
      },
    ],
  },
  {
    id: 'yetki',
    name: 'Yazılım Erişim Yetkisi',
    department: 'Bilgi Teknolojileri',
    icon: KeyRound,
    prefix: 'YTK',
    steps: ['Talep oluşturuldu', 'Yönetici onayı', 'Uygulama sahibi onayı', 'BT tanımlama'],
    approverStep: 1,
    templates: [
      {
        title: 'ERP finans modülü okuma yetkisi',
        highlight: 'Süresiz',
        fields: { 'Uygulama': 'ERP · Finans (FI)', 'Yetki rolü': 'Raporlama · salt okuma', 'Süre': 'Süresiz', 'Gerekçe türü': 'Görev değişikliği' },
        reason: 'Bütçe takip raporlarını doğrudan sistemden alabilmek için.',
      },
      {
        title: 'Saha ekibi için VPN erişimi',
        highlight: '4 kullanıcı · 3 ay',
        fields: { 'Uygulama': 'Kurumsal VPN', 'Yetki rolü': 'Standart kullanıcı', 'Süre': '3 ay', 'Gerekçe türü': 'Proje' },
        reason: 'Bursa tesisindeki devreye alma projesinde çalışan ekip merkez sistemlere erişecek.',
      },
    ],
  },
]

/** Maket: her kutuda hangi süreçten kaç talep olduğu. */
const boxContents: Record<BoxId, Partial<Record<string, number>>> = {
  bekleyen: { 'satin-alma': 4, izin: 3, masraf: 4, sozlesme: 2, 'dokuman-revizyon': 3, dof: 2, egitim: 1, arac: 1, yetki: 2 },
  baslattiklarim: { 'satin-alma': 2, masraf: 3, egitim: 1, yetki: 1 },
  'devam-eden': { 'satin-alma': 3, sozlesme: 2, dof: 2, 'dokuman-revizyon': 1 },
  // Maket (C): ana sayfadaki "Bilginize sunulanlar" boş kalmasın diye birkaç bilgilendirme
  bilgilendirmeler: { sozlesme: 1, 'dokuman-revizyon': 2, 'satin-alma': 1 },
  taslaklar: { 'satin-alma': 1, masraf: 2, izin: 1 },
  gecmis: { 'satin-alma': 6, izin: 5, masraf: 8, 'dokuman-revizyon': 4, yetki: 3 },
}

export type Decision = 'approved' | 'rejected'

/**
 * Takip edilen bir talebin şu anki durumu: hangi adımda, kimde ve ne zamandan beri. Yalnızca
 * "Başlattığım İşler" ve "Devam Eden İşler" kutularındaki taleplerde dolu (maket A).
 */
export interface Progress {
  /** `process.steps` içindeki şu anki adımın indeksi; hiçbir zaman 0 (oluşturma adımı) değil. */
  step: number
  /** Talebi şu an elinde tutan kişi. */
  holder: Person
  /** Talebin bu adıma geldiği an. */
  since: Date
  /** `bilgi-istendi`: adım sahibi talep sahibinden ek bilgi bekliyor. */
  state: 'ilerliyor' | 'bilgi-istendi'
}

export interface WorkRequest {
  id: string
  /** Talebin bulunduğu kutu (ayrıntı adresi `/is-akislari/:box/:processId/:id` için). */
  box: BoxId
  no: string
  processId: string
  template: RequestTemplate
  requester: Person
  createdAt: Date
  read: boolean
  /** Takip bilgisi; yalnızca `baslattiklarim` ve `devam-eden` kutularında. */
  progress?: Progress
}

/** Maket verisinin "şimdi"si; talep yaşları buna göre hesaplanır. */
export const NOW = Date.now()
export const HOUR = 3_600_000
export const DAY = 24 * HOUR
/** Bu kadar günden uzun bekleyen onay "gecikmiş" sayılır. */
export const LATE_DAYS = 7
/** Takip edilen talep bu kadar günden uzun aynı adımda kalırsa "takıldı" sayılır (Hatırlat). */
export const STUCK_DAYS = 3

/** Tarihten bu yana geçen gün (kesirli). */
export function ageDays(d: Date) {
  return (Date.now() - d.getTime()) / DAY
}
/** Talep yaşları (saat). Bugün, bu hafta ve daha eski gruplarına yayılacak şekilde seçildi. */
const ages = [1.5, 5, 9, 30, 52, 76, 130, 210, 380, 760, 1_400]

function build(box: BoxId): WorkRequest[] {
  const list: WorkRequest[] = []
  let seq = 0
  for (const p of processes) {
    const n = boxContents[box][p.id] ?? 0
    for (let i = 0; i < n; i++, seq++) {
      const template = p.templates[i % p.templates.length]
      const createdAt = new Date(NOW - ages[(seq + i * 2) % ages.length] * HOUR - i * 7 * HOUR)
      // Maket (A): takip edilen talepler için adım, adım sahibi ve adıma geliş zamanı. Talep
      // oluşturma ile şimdi arasının %40'ında bir sonraki adıma geçmiş sayılır.
      const progress: Progress | undefined =
        box === 'baslattiklarim' || box === 'devam-eden'
          ? {
              step: 1 + ((seq + i) % (p.steps.length - 1)),
              holder: people[(seq * 5 + i + 2) % people.length],
              since: new Date(createdAt.getTime() + (NOW - createdAt.getTime()) * 0.4),
              state: box === 'baslattiklarim' && p.id === 'masraf' && i === 0 ? 'bilgi-istendi' : 'ilerliyor',
            }
          : undefined
      list.push({
        id: `${box}-${p.id}-${i}`,
        box,
        no: `${p.prefix}-2026-${String(412 + seq * 37 + i * 11).padStart(4, '0')}`,
        processId: p.id,
        template,
        requester: box === 'baslattiklarim' || box === 'taslaklar' ? { name: CURRENT_USER.name, department: 'Operasyon' } : people[(seq * 3 + i) % people.length],
        createdAt,
        read: (seq + i) % 3 !== 0,
        ...(progress && { progress }),
      })
    }
  }
  return list
}

const cache = new Map<BoxId, WorkRequest[]>()

export function requestsOf(box: BoxId): WorkRequest[] {
  if (!cache.has(box)) cache.set(box, build(box))
  return cache.get(box)!
}

export function findBox(id: string | undefined) {
  return boxes.find((b) => b.id === id)
}

export function findProcess(id: string | undefined) {
  return processes.find((p) => p.id === id)
}

/** Kimliğe göre talep (tüm kutularda arar); ana sayfadaki önizleme ve geri alma için. */
export function findRequest(id: string | undefined): WorkRequest | undefined {
  if (!id) return undefined
  const box = boxes.find((b) => id.startsWith(`${b.id}-`))
  return box ? requestsOf(box.id).find((r) => r.id === id) : undefined
}

/** Talebin tam sayfa adresi. */
export function requestHref(r: WorkRequest) {
  return `/is-akislari/${r.box}/${r.processId}/${r.id}`
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toLocaleUpperCase('tr'))
    .join('')
}

const avatarColors = ['success', 'accent', 'default'] as const

/** Avatar rengi (HeroUI `Avatar color`) isme göre sabit seçilir; aynı kişi her yerde aynı renkte. */
export function avatarColor(name: string): (typeof avatarColors)[number] {
  return avatarColors[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length]
}

export const tl = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 })

const rtf = new Intl.RelativeTimeFormat('tr', { numeric: 'auto' })

export function relative(date: Date) {
  const h = (date.getTime() - Date.now()) / HOUR
  if (Math.abs(h) < 1) return 'az önce'
  if (Math.abs(h) < 24) return rtf.format(Math.round(h), 'hour')
  if (Math.abs(h) < 24 * 30) return rtf.format(Math.round(h / 24), 'day')
  return rtf.format(Math.round(h / 24 / 30), 'month')
}

export function dateTime(date: Date) {
  return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(date)
}

export type Group = 'Bugün' | 'Bu hafta' | 'Bu ay' | 'Daha eski'

export function groupOf(date: Date): Group {
  const days = (Date.now() - date.getTime()) / (24 * HOUR)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  if (date >= startOfToday) return 'Bugün'
  if (days < 7) return 'Bu hafta'
  if (days < 30) return 'Bu ay'
  return 'Daha eski'
}

/** Bugünün ve dünün başlangıcı (yerel saat). */
function dayStarts() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  return { today, yesterday }
}

/** Takip edilen talebin bu adımda ne kadardır beklediği, sayı kullanmadan. */
export function sinceWords(d: Date) {
  const { today, yesterday } = dayStarts()
  const days = ageDays(d)
  if (d >= today) return 'Bugün bu adıma geldi'
  if (d >= yesterday) return 'Dünden beri bu adımda'
  if (days < 7) return 'Birkaç gündür bu adımda'
  if (days < 14) return 'Bir haftadır bu adımda'
  return 'Uzun süredir bu adımda'
}

/** Taslağın ne zaman kaydedildiği, sayı kullanmadan. */
export function savedWords(d: Date) {
  const { today, yesterday } = dayStarts()
  const days = ageDays(d)
  if (d >= today) return 'Bugün kaydedildi'
  if (d >= yesterday) return 'Dün kaydedildi'
  if (days < 7) return 'Bu hafta kaydedildi'
  if (days < 30) return 'Bu ay kaydedildi'
  return 'Bir süredir bekliyor'
}

/* -------------------------------------------------------------------------------------------------
 * Ana sayfa: onay kuyruğunun aciliyet grupları ve süreç araması
 * ------------------------------------------------------------------------------------------------- */

export type TriageGroup = 'acil' | 'geciken' | 'hafta' | 'bugun'

/** Kuyruk başlıkları; sıra `byPriority` ile aynı (acil, en eski önce). */
export const triageGroups: { id: TriageGroup; label: string; hint?: string }[] = [
  { id: 'acil', label: 'Acil' },
  { id: 'geciken', label: 'Gecikenler', hint: 'Bir haftadan uzun süredir bekliyor' },
  { id: 'hafta', label: 'Bu hafta gelenler' },
  { id: 'bugun', label: 'Bugün gelenler' },
]

/** Talebin kuyruktaki grubu: acil > gecikmiş (LATE_DAYS) > bugün gelen > bu hafta gelen. */
export function triageGroup(r: WorkRequest): TriageGroup {
  if (r.template.urgent) return 'acil'
  if (ageDays(r.createdAt) > LATE_DAYS) return 'geciken'
  if (groupOf(r.createdAt) === 'Bugün') return 'bugun'
  return 'hafta'
}

/** Maket: "Yeni talep" aramasında süreç adı ve biriminin yanında eşleşen gündelik kelimeler. */
export const processAliases: Record<string, string[]> = {
  izin: ['tatil', 'rapor', 'mazeret', 'babalık'],
  'satin-alma': ['bilgisayar', 'laptop', 'sipariş', 'alım'],
  masraf: ['fiş', 'harcama', 'taksi', 'yol'],
  sozlesme: ['kontrat', 'anlaşma'],
  'dokuman-revizyon': ['prosedür', 'talimat', 'revizyon'],
  dof: ['uygunsuzluk', 'şikâyet', 'düzeltici'],
  egitim: ['kurs', 'seminer', 'sertifika'],
  arac: ['araba', 'havuz', 'servis'],
  yetki: ['erişim', 'vpn', 'şifre', 'lisans'],
}

/** Süreç aramada eşleşiyor mu (ad, birim, eş anlamlılar; Türkçe küçük harf, alt dize). Boş sorgu her şeyle eşleşir. */
export function matchesProcess(p: Process, q: string) {
  const needle = q.trim().toLocaleLowerCase('tr')
  if (!needle) return true
  return [p.name, p.department, ...(processAliases[p.id] ?? [])].some((s) => s.toLocaleLowerCase('tr').includes(needle))
}

/* -------------------------------------------------------------------------------------------------
 * Yerleşimlerin ortak yardımcıları
 * ------------------------------------------------------------------------------------------------- */

export function processOf(r: WorkRequest): Process {
  return findProcess(r.processId)!
}

/** Aciliyet önce, sonra en eski: "önce neye bakmalıyım" sırası. */
export function byPriority(a: WorkRequest, b: WorkRequest) {
  if (!!a.template.urgent !== !!b.template.urgent) return a.template.urgent ? -1 : 1
  return a.createdAt.getTime() - b.createdAt.getTime()
}
