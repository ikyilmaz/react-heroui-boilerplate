import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { useDecisions, type DecisionRecord } from '@/pages/workflows/decisions'
import {
  LATE_DAYS,
  STUCK_DAYS,
  ageDays,
  byPriority,
  groupOf,
  processOf,
  processes,
  requestsOf,
  triageGroup,
  triageGroups,
  type BoxId,
  type Process,
  type Progress,
  type TriageGroup,
  type WorkRequest,
} from '@/pages/workflows/workflowData'
import {
  createStore,
  isSnoozed,
  isUnread,
  remindedToday,
  useAnswers,
  useReadOverrides,
  useReminders,
  useSnoozes,
} from '@/pages/workflows/triage'
import type { RowSection } from '@/pages/workspace/home/metrics'

/* -------------------------------------------------------------------------------------------------
 * Ana sayfanın veri kancaları
 *
 * Onay kuyruğu (`useTriage`), takip edilenler (`useFollowing`), taslaklar, bilgilendirmeler,
 * son kararlar ve karşılama cümlesi (`useGuidance`). Ana sayfa widget'ları talepleri yalnızca
 * buradan okur (`useHomeRequests`), böylece `?durum=` gösterim parametresi her yerde geçerli olur.
 * Sayılar yalnızca karar vermek (tekil / çoğul, hangi kural) için kullanılır; hiçbiri ekrana
 * yazılmaz.
 * ------------------------------------------------------------------------------------------------- */

/* ---- Gösterim parametresi ---------------------------------------------------------------------- */

/**
 * Boş durumları gözden geçirmek için: `?durum=bos` her listeyi, `?durum=onaylar-bitti` yalnızca
 * onay kuyruğunu boşaltır (maket).
 */
export type DemoState = 'bos' | 'onaylar-bitti' | null

export function useDemo(): DemoState {
  const v = new URLSearchParams(useLocation().search).get('durum')
  return v === 'bos' || v === 'onaylar-bitti' ? v : null
}

function demoEmpties(demo: DemoState, box: BoxId) {
  return demo === 'bos' || (demo === 'onaylar-bitti' && box === 'bekleyen')
}

const NONE: WorkRequest[] = []

/** Kutudaki talepler; "Bekleyen Onaylar"dan karar verilenler düşülür, `?durum=` uygulanır. */
export function useHomeRequests(box: BoxId): WorkRequest[] {
  const demo = useDemo()
  const decisions = useDecisions()
  return useMemo(() => {
    if (demoEmpties(demo, box)) return NONE
    const all = requestsOf(box)
    return box === 'bekleyen' ? all.filter((r) => !decisions.has(r.id)) : all
  }, [demo, box, decisions])
}

/* ---- Oturumda atlananlar ("Atla") -------------------------------------------------------------- */

const skipStore = createStore<readonly string[]>([])

/** Talebi bu oturum için kuyruğun sonuna atar (Atla, → / J). */
export function skip(id: string) {
  skipStore.set((list) => [...list.filter((x) => x !== id), id])
}

/** Atlanan talepler, atlanma sırasıyla. */
export function useSkipped(): readonly string[] {
  return skipStore.use()
}

/* ---- Onay kuyruğu ------------------------------------------------------------------------------ */

export interface Triage {
  /** Karar bekleyenler: karar verilen ve ertelenenler hariç, `byPriority`, atlananlar sonda. */
  all: WorkRequest[]
  /** Sıradaki iş (`all[0]`). */
  head: WorkRequest | undefined
  /** Aciliyet grupları; boş gruplar yok. */
  groups: { id: TriageGroup; label: string; hint?: string; rows: WorkRequest[] }[]
  /** Süreç grupları (`processes` sırasıyla); boş gruplar yok. */
  byProcess: { process: Process; rows: WorkRequest[] }[]
  /** Ertelenenler, en erken geri geleceği önce. */
  snoozed: WorkRequest[]
  hasUrgent: boolean
  /** LATE_DAYS'ten uzun bekleyen var. */
  hasLate: boolean
  hasToday: boolean
  isEmpty: boolean
  /** Kutu hiç dolmadı (ilk kullanım; `?durum=bos`). */
  everHad: boolean
}

function groupRows(all: readonly WorkRequest[]) {
  return triageGroups.map((g) => ({ ...g, rows: all.filter((r) => triageGroup(r) === g.id) })).filter((g) => g.rows.length > 0)
}

export function useTriage(): Triage {
  const demo = useDemo()
  const pending = useHomeRequests('bekleyen')
  const snoozes = useSnoozes()
  const skipped = useSkipped()

  return useMemo(() => {
    // Erteleme süresi dolan talep kendiliğinden döner (bir sonraki çizimde)
    const active = pending.filter((r) => !isSnoozed(r.id, snoozes)).sort(byPriority)
    const all = [...active.filter((r) => !skipped.includes(r.id)), ...skipped.flatMap((id) => active.filter((r) => r.id === id))]
    const snoozed = pending
      .filter((r) => isSnoozed(r.id, snoozes))
      .sort((a, b) => snoozes.get(a.id)!.getTime() - snoozes.get(b.id)!.getTime())
    return {
      all,
      head: all[0],
      groups: groupRows(all),
      byProcess: processes.map((process) => ({ process, rows: all.filter((r) => r.processId === process.id) })).filter((g) => g.rows.length > 0),
      snoozed,
      hasUrgent: all.some((r) => r.template.urgent),
      hasLate: all.some((r) => ageDays(r.createdAt) > LATE_DAYS),
      hasToday: all.some((r) => groupOf(r.createdAt) === 'Bugün'),
      isEmpty: all.length === 0,
      everHad: demo !== 'bos' && requestsOf('bekleyen').length > 0,
    }
  }, [demo, pending, snoozes, skipped])
}

export type QueueMode = 'aciliyet' | 'surec' | 'sade'

/**
 * Kuyruk widget'ının satır grupları (henüz sığdırılmamış; `fitRows` ile kırpın). `excludeHead`:
 * sıradaki iş kartı ilk talebi zaten gösteriyorsa kuyrukta tekrar etmesin (`board.excludeHead`).
 * Süreç kipinde grup kimliği `process.id`'dir (başlık ikonu için `findProcess(section.id)`).
 */
export function queueSections(triage: Triage, mode: string, excludeHead: boolean): RowSection<WorkRequest>[] {
  const rows = excludeHead && triage.head ? triage.all.filter((r) => r.id !== triage.head!.id) : triage.all
  if (mode === 'surec') {
    return processes
      .map((p) => ({ id: p.id, label: p.name, headed: true, rows: rows.filter((r) => r.processId === p.id) }))
      .filter((s) => s.rows.length > 0)
  }
  if (mode === 'sade') return rows.length ? [{ id: 'hepsi', label: 'Onayınızı bekleyenler', headed: false, rows }] : []
  return groupRows(rows).map((g) => ({ id: g.id, label: g.label, hint: g.hint, headed: true, rows: g.rows }))
}

/** Sırayla ilerlerken (ya da karardan sonra) sıradaki talep: mevcut olmayan ilk talep. */
export function sequenceNext(all: readonly WorkRequest[], currentId: string | undefined) {
  return all.find((r) => r.id !== currentId)
}

/* ---- Takip edilenler --------------------------------------------------------------------------- */

export type FollowState = 'ilerliyor' | 'bilgi-istendi'

export interface FollowRow {
  r: WorkRequest
  process: Process
  progress: Progress
  /** Etkin durum: yanıt verildiyse `ilerliyor`. */
  state: FollowState
  /** STUCK_DAYS'ten uzun aynı adımda (bilgi istenenler hariç); sıralama bunu kullanır. */
  aged: boolean
  /** `aged` ve bugün hatırlatılmadı → "Hatırlat". */
  stuck: boolean
  /** Bugün hatırlatıldı → soluk "Hatırlatıldı". */
  reminded: boolean
  /** Satır sonundaki eylem. */
  trailing: 'yanitla' | 'hatirlat' | 'hatirlatildi' | null
  /** Şu anki adımın adı (`process.steps[progress.step]`). */
  stepLabel: string
}

/**
 * Takip satırları, sıralı: önce bilgi istenenler, sonra takılanlar (en eski önce), sonra
 * diğerleri (en yeni önce). Hatırlatılan satır, takılanların arasında yerini korur; düğmeye
 * basınca satır imlecin altından kaçmasın.
 */
export function useFollowing(scope: 'baslattiklarim' | 'devam-eden'): FollowRow[] {
  const rows = useHomeRequests(scope)
  const answers = useAnswers()
  const reminders = useReminders()
  return useMemo(() => {
    const out = rows
      .filter((r): r is WorkRequest & { progress: Progress } => !!r.progress)
      .map((r): FollowRow => {
        const process = processOf(r)
        const state: FollowState = answers.has(r.id) ? 'ilerliyor' : r.progress.state
        const reminded = remindedToday(r.id, reminders)
        const aged = state !== 'bilgi-istendi' && ageDays(r.progress.since) > STUCK_DAYS
        const stuck = aged && !reminded
        return {
          r,
          process,
          progress: r.progress,
          state,
          stuck,
          reminded,
          aged,
          trailing: state === 'bilgi-istendi' ? 'yanitla' : stuck ? 'hatirlat' : reminded ? 'hatirlatildi' : null,
          stepLabel: process.steps[r.progress.step] ?? '',
        }
      })
    const rank = (x: { state: FollowState; aged: boolean }) => (x.state === 'bilgi-istendi' ? 0 : x.aged ? 1 : 2)
    out.sort((a, b) => {
      const d = rank(a) - rank(b)
      if (d) return d
      const sa = a.progress.since.getTime()
      const sb = b.progress.since.getTime()
      return rank(a) === 1 ? sa - sb : sb - sa
    })
    return out
  }, [rows, answers, reminders])
}

/* ---- Taslaklar, bilginize, son kararlar -------------------------------------------------------- */

const newestFirst = (a: WorkRequest, b: WorkRequest) => b.createdAt.getTime() - a.createdAt.getTime()

/** Yarım kalan taslaklar, en yeni önce. */
export function useDrafts(): WorkRequest[] {
  const rows = useHomeRequests('taslaklar')
  return useMemo(() => [...rows].sort(newestFirst), [rows])
}

export interface FyiRow {
  r: WorkRequest
  unread: boolean
}

/** Bilginize sunulanlar, en yeni önce, okunmadı bilgisiyle. */
export function useFyi(): FyiRow[] {
  const rows = useHomeRequests('bilgilendirmeler')
  const overrides = useReadOverrides()
  return useMemo(() => [...rows].sort(newestFirst).map((r) => ({ r, unread: isUnread(r, overrides) })), [rows, overrides])
}

export interface DecidedRow {
  r: WorkRequest
  record: DecisionRecord
}

/** Bu oturumda verilen kararlar, en yeni önce (bellekte; yenilemede sıfırlanır). */
export function useDecided(): DecidedRow[] {
  const demo = useDemo()
  const decisions = useDecisions()
  return useMemo(() => {
    if (demo === 'bos') return []
    const pending = requestsOf('bekleyen')
    return [...decisions.entries()]
      .flatMap(([id, record]) => {
        const r = pending.find((x) => x.id === id)
        return r ? [{ r, record }] : []
      })
      .sort((a, b) => b.record.at.getTime() - a.record.at.getTime())
  }, [demo, decisions])
}

/* ---- "Bu arada" satırları ---------------------------------------------------------------------- */

export type MeanwhileLine =
  | { kind: 'bilgi'; row: FollowRow; text: 'Bir talebiniz için sizden bilgi istendi'; linkLabel: 'Yanıtlayın' }
  | { kind: 'taslak'; r: WorkRequest; text: 'Yarım kalan bir taslağınız var'; linkLabel: 'Devam edin' }
  | { kind: 'takildi'; row: FollowRow; text: string; buttonLabel: 'Hatırlat' }

/**
 * Tümü bitti ekranındaki en fazla iki "Bu arada" satırı; yalnızca doğru olanlar. Bilgi isteği
 * → `openPeek(row.r.id, 'following')`; taslak → `openPeek(r.id, 'drafts')`; takılan →
 * `remindWithToast(row.r)` ("{başlık} uzun süredir aynı adımda").
 */
export function useMeanwhile(): MeanwhileLine[] {
  const started = useFollowing('baslattiklarim')
  const involved = useFollowing('devam-eden')
  const drafts = useDrafts()
  return useMemo(() => {
    const lines: MeanwhileLine[] = []
    const info = started.find((x) => x.state === 'bilgi-istendi') ?? involved.find((x) => x.state === 'bilgi-istendi')
    if (info) lines.push({ kind: 'bilgi', row: info, text: 'Bir talebiniz için sizden bilgi istendi', linkLabel: 'Yanıtlayın' })
    if (drafts[0]) lines.push({ kind: 'taslak', r: drafts[0], text: 'Yarım kalan bir taslağınız var', linkLabel: 'Devam edin' })
    const stuck = started.find((x) => x.stuck)
    if (stuck) lines.push({ kind: 'takildi', row: stuck, text: `${stuck.r.template.title} uzun süredir aynı adımda`, buttonLabel: 'Hatırlat' })
    return lines.slice(0, 2)
  }, [started, involved, drafts])
}

/** Tümü bitti başlığı; yılın gününe göre döner (sayı yok, ünlem yok). */
export function allDoneTitle(date = new Date()) {
  const titles = ['Hepsi tamam', 'Bugünlük bu kadar', 'Masanız temiz']
  const start = new Date(date.getFullYear(), 0, 0)
  const dayOfYear = Math.floor((date.getTime() - start.getTime()) / 86_400_000)
  return titles[dayOfYear % titles.length]
}

/* ---- Karşılama cümlesi ------------------------------------------------------------------------- */

/** Saate göre selam: 05–11 "Günaydın", 12–17 "İyi günler", diğer saatler "İyi akşamlar". */
export function greetingWord(date = new Date()) {
  const h = date.getHours()
  if (h >= 5 && h <= 11) return 'Günaydın'
  if (h >= 12 && h <= 17) return 'İyi günler'
  return 'İyi akşamlar'
}

/**
 * Cümledeki bağlantının hedefi. `triage`: sıradaki iş görünüyorsa onun "Onayla"sına, değilse
 * kuyrukta o talebin satırına odaklanır, o da yoksa önizlemeyi açar (`runGuidance`).
 */
export type GuidanceTarget = { kind: 'triage'; id: string } | { kind: 'peek'; id: string; context: 'following' | 'drafts' }

export interface Guidance {
  text: string
  link?: { label: 'Şimdi bakın' | 'Yanıtlayın' | 'Göz atın' | 'Devam edin'; target: GuidanceTarget }
}

/**
 * Karşılama altındaki tek cümle; ilk eşleşen kural kazanır (R1 acil → R2 bilgi istendi → R3
 * geciken → R4 bugün gelen → R5 bekleyen var → R6 taslak var → R7 her şey yolunda).
 */
export function useGuidance(): Guidance {
  const triage = useTriage()
  const started = useFollowing('baslattiklarim')
  const involved = useFollowing('devam-eden')
  const drafts = useDrafts()
  return useMemo((): Guidance => {
    const { all } = triage
    const urgent = all.filter((r) => r.template.urgent)
    if (urgent.length) {
      return {
        text: urgent.length === 1 ? 'Acil bir onay sizi bekliyor.' : 'Acil onaylar sizi bekliyor.',
        link: { label: 'Şimdi bakın', target: { kind: 'triage', id: urgent[0].id } },
      }
    }
    const info = started.find((x) => x.state === 'bilgi-istendi') ?? involved.find((x) => x.state === 'bilgi-istendi')
    if (info) {
      return { text: 'Bir talebiniz için sizden bilgi istendi.', link: { label: 'Yanıtlayın', target: { kind: 'peek', id: info.r.id, context: 'following' } } }
    }
    const late = all.filter((r) => ageDays(r.createdAt) > LATE_DAYS)
    if (late.length) {
      return {
        text: late.length === 1 ? 'Bir haftadan uzun süredir bekleyen bir onayınız var.' : 'Bir haftadan uzun süredir bekleyen onaylarınız var.',
        link: { label: 'Şimdi bakın', target: { kind: 'triage', id: late[0].id } },
      }
    }
    const today = all.filter((r) => groupOf(r.createdAt) === 'Bugün')
    if (today.length) {
      return {
        text: today.length === 1 ? 'Bugün size yeni bir talep geldi.' : 'Bugün size yeni talepler geldi.',
        link: { label: 'Göz atın', target: { kind: 'triage', id: today[0].id } },
      }
    }
    if (all.length) {
      return {
        text: all.length === 1 ? 'Onayınızı bekleyen bir iş var.' : 'Onayınızı bekleyen işler var.',
        link: { label: 'Şimdi bakın', target: { kind: 'triage', id: all[0].id } },
      }
    }
    if (drafts.length) {
      return {
        text: drafts.length === 1 ? 'Onayınızı bekleyen iş yok. Yarım kalan bir taslağınız var.' : 'Onayınızı bekleyen iş yok. Yarım kalan taslaklarınız var.',
        link: { label: 'Devam edin', target: { kind: 'peek', id: drafts[0].id, context: 'drafts' } },
      }
    }
    return { text: 'Onayınızı bekleyen iş yok. Her şey yolunda.' }
  }, [triage, started, involved, drafts])
}

/* ---- Önizleme listesi -------------------------------------------------------------------------- */

export type PeekContext = 'queue' | 'following' | 'drafts' | 'fyi' | 'decided'

/** Önizlemede ↑ / ↓ ile gezilen liste (bağlama göre). */
export function usePeekList(context: PeekContext | undefined, followScope: 'baslattiklarim' | 'devam-eden'): WorkRequest[] {
  const triage = useTriage()
  const following = useFollowing(followScope)
  const drafts = useDrafts()
  const fyi = useFyi()
  const decided = useDecided()
  return useMemo(() => {
    switch (context) {
      case 'queue':
        return triage.all
      case 'following':
        return following.map((x) => x.r)
      case 'drafts':
        return drafts
      case 'fyi':
        return fyi.map((x) => x.r)
      case 'decided':
        return decided.map((x) => x.r)
      default:
        return []
    }
  }, [context, triage, following, drafts, fyi, decided])
}
