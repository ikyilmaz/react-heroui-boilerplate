import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  ListChecks,
  Mail,
  Paperclip,
  PenLine,
  RotateCcw,
  Send,
  X,
} from 'lucide-react'
import { Avatar, Button, Chip, Drawer, EmptyState, Link, ScrollShadow, Surface, TextArea, Toolbar, Tooltip, Typography, buttonVariants, cn } from '@heroui/react'
import type { DecisionRecord } from '@/pages/workflows/decisions'
import { markUnread } from '@/pages/workflows/triage'
import {
  LATE_DAYS,
  ageDays,
  avatarColor,
  dateTime,
  findRequest,
  initials,
  processOf,
  relative,
  requestHref,
  savedWords,
  sinceWords,
  tl,
  type Decision,
  type Process,
  type WorkRequest,
} from '@/pages/workflows/workflowData'
import {
  afterPaint,
  answerWithUndo,
  decideWithUndo,
  focusEl,
  focusEmptyHeading,
  focusNextApprove,
  focusRequest,
  focusRow,
  isTypingTarget,
  remindWithToast,
  rowIdsIn,
  undoDecisionWithFocus,
  useLeaving,
  widgetEl,
} from '@/pages/workspace/home/actions'
import { useHome, type PeekState } from '@/pages/workspace/home/HomeContext'
import type { WidgetId } from '@/pages/workspace/home/registry'
import { SnoozeMenu } from '@/pages/workspace/home/SnoozeMenu'
import { allDoneTitle, sequenceNext, useDecided, useFollowing, usePeekList, type FollowRow, type PeekContext } from '@/pages/workspace/home/useTriage'
import { Box, Text } from '@/pages/workspace/ui'
import { ICON, tile, timeOf } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Talep önizlemesi (sağdan açılan çekmece)
 *
 * Ana sayfadaki her satır burada açılır; talep ayrıntı sayfası henüz "Yakında" olduğu için alanlar,
 * kalemler, tutarlar ve ekler yalnızca burada görünür (sayı yasağı sayfanın `role="main"`ine
 * uygulanır, çekmece portalda). Yukarıdan aşağı:
 *
 * - Başlık: süreç ikonu ve adı, talep başlığı, talep sahibi ve zaman, soluk talep numarası, durum
 *   ("Acil", "Gecikiyor", "Sizden bilgi istendi", "Onaylandı" / "Reddedildi").
 * - Gövde: "Onay yolu" (adım çipleri: bekleyen talepte sizin adımınız, takip edilende şu anki adım,
 *   taslakta hepsi soluk), "Bilgiler" (önce "Özet" = `template.highlight`, sonra alanlar),
 *   "Kalemler", "Gerekçe", "Ekler".
 * - Alt bilgi, talebin durumuna göre: onay bekleyen → Onayla / Reddet (satır içi gerekçe alanı) /
 *   Sonra; takip edilen → "Yanıtınız" + "Yanıtı gönder" ya da "Hatırlat"; taslak → "Taslağa devam
 *   et"; bilginize → "Okunmadı işaretle"; karar verilmiş → "Kararı geri al". Hepsinde "Tam sayfada
 *   aç".
 *
 * "Sırayla ilerle" (`peek.sequence`): karar, erteleme ya da "Atla"dan sonra sıradaki talep yüklenir;
 * alt bilgide "Sıradaki: …"; iş kalmayınca gövdede "tümü bitti". Sıra dışında karar / erteleme
 * çekmeceyi kapatır ve odağı listedeki komşu satıra taşır ("Geri al" bildirimde).
 *
 * Klavye (yazı alanı dışında): ↑ / ↓ (ve tek tuş açıkken K / J) önceki / sonraki talep; onay
 * bekleyen talepte A onayla, R reddet, H sonra. Esc kapatır; odak açan satıra (ya da ↑ / ↓ ile
 * gelinen talebin satırına) döner.
 * ------------------------------------------------------------------------------------------------- */

/** Önizlemenin alt bilgisi talebin kutusuna ve karar durumuna göre. */
type PeekKind = 'queue' | 'decided' | 'following' | 'drafts' | 'fyi' | 'history'

/** Çekmece kalktıktan sonra odağı taşır; başardıysa `true`. */
type FocusPlan = () => boolean

/** Çekmecenin DOM işareti: kapanışın bittiğini ve tuşların çekmeceden geldiğini anlamak için. */
const PEEK_SELECTOR = '[data-home-peek]'

/** Önizlemenin açıldığı widget; kapanınca odak boşa düşerse oraya dönülür. */
const originWidget: Record<PeekContext, WidgetId> = {
  queue: 'queue',
  following: 'following',
  drafts: 'drafts',
  fyi: 'fyi',
  decided: 'decided',
}

/** Kenar halkası (`tile`) HeroUI'nin odak halkasını ezer; klavye odağında geri verilir. */
const focusRing = 'data-[focus-visible]:status-focused'

/** Düğme görünümlü bağlantı (`buttonVariants`); bağlantının kendi alt çizgisi kapalı. */
const linkButton = 'h-10 md:h-9 no-underline data-[hovered=true]:no-underline data-[pressed=true]:no-underline'

function kindOf(r: WorkRequest, decided: boolean): PeekKind {
  switch (r.box) {
    case 'bekleyen':
      return decided ? 'decided' : 'queue'
    case 'baslattiklarim':
    case 'devam-eden':
      return 'following'
    case 'taslaklar':
      return 'drafts'
    case 'bilgilendirmeler':
      return 'fyi'
    default:
      return 'history'
  }
}

/**
 * Çekmece DOM'dan çıkınca (çıkış animasyonu bitince) çalıştırır; React Aria'nın kendi odak geri
 * yüklemesinden bir kare sonra. Bu arada yeni bir önizleme açıldıysa hiçbir şey yapmaz.
 */
function afterPeekCloses(fn: () => void) {
  let frames = 0
  const tick = () => {
    if (!document.querySelector(PEEK_SELECTOR)) afterPaint(fn)
    else if (frames++ < 90) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

/** Kapanınca odak boşa düştüyse: kaynak widget'ın ilk satırı, sıradaki iş, boş durum başlığı. */
function fallbackFocus(context: PeekContext) {
  const root = widgetEl(originWidget[context])
  const first = rowIdsIn(root)[0]
  if (root && first && focusRow(first, root)) return
  if (context === 'queue' && focusNextApprove()) return
  if (root) focusEmptyHeading(root)
}

/**
 * Karar / ertelemeden ÖNCE çağrılır (satır henüz DOM'da): satır kalkınca odağın gideceği yer —
 * aynı sıradaki satır (yani bir sonraki), yoksa bir önceki, yoksa sıradaki iş kartının "Onayla"sı,
 * o da yoksa boş durum başlığı.
 */
function planNeighbour(id: string): FocusPlan {
  const row = document.querySelector<HTMLElement>(`[data-row-id="${CSS.escape(id)}"]`)
  const root = row?.closest<HTMLElement>('[data-widget]') ?? null
  const ids = rowIdsIn(root)
  const i = ids.indexOf(id)
  const target = i >= 0 ? (ids[i + 1] ?? ids[i - 1]) : undefined
  return () => {
    const live = root?.isConnected ? root : null
    if (target && focusRow(target, live ?? document)) return true
    if (focusNextApprove()) return true
    return (!!live && focusEmptyHeading(live)) || focusEmptyHeading()
  }
}

/* ---- Çekmece ----------------------------------------------------------------------------------- */

export function RequestPeek() {
  const home = useHome()
  const { peek, closePeek } = home

  // Kapanış animasyonu sürerken son talep çizilmeye devam etsin (boş çekmece kaymasın)
  const [last, setLast] = useState<PeekState | null>(peek)
  if (peek && peek !== last) setLast(peek)
  const shown = peek ?? last
  const r = shown ? findRequest(shown.id) : undefined

  /**
   * Kapatır. `focus` verilirse çekmece kalkınca odak oraya (karar sonrası komşu satır); yoksa
   * açan / en son gezilen talebin satırına, o da çizilmiyorsa React Aria'nın geri yüklediği yerde
   * kalır; odak boşa düştüyse kaynak widget'a döner.
   */
  const close = (focus?: FocusPlan) => {
    const s = peek
    closePeek()
    afterPeekCloses(() => {
      if (focus?.()) return
      if (s?.returnFocusId && focusRequest(s.returnFocusId)) return
      const active = document.activeElement
      if (active && active !== document.body && active.isConnected) return
      if (s) fallbackFocus(s.context)
    })
  }

  return (
    <Drawer.Backdrop
      isOpen={!!peek && !!r}
      onOpenChange={(open) => {
        if (!open) close()
      }}
      variant="transparent"
      className="soft-theme bg-background/30"
    >
      {/* Genişlik Dialog'a verilir: Content ekranı kaplayan hizalama katmanıdır */}
      <Drawer.Content placement="right" className="soft-theme">
        <Drawer.Dialog data-home-peek className={cn('m-3 h-auto w-[calc(100%-1.5rem)] max-w-[32rem] self-stretch rounded-panel p-0', tile)}>
          {shown && r && <PeekPanel state={shown} r={r} onClose={close} />}
        </Drawer.Dialog>
      </Drawer.Content>
    </Drawer.Backdrop>
  )
}

/* ---- Panel ------------------------------------------------------------------------------------- */

interface PanelProps {
  state: PeekState
  r: WorkRequest
  onClose: (focus?: FocusPlan) => void
}

function PeekPanel({ state, r, onClose }: PanelProps) {
  const home = useHome()
  const process = processOf(r)
  const followScope = r.box === 'devam-eden' ? 'devam-eden' : 'baslattiklarim'
  // Takipte gezinme talebin kendi kapsamında (karşılamadaki "Yanıtlayın" sekmeden bağımsız açar)
  const list = usePeekList(state.context, state.context === 'following' ? followScope : home.state.followScope)
  const following = useFollowing(followScope)
  const decided = useDecided()
  const leaving = useLeaving()
  const follow = following.find((x) => x.r.id === r.id)
  const record = decided.find((x) => x.r.id === r.id)?.record
  const kind = kindOf(r, !!record)
  const rootRef = useRef<HTMLDivElement>(null)

  const [doneFor, setDoneFor] = useState<string | null>(null)
  const [live, setLive] = useState('')
  // Talep değişince (↑ / ↓, sıradaki) yerel alanlar sıfırlanır; düğmeler yerinde kalır, odak kaybolmaz
  const [forId, setForId] = useState(r.id)
  const [rejecting, setRejecting] = useState(false)
  const [note, setNote] = useState('')
  const [reply, setReply] = useState('')
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  if (forId !== r.id) {
    setForId(r.id)
    setRejecting(false)
    setNote('')
    setReply('')
    setSnoozeOpen(false)
  }

  const done = state.sequence && doneFor === r.id
  const idx = list.findIndex((x) => x.id === r.id)
  const navigable = !done && idx >= 0 && list.length > 1
  const prev = navigable ? list[idx - 1] : undefined
  const next = navigable ? list[idx + 1] : undefined
  /** Sırayla ilerlerken bundan sonraki talep: listede bir sonraki, yoksa baştaki ilk başka talep. */
  const upcoming = (idx >= 0 ? list[idx + 1] : undefined) ?? sequenceNext(list, r.id)
  const isLeaving = leaving.has(r.id)

  const focusInPanel = (selector: string) => afterPaint(() => void focusEl(rootRef.current?.querySelector<HTMLElement>(selector)))

  const go = (x: WorkRequest) => home.openPeek(x.id, state.context, { sequence: state.sequence, returnFocusId: x.id })

  /** Sırada: sıradaki talebi yükler, yoksa "tümü bitti". Çekmecenin içindeki duyuru alanına yazar. */
  const advance = (target: WorkRequest | undefined) => {
    if (target) {
      setLive(`Sıradaki talep: ${target.template.title}`)
      home.openPeek(target.id, 'queue', { sequence: true, returnFocusId: target.id })
      focusInPanel('[data-peek-primary]')
    } else {
      setDoneFor(r.id)
      setLive(allDoneTitle())
    }
  }

  const decideNow = (decision: Decision, text = '') => {
    if (isLeaving) return
    if (state.sequence) {
      const target = upcoming
      decideWithUndo(r, decision, text, { from: 'peek' })
      advance(target)
      return
    }
    const plan = planNeighbour(r.id)
    decideWithUndo(r, decision, text, { from: 'peek' })
    onClose(plan)
  }

  const afterSnooze = () => {
    if (state.sequence) advance(upcoming)
    else onClose(planNeighbour(r.id))
  }

  const skipNow = () => {
    const target = upcoming
    home.skip(r.id)
    advance(target)
  }

  const submitReject = () => {
    if (note.trim()) decideNow('rejected', note.trim())
  }

  const cancelReject = () => {
    setRejecting(false)
    focusInPanel('[data-peek-reject]')
  }

  const sendReply = () => {
    if (!reply.trim()) return
    answerWithUndo(r, reply)
    onClose(() => focusRequest(r.id))
  }

  const remindNow = () => {
    remindWithToast(r)
    // "Hatırlat" "Hatırlatıldı" yazısına döner; odak boşa düşmesin
    focusInPanel('[data-peek-fullpage]')
  }

  const markUnreadNow = () => {
    markUnread(r.id)
    onClose(() => focusRequest(r.id))
  }

  const undoNow = () => {
    undoDecisionWithFocus(r, 'peek')
    // Talep kuyruğa döndü: önizleme kuyruk bağlamında sürer, yeniden karar verilebilir
    home.openPeek(r.id, 'queue', { returnFocusId: r.id })
    focusInPanel('[data-peek-primary]')
  }

  // Tuşlar belgede dinlenir: odak çekmecenin kendisindeyken de (açılışta) çalışsın
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return
    const dialog = rootRef.current?.closest(PEEK_SELECTOR)
    if (!dialog || !(e.target instanceof Node) || !dialog.contains(e.target) || isTypingTarget(e.target)) return
    // Gövdeye odaklanıldıysa oklar gövdeyi kaydırır
    const inBody = e.target instanceof Element && !!e.target.closest('[data-peek-scroll]')
    const letter = !e.shiftKey && e.key.length === 1 ? e.key.toLocaleLowerCase('tr') : ''
    const keysOn = home.keysOn

    if ((e.key === 'ArrowDown' && !inBody) || (keysOn && letter === 'j')) {
      if (next) {
        e.preventDefault()
        go(next)
      }
      return
    }
    if ((e.key === 'ArrowUp' && !inBody) || (keysOn && letter === 'k')) {
      if (prev) {
        e.preventDefault()
        go(prev)
      }
      return
    }
    if (!keysOn || kind !== 'queue' || done || rejecting || isLeaving) return
    if (letter === 'a') {
      e.preventDefault()
      decideNow('approved')
    } else if (letter === 'r') {
      e.preventDefault()
      setRejecting(true)
    } else if (letter === 'h') {
      e.preventDefault()
      setSnoozeOpen(true)
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })

  const Icon = process.icon
  const eyebrow = (
    <Text tone="muted" className="flex items-center gap-1.5 text-[0.8125rem] leading-5">
      <ListChecks size={16} strokeWidth={1.5} aria-hidden />
      Sırayla ilerliyorsunuz
    </Text>
  )

  return (
    <Box ref={rootRef} className="flex min-h-0 flex-1 flex-col">
      <Drawer.Header className="gap-3 px-6 pt-6">
        {state.sequence && !done && eyebrow}

        <Box className="flex items-center gap-3">
          {done ? (
            <Box className="min-w-0 flex-1">{eyebrow}</Box>
          ) : (
            <>
              <Surface variant="tertiary" className={cn('grid size-10 shrink-0 place-items-center rounded-pill', tile)}>
                <Icon {...ICON} />
              </Surface>
              <Text className="min-w-0 flex-1 truncate text-[0.8125rem] leading-5">
                {process.name} · {process.department}
              </Text>
            </>
          )}
          <Box className="flex shrink-0 items-center gap-1">
            {navigable && (
              <>
                <NavButton label="Önceki talep" hint="Önceki · ↑" icon={ChevronUp} onPress={prev && (() => go(prev))} />
                <NavButton label="Sonraki talep" hint="Sonraki · ↓" icon={ChevronDown} onPress={next && (() => go(next))} />
              </>
            )}
            <Button isIconOnly variant="ghost" aria-label="Kapat" onPress={() => onClose()} className="size-11 text-foreground/65">
              <X {...ICON} />
            </Button>
          </Box>
        </Box>

        {!done && <RequestSummary r={r} kind={kind} follow={follow} record={record} />}
      </Drawer.Header>

      <Drawer.Body className="m-0 flex min-h-0 flex-col overflow-hidden p-0">
        <ScrollShadow
          size={32}
          tabIndex={0}
          role="region"
          aria-label="Talep ayrıntıları"
          data-peek-scroll
          className="min-h-0 flex-1 px-6 py-2 text-foreground outline-none focus-visible:status-focused"
        >
          {done ? (
            <SequenceDone onClose={() => onClose()} />
          ) : (
            <Box key={r.id} className="home-fade-in flex flex-col gap-6 pb-2">
              <Section title="Onay yolu">
                <StepPath r={r} process={process} kind={kind} follow={follow} />
              </Section>
              <Section title="Bilgiler">
                <Fields r={r} />
              </Section>
              {!!r.template.items?.length && (
                <Section title="Kalemler">
                  <Box role="list" className="flex flex-col gap-1.5">
                    {r.template.items.map((it) => (
                      <Box key={it.name} role="listitem" className="flex items-baseline justify-between gap-4 rounded-tile bg-foreground/5 px-4 py-2.5">
                        <Text tone="primary" className="min-w-0 text-[0.875rem] leading-5">
                          {it.name}
                        </Text>
                        <Text className="shrink-0 text-[0.8125rem] leading-5 whitespace-nowrap">
                          {it.qty} {it.unit} · {tl.format(it.price)}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                </Section>
              )}
              <Section title="Gerekçe">
                <Typography.Paragraph size="sm" className="text-foreground/65">
                  {r.template.reason}
                </Typography.Paragraph>
              </Section>
              <Section title="Ekler">
                {r.template.attachments?.length ? (
                  <Box className="flex flex-wrap gap-1.5">
                    {r.template.attachments.map((a) => (
                      <Chip key={a} variant="secondary" size="sm" className={cn('max-w-full gap-1', tile)}>
                        <Paperclip size={14} strokeWidth={1.5} aria-hidden className="shrink-0" />
                        <Text truncate className="max-w-48 text-current!">
                          {a}
                        </Text>
                      </Chip>
                    ))}
                  </Box>
                ) : (
                  <Text tone="muted" className="text-[0.8125rem] leading-5">
                    Ek yok
                  </Text>
                )}
              </Section>
            </Box>
          )}
        </ScrollShadow>
      </Drawer.Body>

      {!done && (
        <Drawer.Footer className="flex-col items-stretch gap-3 px-6 pt-4 pb-6">
          {state.sequence && (
            <Text tone="muted" className="text-[0.8125rem] leading-5">
              {upcoming ? `Sıradaki: ${upcoming.requester.name} · ${processOf(upcoming).name}` : 'Sırada başka iş yok'}
            </Text>
          )}

          {kind === 'queue' &&
            (rejecting ? (
              <RejectForm note={note} setNote={setNote} onSubmit={submitReject} onCancel={cancelReject} isDisabled={isLeaving} />
            ) : (
              <Box className="flex flex-wrap items-center gap-2">
                <Toolbar aria-label="Karar" className="flex flex-wrap items-center gap-2">
                  <Tooltip delay={600}>
                    <Button data-peek-primary autoFocus={state.sequence} variant="primary" isDisabled={isLeaving} onPress={() => decideNow('approved')}>
                      <Check size={16} strokeWidth={1.5} aria-hidden />
                      Onayla
                    </Button>
                    <Tooltip.Content>Onayla · A</Tooltip.Content>
                  </Tooltip>
                  <Tooltip delay={600}>
                    <Button data-peek-reject variant="secondary" isDisabled={isLeaving} onPress={() => setRejecting(true)} className={cn(tile, focusRing)}>
                      <X size={16} strokeWidth={1.5} aria-hidden />
                      Reddet
                    </Button>
                    <Tooltip.Content>Reddet · R</Tooltip.Content>
                  </Tooltip>
                  <SnoozeMenu r={r} from="peek" isOpen={snoozeOpen} onOpenChange={setSnoozeOpen} onSnoozed={afterSnooze}>
                    <Button variant="ghost" isDisabled={isLeaving} aria-label={`Sonra: ${r.template.title}`}>
                      <Clock size={16} strokeWidth={1.5} aria-hidden />
                      Sonra
                      <ChevronDown size={14} strokeWidth={1.5} aria-hidden />
                    </Button>
                  </SnoozeMenu>
                  {state.sequence && (
                    <Button variant="ghost" isDisabled={isLeaving || !upcoming} onPress={skipNow}>
                      <ArrowRight size={16} strokeWidth={1.5} aria-hidden />
                      Atla
                    </Button>
                  )}
                </Toolbar>
                <FullPageLink r={r} />
              </Box>
            ))}

          {kind === 'decided' && (
            <Box className="flex flex-wrap items-center gap-2">
              <Button data-peek-undo variant="secondary" onPress={undoNow} className={cn(tile, focusRing)}>
                <RotateCcw size={16} strokeWidth={1.5} aria-hidden />
                Kararı geri al
              </Button>
              <FullPageLink r={r} />
            </Box>
          )}

          {kind === 'following' &&
            (follow?.trailing === 'yanitla' ? (
              <ReplyForm reply={reply} setReply={setReply} onSubmit={sendReply} r={r} />
            ) : (
              <Box className="flex flex-wrap items-center gap-2">
                {follow?.trailing === 'hatirlat' && (
                  <Button variant="secondary" onPress={remindNow} className={cn(tile, focusRing)}>
                    <BellRing size={16} strokeWidth={1.5} aria-hidden />
                    Hatırlat
                  </Button>
                )}
                {follow?.trailing === 'hatirlatildi' && (
                  <Text tone="muted" className="px-1 text-[0.8125rem] leading-5">
                    Hatırlatıldı
                  </Text>
                )}
                <FullPageLink r={r} />
              </Box>
            ))}

          {kind === 'drafts' && (
            <Box className="flex flex-wrap items-center gap-2">
              <Link href={requestHref(r)} className={cn(buttonVariants({ variant: 'primary' }), linkButton)}>
                <PenLine size={16} strokeWidth={1.5} aria-hidden />
                Taslağa devam et
              </Link>
              <Button variant="ghost" onPress={() => onClose()}>
                Kapat
              </Button>
              <FullPageLink r={r} />
            </Box>
          )}

          {kind === 'fyi' && (
            <Box className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" onPress={markUnreadNow}>
                <Mail size={16} strokeWidth={1.5} aria-hidden />
                Okunmadı işaretle
              </Button>
              <Button variant="ghost" onPress={() => onClose()}>
                Kapat
              </Button>
              <FullPageLink r={r} />
            </Box>
          )}

          {kind === 'history' && (
            <Box className="flex items-center">
              <FullPageLink r={r} />
            </Box>
          )}
        </Drawer.Footer>
      )}

      {/* Sırayla ilerlerken yeni talebi duyurur (sayfadaki duyuru alanı çekmece açıkken gizli) */}
      <Box role="status" aria-live="polite" className="sr-only">
        {live}
      </Box>
    </Box>
  )
}

/* ---- Başlık parçaları -------------------------------------------------------------------------- */

/** Önceki / sonraki talep: yuvarlak hayalet ikon düğmesi ve tuş ipucu. */
function NavButton({ label, hint, icon: Icon, onPress }: { label: string; hint: string; icon: LucideIcon; onPress?: () => void }) {
  return (
    <Tooltip delay={600}>
      <Button isIconOnly variant="ghost" aria-label={label} isDisabled={!onPress} onPress={onPress} className="size-11 text-foreground/65">
        <Icon {...ICON} />
      </Button>
      <Tooltip.Content>{hint}</Tooltip.Content>
    </Tooltip>
  )
}

/** Zaman: göreli ifade, üzerine gelince tam tarih (`dateTime`). */
function TimeTip({ date, className }: { date: Date; className?: string }) {
  return (
    <Tooltip delay={600}>
      {/* Yalnızca konum veren tetikleyici: sekme sırasına girmez */}
      <Tooltip.Trigger role="presentation" tabIndex={-1} className="shrink-0">
        <Text tone="muted" {...timeOf(date)} className={cn('text-[0.8125rem] leading-5', className)}>
          {relative(date)}
        </Text>
      </Tooltip.Trigger>
      <Tooltip.Content>{dateTime(date)}</Tooltip.Content>
    </Tooltip>
  )
}

/** Başlık, talep sahibi, talep numarası ve durum. */
function RequestSummary({ r, kind, follow, record }: { r: WorkRequest; kind: PeekKind; follow?: FollowRow; record?: DecisionRecord }) {
  const late = ageDays(r.createdAt) > LATE_DAYS

  return (
    <>
      <Drawer.Heading level={2} className="text-[1.25rem] leading-7 font-semibold tracking-tight text-foreground">
        {r.template.title}
      </Drawer.Heading>

      <Box className="flex min-w-0 items-center gap-2.5">
        {/* Baş harfler adın içinde tekrar etmesin; kişinin adı yanında */}
        <Avatar size="sm" color={avatarColor(r.requester.name)} aria-hidden className="shrink-0 rounded-pill">
          <Avatar.Fallback className="text-[0.75rem] font-semibold">{initials(r.requester.name)}</Avatar.Fallback>
        </Avatar>
        <Text className="min-w-0 truncate text-[0.8125rem] leading-5">
          {r.requester.name} · {r.requester.department} ·
        </Text>
        <TimeTip date={r.createdAt} />
      </Box>

      <Box className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Text tone="muted" className="text-[0.75rem] leading-4">
          {r.no}
        </Text>

        {kind === 'queue' &&
          (r.template.urgent ? (
            <Chip color="danger" variant="primary" size="sm">
              Acil
            </Chip>
          ) : (
            late && (
              <Text tone="muted" className="flex items-center gap-1 text-[0.75rem] leading-4">
                <Clock size={14} strokeWidth={1.5} aria-hidden />
                Gecikiyor
              </Text>
            )
          ))}

        {kind === 'decided' && record && (
          <>
            <Chip color={record.decision === 'approved' ? 'success' : 'danger'} variant="primary" size="sm">
              {record.decision === 'approved' ? 'Onaylandı' : 'Reddedildi'}
            </Chip>
            {record.note && (
              <Text className="min-w-0 text-[0.75rem] leading-4">
                “{record.note}”
              </Text>
            )}
          </>
        )}

        {kind === 'following' && follow?.state === 'bilgi-istendi' && (
          <Chip color="danger" variant="primary" size="sm">
            Sizden bilgi istendi
          </Chip>
        )}

        {kind === 'drafts' && (
          <Text tone="muted" className="text-[0.75rem] leading-4">
            {savedWords(r.createdAt)}
          </Text>
        )}
      </Box>
    </>
  )
}

/* ---- Gövde parçaları --------------------------------------------------------------------------- */

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId()
  return (
    <Box role="group" aria-labelledby={id} className="flex flex-col gap-2.5">
      <Typography.Heading level={3} id={id} className="text-[0.8125rem] leading-5 font-medium tracking-normal text-foreground/65">
        {title}
      </Typography.Heading>
      {children}
    </Box>
  )
}

/**
 * Adım çipleri. Bekleyen talepte sizin adımınız ("Sizde · …"), takip edilende şu anki adım (adımı
 * tutan kişiyle), karar verilende sizin adımınıza kadar tamamlandı, geçmişte hepsi tamamlandı,
 * taslakta hepsi soluk (henüz gönderilmedi), bilginize sunulanda nötr.
 */
function StepPath({ r, process, kind, follow }: { r: WorkRequest; process: Process; kind: PeekKind; follow?: FollowRow }) {
  const progress = follow?.progress ?? r.progress
  const current = kind === 'queue' ? process.approverStep : kind === 'following' ? progress?.step : undefined
  const doneUpTo =
    kind === 'decided' ? process.approverStep + 1 : kind === 'history' ? process.steps.length : kind === 'drafts' || kind === 'fyi' ? 0 : (current ?? 0)

  return (
    <Box className="flex flex-col gap-2">
      <Box role="list" aria-label="Onay yolu" className="flex flex-wrap items-center gap-1.5">
        {process.steps.map((step, i) =>
          i < doneUpTo ? (
            <Chip key={step} role="listitem" variant="tertiary" size="sm" className="text-foreground/65">
              <Check size={14} strokeWidth={1.5} aria-hidden />
              <Text className="sr-only">Tamamlandı: </Text>
              {step}
            </Chip>
          ) : i === current ? (
            <Chip key={step} role="listitem" color="accent" variant="primary" size="sm">
              <Text className="sr-only">Şu an: </Text>
              {kind === 'queue' ? `Sizde · ${step}` : progress ? `${progress.holder.name} · ${step}` : step}
            </Chip>
          ) : (
            <Chip key={step} role="listitem" variant="secondary" size="sm" className={kind === 'fyi' ? 'text-foreground/65' : 'text-foreground/45'}>
              {step}
            </Chip>
          ),
        )}
      </Box>

      {kind === 'following' && progress && (
        <Box className="flex min-w-0 flex-wrap items-center gap-x-1.5">
          {/* Ek almayan ayrı "adımında" sözcüğü: kişi adına Türkçe ek eklemek gerekmez */}
          <Text className="text-[0.8125rem] leading-5">
            {follow?.stepLabel ?? process.steps[progress.step]} adımında · {progress.holder.name} ·
          </Text>
          <Tooltip delay={600}>
            <Tooltip.Trigger role="presentation" tabIndex={-1} className="shrink-0">
              <Text tone="muted" {...timeOf(progress.since)} className="text-[0.8125rem] leading-5">
                {sinceWords(progress.since)}
              </Text>
            </Tooltip.Trigger>
            <Tooltip.Content>{dateTime(progress.since)}</Tooltip.Content>
          </Tooltip>
        </Box>
      )}
    </Box>
  )
}

/** "Bilgiler": önce "Özet" (`template.highlight`), sonra formun alanları, etiket / değer çiftleri. */
function Fields({ r }: { r: WorkRequest }) {
  const rows: [string, string, boolean][] = [
    ...(r.template.highlight ? [['Özet', r.template.highlight, true] as [string, string, boolean]] : []),
    ...Object.entries(r.template.fields).map(([k, v]): [string, string, boolean] => [k, v, false]),
  ]
  return (
    <Box className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 gap-y-2.5">
      {rows.map(([label, value, strong]) => (
        <Fragment key={label}>
          <Text tone="muted" className="text-[0.8125rem] leading-5">
            {label}
          </Text>
          <Text tone="primary" className={cn('text-[0.875rem] leading-5', strong && 'font-semibold')}>
            {value}
          </Text>
        </Fragment>
      ))}
    </Box>
  )
}

/* ---- Alt bilgi parçaları ----------------------------------------------------------------------- */

/** "Tam sayfada aç": talebin kendi adresi (`requestHref`). */
function FullPageLink({ r }: { r: WorkRequest }) {
  return (
    <Link data-peek-fullpage href={requestHref(r)} className={cn(buttonVariants({ variant: 'ghost' }), linkButton, 'ms-auto text-foreground/65')}>
      Tam sayfada aç
      <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden />
    </Link>
  )
}

/** ⌘↵ / Ctrl+↵ gönderir; Esc (yalnızca ret alanında) formu kapatır, çekmeceyi değil. */
function submitKeys(e: ReactKeyboardEvent, onSubmit: () => void, onCancel?: () => void) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault()
    onSubmit()
  } else if (e.key === 'Escape' && onCancel) {
    e.preventDefault()
    e.stopPropagation()
    onCancel()
  }
}

interface RejectFormProps {
  note: string
  setNote: (v: string) => void
  onSubmit: () => void
  onCancel: () => void
  isDisabled: boolean
}

/** Satır içi ret gerekçesi: not boşken "Reddet" basılamaz. */
function RejectForm({ note, setNote, onSubmit, onCancel, isDisabled }: RejectFormProps) {
  const promptId = useId()
  return (
    <Box className="flex flex-col gap-2">
      <Text id={promptId} tone="primary" className="text-[0.875rem] leading-5 font-medium">
        Neden reddediyorsunuz?
      </Text>
      <TextArea
        aria-label="Ret gerekçesi"
        aria-describedby={promptId}
        aria-required
        required
        autoFocus
        rows={3}
        placeholder="Talep sahibi bu notu görecek"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onKeyDown={(e) => submitKeys(e, onSubmit, onCancel)}
        className="w-full resize-none rounded-card text-[0.875rem]"
      />
      <Box className="flex items-center justify-end gap-2">
        <Button variant="ghost" onPress={onCancel}>
          Vazgeç
        </Button>
        <Button variant="primary" isDisabled={isDisabled || !note.trim()} onPress={onSubmit}>
          <X size={16} strokeWidth={1.5} aria-hidden />
          Reddet
        </Button>
      </Box>
    </Box>
  )
}

/** Bilgi isteğine yanıt: yanıt boşken "Yanıtı gönder" basılamaz. */
function ReplyForm({ reply, setReply, onSubmit, r }: { reply: string; setReply: (v: string) => void; onSubmit: () => void; r: WorkRequest }) {
  const labelId = useId()
  return (
    <Box className="flex flex-col gap-2">
      <Text id={labelId} tone="primary" className="text-[0.875rem] leading-5 font-medium">
        Yanıtınız
      </Text>
      <TextArea
        aria-labelledby={labelId}
        autoFocus
        rows={3}
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        onKeyDown={(e) => submitKeys(e, onSubmit)}
        className="w-full resize-none rounded-card text-[0.875rem]"
      />
      <Box className="flex flex-wrap items-center gap-2">
        <Button variant="primary" isDisabled={!reply.trim()} onPress={onSubmit}>
          <Send size={16} strokeWidth={1.5} aria-hidden />
          Yanıtı gönder
        </Button>
        <FullPageLink r={r} />
      </Box>
    </Box>
  )
}

/** Sırada iş kalmadı: sakin bir kapanış ve "Kapat". */
function SequenceDone({ onClose }: { onClose: () => void }) {
  return (
    <EmptyState className="flex flex-col items-center gap-3 px-2 py-14 text-center">
      <Surface variant="tertiary" className={cn('grid size-13 place-items-center rounded-pill', tile)}>
        <CheckCheck size={24} strokeWidth={1.5} aria-hidden />
      </Surface>
      <Drawer.Heading level={2} data-empty-heading tabIndex={-1} className="text-[1.125rem] leading-7 font-semibold tracking-tight text-foreground outline-none">
        {allDoneTitle()}
      </Drawer.Heading>
      <Typography className="max-w-[20rem] text-[0.875rem] leading-5 text-foreground/65">Onayınızı bekleyen iş kalmadı.</Typography>
      <Button autoFocus variant="secondary" onPress={onClose} className={cn('mt-2', tile, focusRing)}>
        Kapat
      </Button>
    </EmptyState>
  )
}
