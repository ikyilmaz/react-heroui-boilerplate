import type { LucideIcon } from 'lucide-react'
import {
  Archive,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  Image,
  Presentation,
  ShieldCheck,
  Users,
} from 'lucide-react'

/* -------------------------------------------------------------------------------------------------
 * Doküman Yönetimi (başlat kutusunun sekmesi; açık istek üzerine eklenen maket): son kullanılan
 * dokümanlar ve son kullanılan depolar. Sayfası yok, veriler örnek; tarihler bugüne göre.
 * ------------------------------------------------------------------------------------------------- */

export const DOC_LABELS = {
  title: 'Doküman Yönetimi',
  recentDocs: 'Son Kullanılan Dokümanlar',
  recentRepos: 'Son Kullanılan Depolar',
  favorites: 'Favoriler', // 100862
  items: (n: number) => `${n} öğe`,
} as const

export interface RecentDocument {
  id: string
  name: string
  /** Bulunduğu depo. */
  repo: string
  icon: LucideIcon
  /** Son açılış. */
  openedAt: Date
}

export interface RecentRepository {
  id: string
  name: string
  icon: LucideIcon
  /** İçindeki öğe sayısı. */
  count: number
  openedAt: Date
}

const ago = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000)

export const recentDocuments: RecentDocument[] = [
  {
    id: 'd1',
    name: 'Satın Alma Prosedürü v4.docx',
    repo: 'Kalite Dokümanları',
    icon: FileText,
    openedAt: ago(1),
  },
  {
    id: 'd2',
    name: '2026 Q4 Bütçe Takip.xlsx',
    repo: 'Finans',
    icon: FileSpreadsheet,
    openedAt: ago(5),
  },
  {
    id: 'd3',
    name: 'Tedarikçi Değerlendirme Formu.docx',
    repo: 'Satın Alma',
    icon: FileText,
    openedAt: ago(26),
  },
  {
    id: 'd4',
    name: 'Yönetim Gözden Geçirme Sunumu.pptx',
    repo: 'Yönetim',
    icon: Presentation,
    openedAt: ago(30),
  },
  {
    id: 'd5',
    name: 'Organizasyon Şeması.png',
    repo: 'İnsan Kaynakları',
    icon: Image,
    openedAt: ago(52),
  },
  {
    id: 'd6',
    name: 'ISO 9001 İç Tetkik Raporu.pdf',
    repo: 'Kalite Dokümanları',
    icon: ShieldCheck,
    openedAt: ago(80),
  },
  {
    id: 'd7',
    name: 'Araç Kullanım Talimatı.docx',
    repo: 'İdari İşler',
    icon: FileText,
    openedAt: ago(120),
  },
  {
    id: 'd8',
    name: 'Eğitim Katılım Listesi.xlsx',
    repo: 'İnsan Kaynakları',
    icon: FileSpreadsheet,
    openedAt: ago(200),
  },
]

export const recentRepositories: RecentRepository[] = [
  { id: 'r1', name: 'Kalite Dokümanları', icon: ShieldCheck, count: 248, openedAt: ago(1) },
  { id: 'r2', name: 'Finans', icon: FolderArchive, count: 131, openedAt: ago(5) },
  { id: 'r3', name: 'Satın Alma', icon: Archive, count: 96, openedAt: ago(26) },
  { id: 'r4', name: 'İnsan Kaynakları', icon: Users, count: 412, openedAt: ago(52) },
  { id: 'r5', name: 'Yönetim', icon: Presentation, count: 37, openedAt: ago(30) },
  { id: 'r6', name: 'İdari İşler', icon: FolderArchive, count: 64, openedAt: ago(120) },
]

/** Favori dokümanlar (orijinal DM panosunun Favoriler alanı). */
export const favoriteDocuments: RecentDocument[] = [
  {
    id: 'f1',
    name: 'Çalışan El Kitabı.pdf',
    repo: 'İnsan Kaynakları',
    icon: FileText,
    openedAt: ago(70),
  },
  {
    id: 'f2',
    name: 'Kurumsal Kimlik Kılavuzu.pdf',
    repo: 'Yönetim',
    icon: Image,
    openedAt: ago(140),
  },
  {
    id: 'f3',
    name: 'Masraf Limitleri 2026.xlsx',
    repo: 'Finans',
    icon: FileSpreadsheet,
    openedAt: ago(20),
  },
  {
    id: 'f4',
    name: 'Tedarikçi Listesi.xlsx',
    repo: 'Satın Alma',
    icon: FileSpreadsheet,
    openedAt: ago(300),
  },
  {
    id: 'f5',
    name: 'Acil Durum Planı.docx',
    repo: 'İdari İşler',
    icon: FileText,
    openedAt: ago(600),
  },
]
