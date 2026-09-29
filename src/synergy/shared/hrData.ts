import { useSyncExternalStore } from 'react'

/* -------------------------------------------------------------------------------------------------
 * İnsan Kaynakları (orijinal modules/hr): organizasyon ana verisi — kullanıcılar, departmanlar,
 * pozisyonlar, ünvanlar, şirketler, gruplar, şirket yöneticileri, yönetici anahtarları, vardiya,
 * mesai, maaşlar, organizasyon bakımı ve özellik tanımları. Metinler orijinal tr_TR'den (kimlikler
 * yorumlarda). Maket veri; kayıtlar bellekteki küçük depoda (`saveRecord`, `deleteRecord`,
 * `useHrRecords`); sayfa yenilenince sıfırlanır.
 * ------------------------------------------------------------------------------------------------- */

export const HR_LABELS = {
  title: 'İnsan Kaynakları', // 101045
  new: 'Yeni', // 100657
  save: 'Kaydet', // 100620
  company: 'Şirket', // 101375
  companyPlaceholder: 'Şirket seçiniz.', // 103438
  all: 'Tümü', // 100298
  unassigned: 'Atanmamış', // 101420
  clearFilters: 'Filtreleri Temizle', // 100918
  search: 'Ara',
  required: 'Bu alan zorunludur.', // 103433
  fillRequired: 'Lütfen zorunlu alanları doldurunuz.', // 103562
  warning: 'Uyarı', // 100652
  success: 'Başarılı', // 101879
  info: 'Bilgilendirme', // 100713
  noData: 'Gösterilecek veri yok.',
  delete: 'Sil',
  deleteConfirm: 'Silmek istediğinize emin misiniz?', // 100653
  cancel: 'Vazgeç',
  status: 'Durum', // 100199
  active: 'Aktif', // 100392
  passive: 'Pasif', // 101256
  tempPassive: 'Geçici Pasif', // 101258
  userInfo: 'Kullanıcı Bilgisi', // 103606
  companyInfo: 'Şirket Bilgisi', // 103607
  managers: 'Amirler', // 103608
  pickManager: 'Yöneticiyi Seç', // 101285
  removeManager: 'Yöneticiyi Sil', // 101286
  managerKey: 'Anahtar', // 100356
  manager: 'Amir', // 103491
  groupMembers: 'Grup Üyeleri', // 103254
  manageMembers: 'Grup Üyelerini Yönet', // 103467
  sameUser: 'Eski kullanıcı ve yeni kullanıcı aynı kişi olamaz.', // 103569
  requiredChanged: 'Özellik zorunluluk durumu başarıyla değiştirildi.', // 101067
  orderChanged: 'Özelliklerin sırası başarıyla güncellendi.', // 103563
  relationAdded: 'Özellik ilişkisi oluşturuldu.', // 103820
  relationRemoved: 'Özellik ilişkisi kaldırıldı.', // 103821
} as const

export type HrStatus = 'Aktif' | 'Pasif' | 'Geçici Pasif'
export const STATUSES: HrStatus[] = ['Aktif', 'Pasif', 'Geçici Pasif']

/** Kaydın alanları modüle göre değişir; ortak olan yalnızca kimlik. */
export interface HrRecord {
  id: string
  [key: string]: unknown
}

export type HrModule =
  | 'kullanicilar'
  | 'departmanlar'
  | 'pozisyonlar'
  | 'unvanlar'
  | 'sirketler'
  | 'gruplar'
  | 'sirket-yoneticileri'
  | 'yonetici-anahtarlari'
  | 'vardiya'
  | 'mesai'
  | 'maaslar'
  | 'kullanici-bakimi'
  | 'pozisyon-bakimi'
  | 'departman-bakimi'
  | 'unvan-bakimi'
  | 'ozellikler'
  | 'kullanici-ozellikleri'
  | 'pozisyon-ozellikleri'
  | 'unvan-ozellikleri'
  | 'departman-ozellikleri'
  | 'grup-ozellikleri'

/* --- Maket veri -------------------------------------------------------------------------------- */

const companies: HrRecord[] = [
  {
    id: 'c1',
    companyCode: 'BMS',
    description: 'Bimser Çözüm A.Ş.',
    sgkRegistrationNumber: '4.6201.01.01.1234567.034.01.12',
    dangerCategory: 'Az tehlikeli',
    currency: 'Türk Lirası',
    exchange: 'Döviz Satış',
    importStatus: 'Aktif',
    status: 'Aktif',
  },
  {
    id: 'c2',
    companyCode: 'BMSU',
    description: 'Bimser Üretim Ltd. Şti.',
    sgkRegistrationNumber: '2.2511.01.01.7654321.041.03.44',
    dangerCategory: 'Tehlikeli',
    currency: 'Türk Lirası',
    exchange: 'Döviz Alış',
    importStatus: 'Aktif',
    status: 'Aktif',
  },
  {
    id: 'c3',
    companyCode: 'BMSD',
    description: 'Bimser Dış Ticaret A.Ş.',
    sgkRegistrationNumber: '4.4690.01.01.1122334.034.02.09',
    dangerCategory: 'Az tehlikeli',
    currency: 'Euro',
    exchange: 'Efektif Satış',
    importStatus: 'Pasif',
    status: 'Aktif',
  },
]

const professions: HrRecord[] = [
  ['UNV-01', 'Genel Müdür'],
  ['UNV-02', 'Direktör'],
  ['UNV-03', 'Müdür'],
  ['UNV-04', 'Takım Lideri'],
  ['UNV-05', 'Kıdemli Uzman'],
  ['UNV-06', 'Uzman'],
  ['UNV-07', 'Uzman Yardımcısı'],
  ['UNV-08', 'Mühendis'],
  ['UNV-09', 'Teknisyen'],
  ['UNV-10', 'Stajyer'],
].map(([code, description], i) => ({
  id: `p${i + 1}`,
  professionCode: code,
  description,
  status: i === 9 ? 'Pasif' : 'Aktif',
  importStatus: 'Aktif',
  type: 'Normal',
  companies: i < 8 ? ['c1', 'c2'] : ['c1'],
}))

const departments: HrRecord[] = [
  ['GM', 'Genel Müdürlük', null],
  ['FIN', 'Finans', 'd1'],
  ['MUH', 'Muhasebe', 'd2'],
  ['IK', 'İnsan Kaynakları', 'd1'],
  ['BT', 'Bilgi Teknolojileri', 'd1'],
  ['YZL', 'Yazılım Geliştirme', 'd5'],
  ['ALT', 'Altyapı ve Destek', 'd5'],
  ['SAT', 'Satış', 'd1'],
  ['PAZ', 'Pazarlama', 'd8'],
  ['URT', 'Üretim', 'd1'],
  ['KAL', 'Kalite', 'd10'],
  ['LOJ', 'Lojistik', 'd10'],
].map(([code, description, parent], i) => ({
  id: `d${i + 1}`,
  departmentCode: code,
  description,
  managerDepartmentId: parent,
  managerUserId: null,
  status: i === 11 ? 'Geçici Pasif' : 'Aktif',
  importStatus: 'Aktif',
  type: 'Normal',
  companies: i >= 9 ? ['c2'] : ['c1'],
}))

const FIRST = [
  'Ahmet',
  'Zeynep',
  'Mert',
  'Elif',
  'Burak',
  'Selin',
  'Emre',
  'Deniz',
  'Kerem',
  'Ayşe',
  'Murat',
  'Ece',
  'Can',
  'Derya',
  'Oğuz',
  'Buse',
  'Serkan',
  'Gizem',
  'Tolga',
  'İrem',
  'Hakan',
  'Merve',
  'Onur',
  'Pınar',
  'Barış',
  'Sena',
  'Yiğit',
  'Nazlı',
  'Kaan',
  'Fatma',
]
const LAST = [
  'Yıldız',
  'Kara',
  'Demir',
  'Aydın',
  'Şahin',
  'Koç',
  'Arslan',
  'Öztürk',
  'Aksoy',
  'Çelik',
  'Kılıç',
  'Yalçın',
  'Erdem',
  'Güneş',
  'Polat',
  'Tekin',
  'Bulut',
  'Kurt',
  'Özdemir',
  'Aslan',
  'Doğan',
  'Kaya',
  'Avcı',
  'Uçar',
  'Er',
  'Taş',
  'Ateş',
  'Keskin',
  'Sezer',
  'Tan',
]
const ascii = (s: string) =>
  s
    .toLocaleLowerCase('tr')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u')
    .replaceAll('i̇', 'i')

const users: HrRecord[] = FIRST.map((first, i) => {
  const last = LAST[i]!
  const dep = departments[(i * 5 + 2) % departments.length]!
  const prof = professions[Math.min(9, (i * 3) % 10)]!
  const username = `${ascii(first)}.${ascii(last)}`
  return {
    id: `u${i + 1}`,
    username,
    firstName: first,
    lastName: last,
    eMail: `${username}@bimser.com.tr`,
    departmentId: dep.id,
    professionId: prof.id,
    status: i % 11 === 10 ? 'Pasif' : i % 13 === 12 ? 'Geçici Pasif' : 'Aktif',
    importStatus: 'Aktif',
    birthDate: `${1978 + (i % 20)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
    placeOfBirth: ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Eskişehir', 'Trabzon'][i % 6],
    sex: i % 2 ? 'Erkek' : 'Kadın',
    maritalStatus: ['Bekar', 'Evli', 'Evli', 'Boşanmış'][i % 4],
    wayOfWork: i % 9 === 8 ? 'Yarı Zamanlı' : i === 29 ? 'Stajyer' : 'Tam Zamanlı',
    educationalStatus: [
      'Lisans Derecesi',
      'Yüksek Lisans Derecesi',
      'Ön Lisans Derecesi',
      'Doktora Derecesi',
    ][i % 4],
    shiftId: i % 5 === 4 ? 's2' : 's1',
    phone: `0216 555 ${String(10 + i).padStart(2, '0')} ${String(20 + i).padStart(2, '0')}`,
    mobilePhone: `0532 ${String(100 + i * 7).slice(-3)} ${String(10 + i).padStart(2, '0')} ${String(40 + i).padStart(2, '0')}`,
    registrationNumber: `SCL-${String(1040 + i)}`,
    identificationNumber: `${10000000000 + i * 7919}`.slice(0, 11),
    employementStart: `${2012 + (i % 13)}-${String((i % 12) + 1).padStart(2, '0')}-01`,
    employementEnd: i % 11 === 10 ? '2026-06-30' : '',
    category: i % 3 === 2 ? 'Mavi Yakalı' : 'Beyaz Yakalı',
    type: 'Normal',
    companies: dep.companies,
  }
})

// Departman yöneticileri
departments.forEach((d, i) => (d.managerUserId = users[(i * 7) % users.length]!.id))

const positions: HrRecord[] = users.slice(0, 16).map((u, i) => ({
  id: `po${i + 1}`,
  positionCode: `POZ-${String(100 + i)}`,
  description: `${departments.find((d) => d.id === u.departmentId)!.description as string} · ${professions.find((p) => p.id === u.professionId)!.description as string}`,
  userId: u.id,
  type: i % 6 === 5 ? 'Özel' : 'Normal',
  importedPosCode: i % 4 === 0 ? `IMP-${2200 + i}` : '',
  importStatus: i % 4 === 0 ? 'Aktif' : 'Pasif',
  status: i === 15 ? 'Pasif' : 'Aktif',
  companies: u.companies,
}))

const groups: HrRecord[] = [
  ['GRP-YON', 'Yönetim Kurulu', [0, 7, 14]],
  ['GRP-BT', 'BT Onay Grubu', [4, 9, 17, 21]],
  ['GRP-SAT', 'Satınalma Komitesi', [1, 2, 5, 11, 20]],
  ['GRP-IK', 'İK Değerlendirme', [5, 12, 18]],
  ['GRP-KAL', 'Kalite Kurulu', [3, 10, 16, 24, 27]],
  ['GRP-TUM', 'Tüm Çalışanlar', users.map((_, i) => i)],
].map(([code, description, members], i) => ({
  id: `g${i + 1}`,
  groupCode: code,
  description,
  status: 'Aktif',
  importStatus: 'Aktif',
  members: (members as number[]).map((m) => users[m]!.id),
  companies: ['c1'],
}))

const managerKeys: HrRecord[] = [
  'Birinci Amir',
  'İkinci Amir',
  'Bütçe Onaycısı',
  'İzin Onaycısı',
].map((description, i) => ({
  id: `mk${i + 1}`,
  description,
  importStatus: 'Aktif',
}))

/** Kullanıcının amirleri (anahtar → amir). */
users.forEach((u, i) => {
  u.managers = [
    { keyId: 'mk1', userId: users[(i + 7) % users.length]!.id },
    ...(i % 3 === 0 ? [{ keyId: 'mk2', userId: users[(i + 14) % users.length]!.id }] : []),
  ]
})

/** Şirket yöneticileri: şirket → kullanıcı kimlikleri. */
const companyAdmins: Record<string, string[]> = { c1: ['u1', 'u6', 'u15'], c2: ['u10'], c3: [] }

const shifts: HrRecord[] = [
  {
    id: 's1',
    code: 'VRD-GND',
    name: 'Gündüz',
    startTime: '08:30',
    endTime: '17:30',
    totalMinute: 540,
    breakMinute: 60,
    timeZone: 'Europe/Istanbul',
  },
  {
    id: 's2',
    code: 'VRD-AKS',
    name: 'Akşam',
    startTime: '16:00',
    endTime: '00:00',
    totalMinute: 480,
    breakMinute: 45,
    timeZone: 'Europe/Istanbul',
  },
  {
    id: 's3',
    code: 'VRD-GEC',
    name: 'Gece',
    startTime: '00:00',
    endTime: '08:00',
    totalMinute: 480,
    breakMinute: 45,
    timeZone: 'Europe/Istanbul',
  },
  {
    id: 's4',
    code: 'VRD-YRM',
    name: 'Yarım Gün',
    startTime: '09:00',
    endTime: '13:00',
    totalMinute: 240,
    breakMinute: 15,
    timeZone: 'Europe/Istanbul',
  },
]

const overtimes: HrRecord[] = [
  { id: 'o1', code: 'MS-HI', name: 'Hafta içi fazla mesai', factor: 1.5 },
  { id: 'o2', code: 'MS-HS', name: 'Hafta sonu mesaisi', factor: 2 },
  { id: 'o3', code: 'MS-RT', name: 'Resmi tatil mesaisi', factor: 2.5 },
  { id: 'o4', code: 'MS-GC', name: 'Gece mesaisi', factor: 1.75 },
]

const salaries: HrRecord[] = users.slice(0, 18).map((u, i) => ({
  id: `sa${i + 1}`,
  userId: u.id,
  startDate: `2026-0${(i % 6) + 1}-01`,
  endDate: i % 5 === 0 ? '2026-12-31' : '',
  fee: 42_000 + ((i * 7_350) % 96_000),
  currency: i % 7 === 6 ? 'Euro' : 'Türk Lirası',
}))

const maint = (prefix: string, list: HrRecord[], pairs: [number, number][]): HrRecord[] =>
  pairs.map(([a, b], i) => ({
    id: `${prefix}${i + 1}`,
    oldId: list[a]!.id,
    replaceId: list[b]!.id,
  }))

const propertyTypes: HrRecord[] = [
  ['kanGrubu', 'Kan Grubu', 'Acil durum kartı için', 'Liste', 'A Rh+', false],
  ['aracPlakasi', 'Araç Plakası', 'Otopark kaydı', 'Metin', '', false],
  ['beden', 'Kıyafet Bedeni', 'İş kıyafeti dağıtımı', 'Liste', 'M', false],
  [
    'uzaktan',
    'Uzaktan Çalışma',
    'Haftada 2 gün uzaktan çalışma hakkı',
    'Doğru / yanlış',
    'Hayır',
    false,
  ],
  ['kidem', 'Kıdem Yılı', 'Otomatik hesaplanan kıdem', 'Tamsayı', '0', true],
  ['maliyetMerkezi', 'Maliyet Merkezi', 'Bütçe dağılımı', 'Metin', '', true],
  ['sozlesmeBitis', 'Sözleşme Bitişi', 'Belirli süreli sözleşmeler', 'Tarih', '', false],
  ['cvDosyasi', 'Özgeçmiş', 'Özgeçmiş dosyası', 'Dosya', '', false],
].map(([propertyName, caption, description, type, defaultValue, required], i) => ({
  id: `pt${i + 1}`,
  propertyName,
  caption,
  description,
  type,
  defaultValue,
  required,
}))

/** Nesneye bağlı özellikler: sıralı liste (kimlik + zorunlu mu). */
const relation = (ids: number[], required: number[] = []): HrRecord[] =>
  ids.map((n, i) => ({ id: propertyTypes[n]!.id, order: i, required: required.includes(n) }))

/* --- Depo -------------------------------------------------------------------------------------- */

type Store = Record<HrModule, HrRecord[]> & { companyAdmins: Record<string, string[]> }

let store: Store = {
  kullanicilar: users,
  departmanlar: departments,
  pozisyonlar: positions,
  unvanlar: professions,
  sirketler: companies,
  gruplar: groups,
  'sirket-yoneticileri': [],
  'yonetici-anahtarlari': managerKeys,
  vardiya: shifts,
  mesai: overtimes,
  maaslar: salaries,
  'kullanici-bakimi': maint('ub', users, [
    [10, 3],
    [21, 6],
    [12, 25],
  ]),
  'pozisyon-bakimi': maint('pb', positions, [
    [15, 2],
    [7, 9],
  ]),
  'departman-bakimi': maint('db', departments, [
    [11, 10],
    [8, 7],
  ]),
  'unvan-bakimi': maint('nb', professions, [[9, 6]]),
  ozellikler: propertyTypes,
  'kullanici-ozellikleri': relation([0, 1, 2, 3, 4, 7], [4]),
  'pozisyon-ozellikleri': relation([5, 6], [5]),
  'unvan-ozellikleri': relation([4]),
  'departman-ozellikleri': relation([5], [5]),
  'grup-ozellikleri': relation([]),
  companyAdmins,
}

const listeners = new Set<() => void>()
const commit = (next: Partial<Store>) => {
  store = { ...store, ...next }
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Modülün kayıtları (değişince yeniden çizer). */
export function useHrRecords(module: HrModule): HrRecord[] {
  return useSyncExternalStore(
    subscribe,
    () => store[module],
    () => store[module],
  )
}

/** Kaydı modülün listesinden (anlık; bileşen dışı). */
export function hrRecord(module: HrModule, id: unknown): HrRecord | undefined {
  return typeof id === 'string' ? store[module].find((r) => r.id === id) : undefined
}

export function hrRecords(module: HrModule): HrRecord[] {
  return store[module]
}

let seq = 1000

/** Kaydı ekler ya da günceller; kimliği döner. */
export function saveRecord(module: HrModule, rec: HrRecord): string {
  const list = store[module]
  const id = rec.id || `${module}-${seq++}`
  const exists = list.some((r) => r.id === id)
  commit({
    [module]: exists
      ? list.map((r) => (r.id === id ? { ...rec, id } : r))
      : [...list, { ...rec, id }],
  } as Partial<Store>)
  return id
}

export function deleteRecord(module: HrModule, id: string) {
  commit({ [module]: store[module].filter((r) => r.id !== id) } as Partial<Store>)
}

/** Sıralı ilişki listesini (özellik ilişkileri) topluca yazar. */
export function setRecords(module: HrModule, list: HrRecord[]) {
  commit({ [module]: list } as Partial<Store>)
}

/* --- Şirket yöneticileri ----------------------------------------------------------------------- */

export function useCompanyAdmins(): Record<string, string[]> {
  return useSyncExternalStore(
    subscribe,
    () => store.companyAdmins,
    () => store.companyAdmins,
  )
}

/** Kullanıcıyı şirketin yöneticisi yapar / kaldırır (UpdateAdminsOfCompany). */
export function setCompanyAdmin(companyId: string, userId: string, admin: boolean) {
  const cur = store.companyAdmins[companyId] ?? []
  const next = admin ? [...new Set([...cur, userId])] : cur.filter((x) => x !== userId)
  commit({ companyAdmins: { ...store.companyAdmins, [companyId]: next } })
}

/* --- Yardımcılar ------------------------------------------------------------------------------- */

export const fullName = (u: HrRecord | undefined) =>
  u ? `${u.firstName as string} ${u.lastName as string}` : ''

/** "2026-03-01" → "1 Mart 2026". */
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
export function formatDay(v: unknown) {
  if (typeof v !== 'string' || !v) return ''
  const [y, m, d] = v.split('-').map(Number)
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`
}

const CURRENCY_CODE: Record<string, string> = {
  'Türk Lirası': 'TRY',
  'Amerikan Doları': 'USD',
  Euro: 'EUR',
  Sterlin: 'GBP',
}

export function formatMoney(fee: unknown, currency: unknown) {
  if (typeof fee !== 'number') return ''
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: CURRENCY_CODE[currency as string] ?? 'TRY',
    maximumFractionDigits: 0,
  }).format(fee)
}
