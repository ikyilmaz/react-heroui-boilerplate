import type { LucideIcon } from 'lucide-react'
import { Building2, CarFront, UserRound, UserRoundPlus } from 'lucide-react'
import { CURRENT_USER, findApp, type ChildLink, type LineItem } from '@/synergy/shared/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Menü uygulamalarının formları (maket). Orijinalde menü öğesi ya bir akış başlatır (StartAProcess:
 * Flow Viewer'da akışın başlangıç formu; olaylar akış tasarımcısının varsayılanları "Gönder" /
 * "İptal", form araç çubuğunda "Taslak Olarak Kaydet") ya da bir form açar (FillAForm: eBA
 * uygulama formu, araç çubuğunda "Kaydet"). Formun başlığı menü öğesinin adı.
 *
 * Form grupları (`formGroups.ts`) bunları talepler gibi açar: kökün kimliği `app:<uygulama>`; aynı
 * öğe ikinci kez açılınca yeni form açılmaz, açık olanın grubuna geçilir (orijinalde de panel bir
 * kez açılır). Alanlar düzenlenebilir ama hiçbir şey kaydedilmez (`FormFields.tsx`); değerin
 * biçimi bileşeni seçer (para, sayı, tarih, uzun metin, metin).
 * ------------------------------------------------------------------------------------------------- */

/** Formun olayları: akış başlangıç formu ya da uygulama formu. */
export type AppFormKind = 'start' | 'form'

export interface AppFormSection {
  title: string
  /** Etiket → maket değer. */
  fields: Record<string, string>
}

export interface AppFormTable {
  title: string
  /** Sütunlar; `num` sağa yaslı, rakamlar hizalı. */
  columns: { title: string; num?: boolean }[]
  rows: string[][]
}

export interface AppForm {
  kind: AppFormKind
  sections: AppFormSection[]
  /** Kalemler (miktar, birim fiyat, tutar; altta toplam). */
  items?: LineItem[]
  /** Liste (uygulama formlarındaki tablo). */
  table?: AppFormTable
  /** Açıklama alanı (çok satırlı). */
  note?: string
  /**
   * Child form düğmeleri (talep formlarındaki gibi `after` alanının ardında; `id` child formun
   * kimliği, `CHILD_FORMS`). Yalnızca modal / drawer destesinde açılır (`FormDeck.tsx`).
   */
  children?: ChildLink[]
}

/** Menü formlarının metinleri (tr_TR). */
export const APP_FORM_TEXT = {
  send: 'Gönder', // 100752
  saveDraft: 'Taslak Olarak Kaydet', // 102513
  cancel: 'İptal', // 100034
  save: 'Kaydet', // 100620
  close: 'Kapat', // 100824
  success: 'Başarılı', // 101879
  /** "{0} gönderildi." (102528) */
  sent: (caption: string) => `${caption} gönderildi.`,
  draftSaved: 'Form Taslak olarak kaydedildi.', // 102674
  saved: 'Kaydedildi.', // 103293
} as const

/* --- Kök kimliği ------------------------------------------------------------------------------- */

const PREFIX = 'app:'

/** Menü uygulamasının form kökü (form grubu kimliği). */
export const appRoot = (appId: string) => `${PREFIX}${appId}`

/** Kök bir menü uygulamasının formu mu; öyleyse uygulamanın kimliği. */
export const appIdOf = (root: string) =>
  root.startsWith(PREFIX) ? root.slice(PREFIX.length) : undefined

/** Kökün menü uygulaması (talep köklerinde yok). */
export const appOfRoot = (root: string) => {
  const id = appIdOf(root)
  return id === undefined ? undefined : findApp(id)
}

/* --- Maket formlar ----------------------------------------------------------------------------- */

const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]

/** Bugünden `offset` gün sonrası, formun tarih biçiminde ("14 Ekim 2026", saatle "… 09:00"). */
function day(offset = 0, time?: string) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  const text = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
  return time ? `${text} ${time}` : text
}

/** Başlatanın bilgileri (akış başlangıç formlarında hazır gelir). */
const requester = () => ({
  'Talep eden': CURRENT_USER.name,
  Departman: CURRENT_USER.department,
  'Talep tarihi': day(),
})

const FORMS: Record<string, () => AppForm> = {
  'satin-alma-talebi': (): AppForm => ({
    kind: 'start',
    sections: [
      { title: 'Talep bilgileri', fields: requester() },
      {
        title: 'Satın alma bilgileri',
        fields: {
          'Talep türü': 'Mal alımı',
          'Bütçe kodu': 'BT-2026-114',
          'Teslim yeri': 'Merkez Ofis, Ataşehir',
          'İstenen teslim tarihi': day(14),
          'Önerilen tedarikçi': 'Atlas Bilişim A.Ş.',
          'Ödeme koşulu': '30 gün vadeli',
        },
      },
    ],
    items: [
      { name: 'Dizüstü bilgisayar (14", 32 GB)', qty: 4, unit: 'adet', price: 38500 },
      { name: '27" monitör', qty: 4, unit: 'adet', price: 7900 },
      { name: 'Yerleştirme istasyonu', qty: 4, unit: 'adet', price: 4200 },
      { name: 'Kablosuz klavye ve fare seti', qty: 4, unit: 'takım', price: 1350 },
    ],
    note: 'Ekim ayında işe başlayacak dört yazılım geliştirici için çalışma ekipmanı. Cihazların ilk iş gününden önce teslim edilmesi ve kurulumlarının Bilgi Teknolojileri tarafından yapılması gerekiyor.',
  }),
  'izin-talebi': (): AppForm => ({
    kind: 'start',
    sections: [
      {
        title: 'Personel bilgileri',
        fields: {
          'Ad soyad': CURRENT_USER.name,
          'Sicil no': 'P-10482',
          Departman: CURRENT_USER.department,
          Yönetici: 'Ahmet Yıldız',
        },
      },
      {
        title: 'İzin bilgileri',
        fields: {
          'İzin türü': 'Yıllık izin',
          'Başlangıç tarihi': day(20),
          'Bitiş tarihi': day(24),
          'Gün sayısı': '5',
          'İşe başlama tarihi': day(27),
          'Kalan izin hakkı': '14',
          Vekil: 'Selin Koç',
          'İzindeki telefon': '0532 418 22 90',
        },
      },
    ],
    note: 'Ailevi bir program nedeniyle beş günlük yıllık izin talep ediyorum. İzin süresince açık işlerim vekilime devredilecek.',
  }),
  'masraf-bildirimi': (): AppForm => ({
    kind: 'start',
    sections: [
      { title: 'Talep bilgileri', fields: requester() },
      {
        title: 'Masraf bilgileri',
        fields: {
          'Masraf dönemi': 'Eylül 2026',
          'Maliyet merkezi': 'Operasyon / Saha',
          'Seyahat amacı': 'Ankara bölge müdürlüğü denetimi',
          'Ödeme şekli': 'Maaşla birlikte',
        },
      },
    ],
    items: [
      { name: 'Uçak bileti (İstanbul – Ankara, gidiş dönüş)', qty: 1, unit: 'adet', price: 4900 },
      { name: 'Otel konaklama', qty: 2, unit: 'gece', price: 3200 },
      { name: 'Taksi', qty: 5, unit: 'sefer', price: 380 },
      { name: 'Yemek', qty: 3, unit: 'öğün', price: 650 },
    ],
    note: 'Faturaların taranmış kopyaları forma eklenecek; asılları muhasebeye elden teslim edilecek.',
  }),
  'arac-tahsis': (): AppForm => ({
    kind: 'start',
    sections: [
      { title: 'Talep bilgileri', fields: requester() },
      {
        title: 'Araç bilgileri',
        fields: {
          'Kullanım amacı': 'Müşteri ziyareti',
          'Araç sınıfı': 'Binek (5 kişilik)',
          'Çıkış zamanı': day(8, '09:00'),
          'Dönüş zamanı': day(8, '18:30'),
          Güzergâh: 'Ataşehir – Gebze OSB – Ataşehir',
          'Yolcu sayısı': '3',
          Sürücü: 'Kendim kullanacağım',
          'Ehliyet sınıfı': 'B',
        },
      },
    ],
    note: 'Gebze’deki üretim tesisinde yeni hat devreye alma toplantısına katılım.',
  }),
  'toplanti-odasi': (): AppForm => ({
    kind: 'start',
    sections: [
      { title: 'Talep bilgileri', fields: requester() },
      {
        title: 'Rezervasyon bilgileri',
        fields: {
          'Toplantı konusu': '2027 bütçe planlaması ön görüşmesi',
          Oda: 'Boğaziçi (12 kişilik)',
          'Başlangıç zamanı': day(3, '14:00'),
          'Bitiş zamanı': day(3, '15:30'),
          'Katılımcı sayısı': '8',
          İkram: 'Çay, kahve, su',
          Ekipman: 'Projeksiyon, video konferans',
        },
      },
    ],
    note: 'Ankara ofisinden iki katılımcı video konferansla bağlanacak; bağlantı bilgisinin davetle birlikte paylaşılması gerekiyor.',
  }),
  'tedarikci-listesi': (): AppForm => ({
    kind: 'form',
    sections: [
      {
        title: 'Filtre',
        fields: { Kategori: 'Tümü', Şehir: 'Tümü', Durum: 'Onaylı' },
      },
    ],
    table: {
      title: 'Tedarikçiler',
      columns: [
        { title: 'Tedarikçi' },
        { title: 'Kategori' },
        { title: 'Şehir' },
        { title: 'Vergi no', num: true },
        { title: 'Yetkili' },
        { title: 'Puan', num: true },
      ],
      rows: [
        ['Atlas Bilişim A.Ş.', 'Bilişim', 'İstanbul', '1234567890', 'Kerem Uçar', '4,6'],
        ['Ege Ambalaj Ltd. Şti.', 'Ambalaj', 'İzmir', '2345678901', 'Nazlı Er', '4,2'],
        ['Anadolu Lojistik A.Ş.', 'Lojistik', 'Ankara', '3456789012', 'Okan Çelik', '4,4'],
        ['Marmara Kırtasiye', 'Kırtasiye', 'Kocaeli', '4567890123', 'Gül Aksoy', '3,9'],
        ['Delta Endüstriyel Makine', 'Makine', 'Bursa', '5678901234', 'Tolga Yılmaz', '4,8'],
        ['Kuzey Temizlik Hizmetleri', 'Hizmet', 'İstanbul', '6789012345', 'Ece Polat', '4,1'],
        ['Başkent Mobilya', 'Mobilya', 'Ankara', '7890123456', 'Can Ateş', '3,7'],
        ['Yıldız Elektrik Malzemeleri', 'Elektrik', 'İstanbul', '8901234567', 'Seda Kılıç', '4,3'],
      ],
    },
  }),
  'personel-rehberi': (): AppForm => ({
    kind: 'form',
    sections: [
      {
        title: 'Filtre',
        fields: { Departman: 'Tümü', Lokasyon: 'Merkez Ofis', 'Ad soyad': '' },
      },
    ],
    table: {
      title: 'Personel',
      columns: [
        { title: 'Ad soyad' },
        { title: 'Ünvan' },
        { title: 'Departman' },
        { title: 'Dahili', num: true },
        { title: 'E-posta' },
      ],
      rows: [
        ['Ahmet Yıldız', 'Muhasebe Müdürü', 'Muhasebe', '2104', 'ahmet.yildiz@ornek.com'],
        ['Zeynep Kara', 'Pazarlama Uzmanı', 'Pazarlama', '2231', 'zeynep.kara@ornek.com'],
        ['Mert Demir', 'Üretim Şefi', 'Üretim', '2318', 'mert.demir@ornek.com'],
        ['Elif Aydın', 'Kalite Mühendisi', 'Kalite', '2342', 'elif.aydin@ornek.com'],
        ['Burak Şahin', 'Satış Temsilcisi', 'Satış', '2407', 'burak.sahin@ornek.com'],
        ['Selin Koç', 'İK İş Ortağı', 'İnsan Kaynakları', '2115', 'selin.koc@ornek.com'],
        [
          'Emre Arslan',
          'Sistem Yöneticisi',
          'Bilgi Teknolojileri',
          '2520',
          'emre.arslan@ornek.com',
        ],
        ['Deniz Öztürk', 'Lojistik Uzmanı', 'Lojistik', '2463', 'deniz.ozturk@ornek.com'],
      ],
    },
  }),
  'butce-takip': (): AppForm => ({
    kind: 'form',
    sections: [
      {
        title: 'Filtre',
        fields: { Dönem: '2026 / 3. çeyrek', 'Maliyet merkezi': 'Tümü', 'Para birimi': 'TRY' },
      },
    ],
    table: {
      title: 'Bütçe gerçekleşmesi',
      columns: [
        { title: 'Maliyet merkezi' },
        { title: 'Bütçe', num: true },
        { title: 'Gerçekleşen', num: true },
        { title: 'Kalan', num: true },
        { title: 'Kullanım', num: true },
      ],
      rows: [
        ['Bilgi Teknolojileri', '₺1.250.000', '₺1.012.400', '₺237.600', '%81'],
        ['İnsan Kaynakları', '₺480.000', '₺352.900', '₺127.100', '%74'],
        ['Pazarlama', '₺900.000', '₺861.300', '₺38.700', '%96'],
        ['Operasyon', '₺1.600.000', '₺1.144.000', '₺456.000', '%72'],
        ['Satış', '₺720.000', '₺598.800', '₺121.200', '%83'],
        ['Kalite', '₺310.000', '₺201.500', '₺108.500', '%65'],
      ],
    },
  }),
  'kalite-dokumanlari': (): AppForm => ({
    kind: 'form',
    sections: [
      {
        title: 'Filtre',
        fields: { 'Doküman türü': 'Tümü', Süreç: 'Tümü', Durum: 'Yürürlükte' },
      },
    ],
    table: {
      title: 'Dokümanlar',
      columns: [
        { title: 'Doküman no' },
        { title: 'Doküman adı' },
        { title: 'Tür' },
        { title: 'Revizyon', num: true },
        { title: 'Yürürlük tarihi' },
        { title: 'Sahibi' },
      ],
      rows: [
        ['PR-SA-001', 'Satın alma prosedürü', 'Prosedür', '04', day(-210), 'Deniz Öztürk'],
        ['PR-IK-003', 'İşe alım prosedürü', 'Prosedür', '02', day(-164), 'Selin Koç'],
        ['TL-UR-012', 'Hat devreye alma talimatı', 'Talimat', '07', day(-98), 'Mert Demir'],
        ['FR-KY-020', 'Düzeltici faaliyet formu', 'Form', '03', day(-75), 'Elif Aydın'],
        [
          'PR-BT-005',
          'Yedekleme ve geri yükleme prosedürü',
          'Prosedür',
          '05',
          day(-41),
          'Emre Arslan',
        ],
        ['EL-KY-001', 'Kalite el kitabı', 'El kitabı', '09', day(-12), 'Elif Aydın'],
      ],
    },
  }),
  'stok-raporu': (): AppForm => ({
    kind: 'form',
    sections: [
      {
        title: 'Filtre',
        fields: { Depo: 'Merkez Depo', 'Malzeme grubu': 'Tümü', 'Rapor tarihi': day() },
      },
    ],
    table: {
      title: 'Stok durumu',
      columns: [
        { title: 'Stok kodu' },
        { title: 'Malzeme' },
        { title: 'Birim' },
        { title: 'Mevcut', num: true },
        { title: 'Kritik seviye', num: true },
        { title: 'Durum' },
      ],
      rows: [
        ['STK-1001', 'A4 fotokopi kâğıdı', 'koli', '42', '20', 'Yeterli'],
        ['STK-1014', 'Toner (siyah)', 'adet', '6', '10', 'Kritik'],
        ['STK-2003', 'Koli bandı', 'rulo', '180', '60', 'Yeterli'],
        ['STK-2011', 'Streç film', 'rulo', '24', '30', 'Kritik'],
        ['STK-3007', 'İş eldiveni', 'çift', '310', '100', 'Yeterli'],
        ['STK-3020', 'Baret', 'adet', '18', '15', 'Yeterli'],
        ['STK-4002', 'Palet (ahşap)', 'adet', '55', '40', 'Yeterli'],
      ],
    },
  }),
  'egitim-katalogu': (): AppForm => ({
    kind: 'form',
    sections: [
      {
        title: 'Filtre',
        fields: { Kategori: 'Tümü', 'Eğitim şekli': 'Tümü', Dönem: '2026 / 4. çeyrek' },
      },
    ],
    table: {
      title: 'Eğitimler',
      columns: [
        { title: 'Eğitim' },
        { title: 'Kategori' },
        { title: 'Şekil' },
        { title: 'Süre' },
        { title: 'Kontenjan', num: true },
        { title: 'Tarih' },
      ],
      rows: [
        ['Etkili sunum teknikleri', 'Kişisel gelişim', 'Sınıf', '1 gün', '16', day(9)],
        ['İş sağlığı ve güvenliği', 'Zorunlu', 'Çevrim içi', '8 saat', '200', day(12)],
        ['Excel ile veri analizi', 'Teknik', 'Çevrim içi', '2 gün', '30', day(16)],
        ['Kişisel verilerin korunması', 'Zorunlu', 'Çevrim içi', '2 saat', '200', day(21)],
        ['Liderlik ve geri bildirim', 'Yönetim', 'Sınıf', '2 gün', '12', day(28)],
        ['Yalın üretim temelleri', 'Teknik', 'Sınıf', '1 gün', '20', day(35)],
      ],
    },
  }),
  // Modal ya da drawer'da açılan iki form (açık istek üzerine eklenen maketler): her biri iki kat
  // child açar (`CHILD_FORMS`); child'lar da açanın yerinde (modal ya da drawer) açılır
  'sozlesme-talebi': (): AppForm => ({
    kind: 'start',
    sections: [
      { title: 'Talep bilgileri', fields: requester() },
      {
        title: 'Sözleşme bilgileri',
        fields: {
          'Sözleşme türü': 'Hizmet sözleşmesi',
          'Karşı taraf': 'Kuzey Temizlik Hizmetleri',
          'Başlangıç tarihi': day(15),
          'Bitiş tarihi': day(380),
          'Sözleşme bedeli': '₺1.140.000',
          'Ödeme koşulu': 'Aylık, 30 gün vadeli',
          Yenileme: 'Otomatik yenilenmez',
          'Fesih bildirimi': '30 gün önceden, yazılı',
        },
      },
    ],
    children: [
      { id: 'karsi-taraf', label: 'Karşı Taraf Bilgileri', after: 'Karşı taraf', action: 'open' },
    ],
    note: 'Merkez ofis ve Ankara bölge müdürlüğü için bir yıllık temizlik hizmeti. Teklifler karşılaştırıldı; en uygun teklif Kuzey Temizlik Hizmetleri’nden geldi.',
  }),
  'ziyaretci-kaydi': (): AppForm => ({
    kind: 'start',
    sections: [
      { title: 'Talep bilgileri', fields: requester() },
      {
        title: 'Ziyaret bilgileri',
        fields: {
          'Ziyaret zamanı': day(2, '10:00'),
          'Ziyaret süresi': '2 saat',
          'Toplantı yeri': 'Boğaziçi (12 kişilik)',
          'Ziyaretçi firma': 'Delta Endüstriyel Makine',
          'Ziyaretçi sayısı': '2',
        },
      },
    ],
    children: [
      {
        id: 'ziyaretci-bilgileri',
        label: 'Ziyaretçi Ekle',
        after: 'Ziyaretçi sayısı',
        action: 'add',
      },
    ],
    note: 'Yeni hat bakım sözleşmesi için teknik görüşme; ziyaretçiler üretim alanına girmeyecek.',
  }),
}

/* --- Modal / drawer formlarının child'ları ------------------------------------------------------ */

/** Child formlar (menüde yok): adı, ikonu ve maket içeriği. */
const CHILD_FORMS: Record<string, { caption: string; icon: LucideIcon; form: () => AppForm }> = {
  'karsi-taraf': {
    caption: 'Karşı Taraf Bilgileri',
    icon: Building2,
    form: (): AppForm => ({
      kind: 'form',
      sections: [
        {
          title: 'Firma bilgileri',
          fields: {
            Unvan: 'Kuzey Temizlik Hizmetleri Ltd. Şti.',
            'Vergi dairesi': 'Kozyatağı',
            Telefon: '0216 574 18 30',
            Adres: 'İçerenköy Mah. Değirmenyolu Cad. No: 28, Ataşehir / İstanbul',
          },
        },
        {
          title: 'Yetkili',
          fields: { 'Yetkili kişi': 'Ece Polat', 'E-posta': 'ece.polat@ornek.com' },
        },
      ],
      children: [
        { id: 'yetkili-kisi', label: 'Yetkili Ekle', after: 'Yetkili kişi', action: 'add' },
      ],
      table: {
        title: 'Önceki sözleşmeler',
        columns: [
          { title: 'Sözleşme no' },
          { title: 'Konu' },
          { title: 'Bitiş tarihi' },
          { title: 'Bedel', num: true },
        ],
        rows: [
          ['SZ-2024-031', 'Ofis temizliği', day(-410), '₺860.000'],
          ['SZ-2025-008', 'Cam ve cephe temizliği', day(-120), '₺145.000'],
        ],
      },
    }),
  },
  'yetkili-kisi': {
    caption: 'Yetkili Kişi',
    icon: UserRoundPlus,
    form: (): AppForm => ({
      kind: 'form',
      sections: [
        {
          title: 'Kişi bilgileri',
          fields: {
            'Ad soyad': '',
            Ünvan: '',
            'E-posta': '',
            Telefon: '',
            'İmza yetkisi': 'Müştereken',
            'Yetki bitiş tarihi': day(365),
          },
        },
      ],
    }),
  },
  'ziyaretci-bilgileri': {
    caption: 'Ziyaretçi Bilgileri',
    icon: UserRound,
    form: (): AppForm => ({
      kind: 'form',
      sections: [
        {
          title: 'Ziyaretçi',
          fields: {
            'Ad soyad': 'Tolga Yılmaz',
            Firma: 'Delta Endüstriyel Makine',
            Ünvan: 'Satış Müdürü',
            Telefon: '0532 611 47 05',
            'Araçla gelecek': 'Evet',
          },
        },
      ],
      children: [
        {
          id: 'arac-bilgileri',
          label: 'Araç Bilgisi Ekle',
          after: 'Araçla gelecek',
          action: 'add',
        },
      ],
    }),
  },
  'arac-bilgileri': {
    caption: 'Araç Bilgileri',
    icon: CarFront,
    form: (): AppForm => ({
      kind: 'form',
      sections: [
        {
          title: 'Araç',
          fields: {
            Plaka: '16 ABC 482',
            'Marka / model': 'Volkswagen Passat',
            Renk: 'Gri',
            Otopark: 'Misafir otoparkı (B2)',
            'Giriş zamanı': day(2, '09:45'),
          },
        },
      ],
    }),
  },
}

/** Menü uygulamasının formu (yoksa `undefined`: sayfası olan uygulamalar, ör. İş Akış Yönetimi). */
export const appFormOf = (appId: string): AppForm | undefined => FORMS[appId]?.()

/** Destedeki formun adı ve ikonu: menü uygulaması (menüden) ya da child form. */
export function deckTitleOf(id: string): { caption: string; icon?: LucideIcon } | undefined {
  const app = findApp(id)
  if (app) return { caption: app.caption, icon: app.icon }
  const child = CHILD_FORMS[id]
  return child && { caption: child.caption, icon: child.icon }
}

/**
 * Destedeki formun adı, ikonu ve maket içeriği. İçerik her çağrıda yeniden kurulur (bugüne göre
 * tarihler); çağıran bir kez alır.
 */
export function deckFormOf(id: string) {
  const title = deckTitleOf(id)
  const form = findApp(id) ? appFormOf(id) : CHILD_FORMS[id]?.form()
  return title && form && { ...title, form }
}
