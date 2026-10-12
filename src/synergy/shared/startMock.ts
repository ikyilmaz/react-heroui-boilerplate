import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  Code,
  Database,
  KeyRound,
  ListChecks,
  PanelsTopLeft,
  Shield,
} from 'lucide-react'
import { people, type Person } from '@/synergy/shared/workflowData'

/* -------------------------------------------------------------------------------------------------
 * Başlat kutusunun orijinalden gelen bölümleri için örnek veriler (açık istek üzerine eklenen
 * maketler): Duyurular (101048), Aktiviteler (102820), Vekaletler (100043), Yönetim Araçları
 * (100676). Sayfaları yok; etiketler orijinalin tr_TR yerelleştirmesinden, tarihler bugüne göre.
 * ------------------------------------------------------------------------------------------------- */

export const START_MOCK_LABELS = {
  announcements: 'Duyurular', // 101048
  all: 'Tümü', // 100298
  activities: 'Aktiviteler', // 102820
  delegations: 'Vekaletler', // 100043
  given: 'Verdiğim Vekaletler',
  received: 'Aldığım Vekaletler',
  adminTools: 'Yönetim Araçları', // 100676
  active: 'Aktif',
  planned: 'Planlı',
  ended: 'Bitti',
  allFlows: 'Tüm akışlar',
} as const

/** Gün ve ay ("11 Ekim"); vekalet aralıkları için. */
export const formatDay = (d: Date) =>
  d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })

const ago = (hours: number) => new Date(Date.now() - hours * 60 * 60 * 1000)
const ahead = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000)

export interface Announcement {
  id: string
  title: string
  summary: string
  date: Date
  unread: boolean
}

export const announcements: Announcement[] = [
  {
    id: 'a1',
    title: 'Yıl sonu envanter sayımı',
    summary:
      'Depo sayımı 20–22 Ekim tarihlerinde yapılacak; stok hareketleri o günlerde kapalı olacak.',
    date: ago(3),
    unread: true,
  },
  {
    id: 'a2',
    title: 'Yeni masraf bildirimi formu',
    summary:
      'Masraf Bildirimi formu güncellendi: fiş ekleri artık zorunlu, limitler departmana göre.',
    date: ago(28),
    unread: true,
  },
  {
    id: 'a3',
    title: 'Bakım duyurusu',
    summary: 'Cumartesi 02:00–05:00 arasında sistem bakımda olacak.',
    date: ago(50),
    unread: false,
  },
  {
    id: 'a4',
    title: 'Eğitim takvimi yayınlandı',
    summary: 'Kasım ayı eğitimleri Eğitim Kataloğu uygulamasında.',
    date: ago(96),
    unread: false,
  },
  {
    id: 'a5',
    title: 'Araç tahsis kuralları',
    summary: 'Şirket araçları için tahsis talepleri en az iki gün önceden açılmalı.',
    date: ago(160),
    unread: false,
  },
]

export interface Activity {
  id: string
  who: Person
  /** Ne yaptı ("yorum yaptı", "sizi etiketledi", "belge ekledi"). */
  action: string
  /** Nerede (talep, doküman). */
  target: string
  /** Yorum metni (varsa). */
  text?: string
  date: Date
  unread: boolean
}

export const activities: Activity[] = [
  {
    id: 'c1',
    who: people[0]!,
    action: 'sizi etiketledi',
    target: 'Satın Alma Talebi · 20000',
    text: '@Fatma teklifleri karşılaştırabilir misin?',
    date: ago(1),
    unread: true,
  },
  {
    id: 'c2',
    who: people[3]!,
    action: 'yorum yaptı',
    target: 'Doküman Revizyon Onayı · 20412',
    text: 'Revizyon notları eklendi, onaya hazır.',
    date: ago(4),
    unread: true,
  },
  {
    id: 'c3',
    who: people[6]!,
    action: 'belge ekledi',
    target: 'Yazılım Erişim Yetkisi · 20808',
    date: ago(9),
    unread: false,
  },
  {
    id: 'c4',
    who: people[4]!,
    action: 'yorum yaptı',
    target: 'Masraf Bildirimi · 25273',
    text: 'Fiş ekini güncelledim.',
    date: ago(27),
    unread: false,
  },
  {
    id: 'c5',
    who: people[5]!,
    action: 'sizi etiketledi',
    target: 'Yıllık İzin Talebi · 21190',
    text: '@Fatma onayınızı bekliyoruz.',
    date: ago(31),
    unread: false,
  },
  {
    id: 'c6',
    who: people[2]!,
    action: 'tepki verdi',
    target: 'Satın Alma Prosedürü v4.docx',
    date: ago(55),
    unread: false,
  },
]

export interface Delegation {
  id: string
  person: Person
  /** Kapsam: tüm akışlar ya da süreç adları. */
  scope: string
  start: Date
  end: Date
}

export const givenDelegations: Delegation[] = [
  {
    id: 'g1',
    person: people[1]!,
    scope: START_MOCK_LABELS.allFlows,
    start: ago(24),
    end: ahead(5),
  },
  {
    id: 'g2',
    person: people[0]!,
    scope: 'Masraf Bildirimi, Satın Alma Talebi',
    start: ahead(10),
    end: ahead(17),
  },
]

export const receivedDelegations: Delegation[] = [
  { id: 'r1', person: people[7]!, scope: 'Araç Tahsis Talebi', start: ago(72), end: ahead(2) },
  {
    id: 'r2',
    person: people[3]!,
    scope: START_MOCK_LABELS.allFlows,
    start: ago(400),
    end: ago(300),
  },
]

/** Vekaletin durumu (bugüne göre). */
export function delegationState(d: Delegation): 'active' | 'planned' | 'ended' {
  const now = Date.now()
  if (d.end.getTime() < now) return 'ended'
  if (d.start.getTime() > now) return 'planned'
  return 'active'
}

export interface AdminTool {
  id: string
  label: string
  icon: LucideIcon
}

/** Yönetim Araçları (orijinal AdminToolsPopover sırası; yalnızca kısayol, sayfaları yok). */
export const adminTools: AdminTool[] = [
  { id: 'ide', label: 'IDE', icon: Code }, // 103807
  { id: 'guvenlik', label: 'Güvenlik', icon: Shield }, // 101210
  { id: 'uygulama-gezgini', label: 'Uygulama Gezgini', icon: PanelsTopLeft }, // 101793
  { id: 'veri-turleri', label: 'Veri Türleri', icon: Database }, // 102893
  { id: 'indeks-raporu', label: 'İndeks Raporu', icon: BarChart3 }, // 101028
  { id: 'gorev-yonetimi', label: 'Görev Yönetimi', icon: ListChecks }, // 102852
  { id: 'lisans', label: 'Lisans Yönetimi', icon: KeyRound }, // 103315
]
