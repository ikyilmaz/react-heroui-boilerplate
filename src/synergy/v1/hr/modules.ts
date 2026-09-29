import type { LucideIcon } from 'lucide-react'
import {
  Award,
  Briefcase,
  Building2,
  CalendarClock,
  Clock,
  FileCog,
  KeyRound,
  Landmark,
  ListTree,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
  UserCog,
  Users,
  UsersRound,
  Wallet,
  Wrench,
} from 'lucide-react'
import { fullName, hrRecord, type HrModule, type HrRecord } from '@/synergy/shared/hrData'

/* -------------------------------------------------------------------------------------------------
 * İK modülleri: menüdeki yeri, sütunlar, form bölümleri ve süzgeçler. Etiketler orijinal tr_TR'den
 * (kimlikler yorumlarda). Tablo ve düzenleme kartı bu tanımlardan çizilir (`HrPage.tsx`).
 * ------------------------------------------------------------------------------------------------- */

export type FieldType =
  | 'text'
  | 'email'
  | 'phone'
  | 'date'
  | 'select'
  | 'ref'
  | 'refMany'
  | 'number'
  | 'money'
  | 'time'
  | 'bool'
  | 'status'
  | 'textarea'

export interface Field {
  key: string
  label: string
  type: FieldType
  options?: string[]
  /** `ref` / `refMany`: seçeneklerin geldiği modül. */
  ref?: HrModule
  required?: boolean
  /** İki sütunlu formda tüm satırı kaplar. */
  wide?: boolean
}

export type ColumnKind =
  | 'text'
  | 'user'
  | 'status'
  | 'ref'
  | 'date'
  | 'money'
  | 'timeRange'
  | 'bool'
  | 'factor'
  | 'count'
  | 'mono'

export interface Column {
  key: string
  label: string
  kind?: ColumnKind
  ref?: HrModule
}

export interface Section {
  title: string
  fields: Field[]
  /** Kullanıcı formundaki "Amirler" gibi özel bölüm. */
  custom?: 'managers'
}

export interface ModuleDef {
  id: HrModule
  label: string
  icon: LucideIcon
  /** Menüde bir üst öğe (Organizasyon Bakımı, Özellik Tanımları). */
  parent?: 'bakim' | 'ozellik'
  /** Liste: tablo + düzenleme kartı; yöneticiler ve özellik ilişkileri kendi görünümlerinde. */
  view: 'table' | 'admins' | 'relations'
  columns: Column[]
  sections: Section[]
  /** Durum süzgeci (varsayılan Aktif) ve şirket süzgeci. */
  status?: boolean
  company?: boolean
  deletable?: boolean
  /** Kaydın başlığı (kartın tepesi) ve arama metni. */
  titleOf: (r: HrRecord) => string
  /** Eski / yeni seçicisi aynı olamaz (bakım kayıtları). */
  distinct?: [string, string]
}

const STATUS_FIELD: Field = { key: 'status', label: 'Durum', type: 'status' } // 100199
const IMPORT_FIELD: Field = {
  key: 'importStatus',
  label: 'Aktarım Durumu',
  type: 'select',
  options: ['Aktif', 'Pasif'],
} // 100723
const TYPE_FIELD: Field = { key: 'type', label: 'Tip', type: 'select', options: ['Normal', 'Özel'] } // 100175
const COMPANIES_FIELD: Field = {
  key: 'companies',
  label: 'Şirketler',
  type: 'refMany',
  ref: 'sirketler',
  wide: true,
}
const CODE = (key: string): Field => ({ key, label: 'Kod', type: 'text', required: true }) // 100129
const DESC: Field = {
  key: 'description',
  label: 'Açıklama',
  type: 'text',
  required: true,
  wide: true,
} // 100022

/** Başvurulan kaydın görünen adı. */
export function refLabel(module: HrModule | undefined, id: unknown): string {
  if (!module) return ''
  const r = hrRecord(module, id)
  if (!r) return ''
  if (module === 'kullanicilar') return fullName(r)
  if (module === 'vardiya' || module === 'mesai') return r.name as string
  if (module === 'ozellikler') return r.caption as string
  return (r.description as string) ?? ''
}

const maintenance = (
  id: HrModule,
  label: string,
  oldLabel: string,
  newLabel: string,
  ref: HrModule,
  icon: LucideIcon,
): ModuleDef => ({
  id,
  label,
  icon,
  parent: 'bakim',
  view: 'table',
  deletable: true,
  columns: [
    { key: 'oldId', label: oldLabel, kind: 'ref', ref },
    { key: 'replaceId', label: newLabel, kind: 'ref', ref },
  ],
  sections: [
    {
      title: label,
      fields: [
        { key: 'oldId', label: oldLabel, type: 'ref', ref, required: true, wide: true },
        { key: 'replaceId', label: newLabel, type: 'ref', ref, required: true, wide: true },
      ],
    },
  ],
  titleOf: (r) => `${refLabel(ref, r.oldId)} → ${refLabel(ref, r.replaceId)}`,
  distinct: ['oldId', 'replaceId'],
})

const relations = (id: HrModule, label: string, icon: LucideIcon): ModuleDef => ({
  id,
  label,
  icon,
  parent: 'ozellik',
  view: 'relations',
  columns: [],
  sections: [],
  titleOf: (r) => refLabel('ozellikler', r.id),
})

export const MODULES: ModuleDef[] = [
  {
    id: 'kullanicilar',
    label: 'Kullanıcılar', // 100734
    icon: Users,
    view: 'table',
    status: true,
    company: true,
    columns: [
      { key: 'firstName', label: 'Adı Soyadı', kind: 'user' }, // 100131 / 100132
      { key: 'eMail', label: 'E-posta adresi' }, // 100476
      { key: 'departmentId', label: 'Departman', kind: 'ref', ref: 'departmanlar' }, // 100472
      { key: 'professionId', label: 'Ünvan', kind: 'ref', ref: 'unvanlar' }, // 100474
      { key: 'status', label: 'Durum', kind: 'status' },
    ],
    sections: [
      {
        title: 'Kullanıcı Bilgisi', // 103606
        fields: [
          { key: 'firstName', label: 'Adı', type: 'text', required: true },
          { key: 'lastName', label: 'Soyadı', type: 'text', required: true },
          { key: 'birthDate', label: 'Doğum Tarihi', type: 'date' }, // 100724
          { key: 'placeOfBirth', label: 'Doğum Yeri', type: 'text' }, // 102493
          {
            key: 'sex',
            label: 'Cinsiyet',
            type: 'select',
            options: ['Kadın', 'Erkek', 'Diğer', 'Belirtmek istemiyorum'],
          }, // 100727
          {
            key: 'maritalStatus',
            label: 'Medeni Hali',
            type: 'select',
            options: ['Bekar', 'Evli', 'Boşanmış'],
          }, // 102494
          { key: 'professionId', label: 'Ünvan', type: 'ref', ref: 'unvanlar' },
          {
            key: 'wayOfWork',
            label: 'Çalışma Şekli',
            type: 'select',
            options: ['Tam Zamanlı', 'Yarı Zamanlı', 'Taşeron', 'Stajyer'],
          }, // 102495
          {
            key: 'educationalStatus',
            label: 'Eğitim Durumu', // 102496
            type: 'select',
            options: [
              'Ortaöğretim Diploması',
              'Ön Lisans Derecesi',
              'Lisans Derecesi',
              'Yüksek Lisans Derecesi',
              'Doktora Derecesi',
            ],
          },
          { key: 'shiftId', label: 'Vardiya', type: 'ref', ref: 'vardiya' },
          { key: 'phone', label: 'Sabit Telefon', type: 'phone' }, // 102497
          { key: 'mobilePhone', label: 'Cep Telefonu', type: 'phone' }, // 102498
          { key: 'registrationNumber', label: 'Sicil Numarası', type: 'text' }, // 102504
          { key: 'identificationNumber', label: 'Vatandaşlık Numarası', type: 'text' }, // 102480
        ],
      },
      {
        title: 'Şirket Bilgisi', // 103607
        fields: [
          { key: 'username', label: 'Kullanıcı Adı', type: 'text', required: true }, // 100722
          { key: 'eMail', label: 'E-posta', type: 'email', required: true }, // 100509
          { key: 'departmentId', label: 'Departman', type: 'ref', ref: 'departmanlar' },
          STATUS_FIELD,
          IMPORT_FIELD,
          { key: 'employementStart', label: 'İşe Başlama Tarihi', type: 'date' }, // 100725
          { key: 'employementEnd', label: 'İşten Ayrılış Tarihi', type: 'date' }, // 100726
          {
            key: 'category',
            label: 'Kategori',
            type: 'select',
            options: ['Mavi Yakalı', 'Beyaz Yakalı'],
          }, // 100360
          TYPE_FIELD,
          COMPANIES_FIELD,
        ],
      },
      { title: 'Amirler', fields: [], custom: 'managers' }, // 103608
    ],
    titleOf: (r) => fullName(r),
  },
  {
    id: 'pozisyonlar',
    label: 'Pozisyonlar', // 100970
    icon: Briefcase,
    view: 'table',
    status: true,
    company: true,
    columns: [
      { key: 'positionCode', label: 'Kod', kind: 'mono' },
      { key: 'description', label: 'Açıklama' },
      { key: 'userId', label: 'Kullanıcı', kind: 'ref', ref: 'kullanicilar' }, // 100728
      { key: 'type', label: 'Tip' },
      { key: 'importedPosCode', label: 'Aktarılmış Pozisyon Kodu', kind: 'mono' }, // 100729
      { key: 'status', label: 'Durum', kind: 'status' },
    ],
    sections: [
      {
        title: 'Pozisyonlar',
        fields: [
          CODE('positionCode'),
          { key: 'userId', label: 'Kullanıcı', type: 'ref', ref: 'kullanicilar' },
          DESC,
          STATUS_FIELD,
          IMPORT_FIELD,
          { key: 'importedPosCode', label: 'Aktarılmış Pozisyon Kodu', type: 'text' },
          TYPE_FIELD,
          COMPANIES_FIELD,
        ],
      },
    ],
    titleOf: (r) => r.description as string,
  },
  {
    id: 'departmanlar',
    label: 'Departmanlar', // 100736
    icon: Building2,
    view: 'table',
    status: true,
    company: true,
    columns: [
      { key: 'departmentCode', label: 'Kod', kind: 'mono' },
      { key: 'description', label: 'Açıklama' },
      { key: 'managerUserId', label: 'Yönetici', kind: 'ref', ref: 'kullanicilar' }, // 100730
      {
        key: 'managerDepartmentId',
        label: 'Yönetici Departmanı',
        kind: 'ref',
        ref: 'departmanlar',
      }, // 100145
      { key: 'status', label: 'Durum', kind: 'status' },
    ],
    sections: [
      {
        title: 'Departmanlar',
        fields: [
          CODE('departmentCode'),
          { key: 'managerUserId', label: 'Yönetici', type: 'ref', ref: 'kullanicilar' },
          DESC,
          {
            key: 'managerDepartmentId',
            label: 'Yönetici Departmanı',
            type: 'ref',
            ref: 'departmanlar',
            wide: true,
          },
          STATUS_FIELD,
          IMPORT_FIELD,
          TYPE_FIELD,
          COMPANIES_FIELD,
        ],
      },
    ],
    titleOf: (r) => r.description as string,
  },
  {
    id: 'sirketler',
    label: 'Şirketler', // 101140
    icon: Landmark,
    view: 'table',
    status: true,
    columns: [
      { key: 'companyCode', label: 'Kod', kind: 'mono' },
      { key: 'description', label: 'Açıklama' },
      { key: 'sgkRegistrationNumber', label: 'SGK Sicil Numarası', kind: 'mono' }, // 102808
      { key: 'dangerCategory', label: 'İşyeri Tehlike Sınıfı' }, // 102807
      { key: 'status', label: 'Durum', kind: 'status' },
    ],
    sections: [
      {
        title: 'Şirketler',
        fields: [
          CODE('companyCode'),
          {
            key: 'dangerCategory',
            label: 'İşyeri Tehlike Sınıfı',
            type: 'select',
            options: ['Yok', 'Az tehlikeli', 'Tehlikeli', 'Çok tehlikeli'],
          },
          DESC,
          { key: 'sgkRegistrationNumber', label: 'SGK Sicil Numarası', type: 'text', wide: true },
          {
            key: 'currency',
            label: 'Döviz Türü',
            type: 'select',
            options: ['Türk Lirası', 'Amerikan Doları', 'Euro', 'Sterlin'],
          }, // 103123
          {
            key: 'exchange',
            label: 'Döviz İşlem Türü',
            type: 'select',
            options: ['Döviz Satış', 'Döviz Alış', 'Efektif Satış', 'Efektif Alış'],
          }, // 103124
          STATUS_FIELD,
          IMPORT_FIELD,
        ],
      },
    ],
    titleOf: (r) => r.description as string,
  },
  {
    id: 'unvanlar',
    label: 'Ünvanlar', // 100735
    icon: Award,
    view: 'table',
    status: true,
    company: true,
    columns: [
      { key: 'professionCode', label: 'Kod', kind: 'mono' },
      { key: 'description', label: 'Açıklama' },
      { key: 'type', label: 'Tip' },
      { key: 'status', label: 'Durum', kind: 'status' },
    ],
    sections: [
      {
        title: 'Ünvanlar',
        fields: [
          CODE('professionCode'),
          TYPE_FIELD,
          DESC,
          STATUS_FIELD,
          IMPORT_FIELD,
          COMPANIES_FIELD,
        ],
      },
    ],
    titleOf: (r) => r.description as string,
  },
  {
    id: 'gruplar',
    label: 'Kullanıcı Grupları', // 100973
    icon: UsersRound,
    view: 'table',
    status: true,
    company: true,
    columns: [
      { key: 'groupCode', label: 'Grup Kodu', kind: 'mono' }, // 101339
      { key: 'description', label: 'Açıklama' },
      { key: 'members', label: 'Grup Üyeleri', kind: 'count' }, // 103254
      { key: 'status', label: 'Durum', kind: 'status' },
    ],
    sections: [
      {
        title: 'Kullanıcı Grupları',
        fields: [CODE('groupCode'), IMPORT_FIELD, DESC, STATUS_FIELD, COMPANIES_FIELD],
      },
    ],
    titleOf: (r) => r.description as string,
  },
  {
    id: 'sirket-yoneticileri',
    label: 'Şirket Yöneticileri', // 101374
    icon: ShieldCheck,
    view: 'admins',
    columns: [],
    sections: [],
    titleOf: () => '',
  },
  {
    id: 'yonetici-anahtarlari',
    label: 'Yönetici Anahtarları', // 101421
    icon: KeyRound,
    view: 'table',
    deletable: true,
    columns: [{ key: 'description', label: 'Açıklama' }],
    sections: [{ title: 'Yönetici Anahtarları', fields: [DESC, IMPORT_FIELD] }],
    titleOf: (r) => r.description as string,
  },
  {
    id: 'vardiya',
    label: 'Vardiya', // 102476
    icon: Clock,
    view: 'table',
    deletable: true,
    columns: [
      { key: 'name', label: 'Vardiya adı' }, // 102470
      { key: 'code', label: 'Vardiya kodu', kind: 'mono' }, // 102469
      { key: 'startTime', label: 'Zaman Aralığı', kind: 'timeRange' }, // 103449
    ],
    sections: [
      {
        title: 'Vardiya',
        fields: [
          { key: 'code', label: 'Kod', type: 'text', required: true },
          { key: 'name', label: 'Ad', type: 'text', required: true },
          { key: 'startTime', label: 'Başlangıç Saati', type: 'time', required: true }, // 103443
          { key: 'endTime', label: 'Bitiş Saati', type: 'time', required: true }, // 103444
          { key: 'totalMinute', label: 'Toplam Süre (Dakika)', type: 'number' }, // 102472
          { key: 'breakMinute', label: 'Mola Süresi (Dakika)', type: 'number' }, // 102473
          { key: 'timeZone', label: 'Saat dilimi', type: 'text', wide: true }, // 102210
        ],
      },
    ],
    titleOf: (r) => r.name as string,
  },
  {
    id: 'mesai',
    label: 'Mesai', // 102592
    icon: Timer,
    view: 'table',
    deletable: true,
    columns: [
      { key: 'name', label: 'Mesai adı' }, // 102590
      { key: 'code', label: 'Mesai kodu', kind: 'mono' }, // 102589
      { key: 'factor', label: 'Faktör', kind: 'factor' }, // 102591
    ],
    sections: [
      {
        title: 'Mesai',
        fields: [
          { key: 'code', label: 'Mesai kodu', type: 'text', required: true },
          { key: 'factor', label: 'Faktör', type: 'number', required: true },
          { key: 'name', label: 'Mesai adı', type: 'text', required: true, wide: true },
        ],
      },
    ],
    titleOf: (r) => r.name as string,
  },
  {
    id: 'maaslar',
    label: 'Maaşlar', // 102631
    icon: Wallet,
    view: 'table',
    columns: [
      { key: 'userId', label: 'Tam adı', kind: 'user' }, // 101982
      { key: 'startDate', label: 'Başlangıç Tarihi', kind: 'date' }, // 100995
      { key: 'endDate', label: 'Bitiş Tarihi', kind: 'date' }, // 100996
      { key: 'fee', label: 'Ücret', kind: 'money' }, // 102633
    ],
    sections: [
      {
        title: 'Maaşlar',
        fields: [
          {
            key: 'userId',
            label: 'Kullanıcı',
            type: 'ref',
            ref: 'kullanicilar',
            required: true,
            wide: true,
          },
          { key: 'startDate', label: 'Başlangıç Tarihi', type: 'date', required: true },
          { key: 'endDate', label: 'Bitiş Tarihi', type: 'date' },
          { key: 'fee', label: 'Ücret', type: 'money', required: true },
          {
            key: 'currency',
            label: 'Para Birimi',
            type: 'select',
            options: ['Türk Lirası', 'Amerikan Doları', 'Euro', 'Sterlin'],
          }, // 102634
        ],
      },
    ],
    titleOf: (r) => refLabel('kullanicilar', r.userId),
  },
  maintenance(
    'kullanici-bakimi',
    'Kullanıcı Bakımı',
    'Eski Kullanıcı',
    'Yeni Kullanıcı',
    'kullanicilar',
    UserCog,
  ), // 101142, 103457/58
  maintenance(
    'pozisyon-bakimi',
    'Pozisyon Bakımı',
    'Eski Pozisyon',
    'Yeni Pozisyon',
    'pozisyonlar',
    Briefcase,
  ), // 101144
  maintenance(
    'departman-bakimi',
    'Departman Bakımı',
    'Eski Departman',
    'Yeni Departman',
    'departmanlar',
    Building2,
  ), // 101143
  maintenance('unvan-bakimi', 'Ünvan Bakımı', 'Eski Ünvan', 'Yeni Ünvan', 'unvanlar', Award), // 101145
  {
    id: 'ozellikler',
    label: 'Özellikler', // 101206
    icon: FileCog,
    parent: 'ozellik',
    view: 'table',
    deletable: true,
    columns: [
      { key: 'propertyName', label: 'Kod', kind: 'mono' },
      { key: 'caption', label: 'Tanım' }, // 1010053
      { key: 'type', label: 'Tip' },
      { key: 'defaultValue', label: 'Varsayılan değer' }, // 100606
      { key: 'required', label: 'Gerekli', kind: 'bool' }, // 100507
    ],
    sections: [
      {
        title: 'Özellikler',
        fields: [
          { key: 'propertyName', label: 'Kod', type: 'text', required: true },
          {
            key: 'type',
            label: 'Tip',
            type: 'select',
            required: true,
            options: [
              'Metin',
              'Tamsayı',
              'Doğru / yanlış',
              'Tarih',
              'Liste',
              'Ondalık sayı',
              'Dosya',
            ],
          },
          { key: 'caption', label: 'Tanım', type: 'text', required: true, wide: true },
          { key: 'description', label: 'Açıklama', type: 'textarea', wide: true },
          { key: 'defaultValue', label: 'Varsayılan değer', type: 'text' },
          { key: 'required', label: 'Gerekli', type: 'bool' },
        ],
      },
    ],
    titleOf: (r) => r.caption as string,
  },
  relations('kullanici-ozellikleri', 'Kullanıcı Özellikleri', Users), // 101329
  relations('pozisyon-ozellikleri', 'Pozisyon Özellikleri', Briefcase), // 101330
  relations('unvan-ozellikleri', 'Ünvan Özellikleri', Award), // 101331
  relations('departman-ozellikleri', 'Departman Özellikleri', Building2), // 101332
  relations('grup-ozellikleri', 'Grup Özellikleri', UsersRound), // 101333
]

/** Menüdeki üst öğeler (alt modülleri açılır). */
export const PARENTS = {
  bakim: { label: 'Organizasyon Bakımı', icon: Wrench }, // 101327
  ozellik: { label: 'Özellik Tanımları', icon: SlidersHorizontal }, // 101328
} as const

/** Menü: üst düzey modüller, araya ince ayraçlar; bakım ve özellik tanımları açılır öğe. */
export const MENU: (HrModule | 'bakim' | 'ozellik' | '-')[] = [
  'kullanicilar',
  'pozisyonlar',
  'departmanlar',
  'sirketler',
  'unvanlar',
  'gruplar',
  '-',
  'sirket-yoneticileri',
  'yonetici-anahtarlari',
  '-',
  'vardiya',
  'mesai',
  'maaslar',
  '-',
  'bakim',
  'ozellik',
]

export const findModule = (id: string | undefined) => MODULES.find((m) => m.id === id)

/** Breadcrumb ikonu için. */
export const HR_ICON = ListTree
export const SHIFT_ICON = CalendarClock
