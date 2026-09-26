import { useRef, useState, type KeyboardEvent } from 'react'
import {
  Avatar,
  Button,
  Card,
  Chip,
  Dropdown,
  EmptyState,
  Header,
  Link,
  Popover,
  ScrollShadow,
  Surface,
  Toolbar,
  Tooltip,
  Typography,
  cn,
} from '@heroui/react'
import { ArrowRight, Check, CheckCheck, ChevronDown, Clock, Ellipsis, Eye, Paperclip, Plus, X } from 'lucide-react'
import { snoozeTargets, toggleRead, useSnoozes } from '@/pages/workflows/triage'
import {
  DAY,
  LATE_DAYS,
  ageDays,
  avatarColor,
  dateTime,
  initials,
  processOf,
  relative,
  type WorkRequest,
} from '@/pages/workflows/workflowData'
import { afterPaint, bringBack, decideWithUndo, focusNextApprove, remindWithToast, snoozeWithUndo, triageKey, useLeaving } from '@/pages/workspace/home/actions'
import { useHome } from '@/pages/workspace/home/HomeContext'
import { RejectPopover } from '@/pages/workspace/home/RejectPopover'
import { SnoozeMenu } from '@/pages/workspace/home/SnoozeMenu'
import type { WidgetBodyProps } from '@/pages/workspace/home/types'
import { allDoneTitle, sequenceNext, useMeanwhile, useTriage, type MeanwhileLine } from '@/pages/workspace/home/useTriage'
import { Box, Text } from '@/pages/workspace/ui'
import { ICON, inline, tile, timeOf } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Sıradaki iş
 *
 * Sayfanın kalbi: karar bekleyen en önemli tek talep, yerinde karar verebilecek kadar bağlamla ve
 * tek siyah eylemle ("Onayla"). Üç kip:
 * - `ozet`       karar kartı: süreç, başlık, talep sahibi, sizden beklenen adım.
 * - `ayrintili`  ek olarak onay yolu, üç satır gerekçe, ekler ve "Sıradaki: …" satırı.
 * - `secili`     ana–ayrıntı düzeninin ayrıntı yanı: kuyrukta odaklanan satırı izler, gerekçe
 *                alana göre altı satıra kadar açılır. Tek sütunda çizilmez (kuyruk Boşluk / Enter
 *                ile önizlemeyi açar).
 *
 * Kartın yüksekliği talepten talebe değişmez: başlık iki, gerekçe en az üç satır yer ayırır; onay
 * yolu ve ekler tek satırdır (yatay kaydırma gölgesi). Kart talep kimliğiyle anahtarlıdır; karar
 * sonrası eski talep 150ms solar (`home-row-leave`), yenisi 200ms belirir (`home-fade-in`) ve odak
 * yeni "Onayla"ya geçer. Tuşlar (A / R / H / Boşluk / E / → ya da J) yalnızca odak bu widget'ın
 * içindeyken çalışır. Kuyruk boşalınca kart yerine sayfanın tek "tümü bitti" ekranı gelir.
 *
 * Talep numarası, özet tutar, form alanları ve kalemler kartta yok; yalnızca
 * önizlemede (RequestPeek). Talebin kendi metinleri (başlık, gerekçe, ek adları) `data-item-title`
 * taşır: rakam denetimi (role=main içinde rakam yok) yalnızca kullanıcıya ait bu içeriği muaf tutar.
 *
 * Bu dosya kuyruğun da kullandığı küçük parçaları dışa verir: `AllDoneState` (tümü bitti),
 * `SnoozedLink` ("Ertelediklerim"), `UrgencyMark` ("Acil" / "Gecikiyor") ve `RequestTime`.
 * ------------------------------------------------------------------------------------------------- */

/** Bu iç genişliğin (px) altında "Sonra / İncele / Atla" yalnızca ikon (yaklaşık 35rem). */
const COMPACT_ACTIONS_BELOW = 560

/** Bu iç genişliğin (px) altında "Sonra / İncele / Atla" "…" menüsüne katlanır (28rem). */
const FOLD_ACTIONS_BELOW = 448

/** Tümü bitti ekranı bu iç genişlikten (px) itibaren yatay dizilir (40rem). */
const WIDE_EMPTY_FROM = 640

/**
 * Seçili talep kipinde gerekçe kaç satıra kadar açılır. Kartın geri kalanı sabit yükseklikte
 * (16px kök yazıyla, üç satır gerekçeyle Rahat ~400px, Sıkı ~355px; her ek satır ~21px); kalan
 * alana göre üç, dört ya da altı satır, küçük bir payla.
 */
function reasonClamp(mode: string, budgetPx: number, compact: boolean) {
  if (mode !== 'secili') return 'line-clamp-3'
  const [six, four] = compact ? [425, 385] : [480, 440]
  if (budgetPx >= six) return 'line-clamp-6'
  if (budgetPx >= four) return 'line-clamp-4'
  return 'line-clamp-3'
}

/* ---- Ortak küçük parçalar ---------------------------------------------------------------------- */

/** Göreli zaman (`<time>`); üzerine gelince tam tarih. Rakamlar yalnızca `<time>` içinde kalır. */
export function RequestTime({ date, className }: { date: Date; className?: string }) {
  return (
    <Tooltip delay={500}>
      {/* İpucu yalnızca konum alır; odak ve rol satırda kalsın diye tetikleyici sunum öğesi */}
      <Tooltip.Trigger role="presentation" className="inline-flex shrink-0 cursor-default">
        <Typography {...timeOf(date)} className={cn('text-[0.75rem] leading-5 whitespace-nowrap text-foreground/45', className)}>
          {relative(date)}
        </Typography>
      </Tooltip.Trigger>
      <Tooltip.Content placement="top">{dateTime(date)}</Tooltip.Content>
    </Tooltip>
  )
}

/**
 * Talebin aciliyeti tek işaretle: acilse mercan "Acil" çipi, bir haftadan uzun bekliyorsa soluk
 * saat + "Gecikiyor" (gecikme hiçbir zaman kırmızı değil), ikisi de değilse hiçbir şey.
 */
export function UrgencyMark({ r }: { r: WorkRequest }) {
  if (r.template.urgent) {
    return (
      <Chip size="sm" color="danger" variant="primary" className="shrink-0">
        Acil
      </Chip>
    )
  }
  if (ageDays(r.createdAt) > LATE_DAYS) {
    return (
      <Box className="flex shrink-0 items-center gap-1 text-foreground/45">
        <Clock size={16} strokeWidth={1.5} aria-hidden />
        <Text tone="muted" className="text-[0.75rem] leading-5">
          Gecikiyor
        </Text>
      </Box>
    )
  }
  return null
}

const weekday = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' })

/** Ertelenen talebin ne zaman döneceği, rakamsız ("Yarın sabah geri gelecek"). */
function backWords(until: Date) {
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((dayStart(until) - dayStart(new Date())) / DAY)
  if (days <= 0) return 'Bugün geri gelecek'
  if (days === 1) return 'Yarın sabah geri gelecek'
  const name = weekday.format(until)
  return days < 7 ? `${name} sabahı geri gelecek` : `Gelecek ${name.toLocaleLowerCase('tr')} sabahı geri gelecek`
}

/**
 * "Ertelediklerim": yalnızca ertelenen talep varken, sayısız. Açılan küçük pencerede başlıklar ve
 * her birinin "Geri getir"i; talep kuyruktaki öncelik yerine döner.
 */
export function SnoozedLink({ className }: { className?: string }) {
  const { snoozed } = useTriage()
  const snoozes = useSnoozes()
  const [open, setOpen] = useState(false)
  if (!snoozed.length) return null

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Link className={cn('shrink-0 gap-1.5 text-[0.8125rem] font-medium text-foreground/65', className)}>
        <Clock size={16} strokeWidth={1.5} aria-hidden />
        Ertelediklerim
      </Link>
      <Popover.Content placement="top start" offset={8} className="soft-theme w-80 max-w-[calc(100vw-2rem)]">
        <Popover.Dialog className="flex flex-col gap-2 p-3">
          <Popover.Heading className="px-2 pt-1 text-[0.9375rem] font-semibold tracking-tight">Ertelediklerim</Popover.Heading>
          <Box className="flex flex-col gap-0.5">
            {snoozed.map((r) => {
              const until = snoozes.get(r.id)
              return (
                <Box key={r.id} className="flex items-center gap-3 rounded-tile px-2 py-1.5">
                  <Box className="min-w-0 flex-1">
                    <Typography {...inline} data-item-title truncate weight="medium" className="text-[0.875rem]">
                      {r.template.title}
                    </Typography>
                    <Text tone="muted" className="block truncate text-[0.75rem]">
                      {processOf(r).name}
                      {until && ` · ${backWords(until)}`}
                    </Text>
                  </Box>
                  <Button size="sm" variant="ghost" className="h-9 shrink-0" aria-label={`Geri getir: ${r.template.title}`} onPress={() => bringBack(r.id)}>
                    Geri getir
                  </Button>
                </Box>
              )
            })}
          </Box>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  )
}

/** "Bu arada" satırları: yalnızca doğru olanlar, en fazla iki. */
function MeanwhileLines({ lines, center }: { lines: MeanwhileLine[]; center: boolean }) {
  const home = useHome()
  if (!lines.length) return null
  return (
    <Box className={cn('flex flex-col gap-1.5', center && 'items-center')}>
      <Text tone="muted" className="text-[0.75rem]">
        Bu arada
      </Text>
      {lines.map((line) => (
        <Box key={line.kind} className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', center && 'justify-center')}>
          {line.kind === 'takildi' ? (
            <>
              <Text className="min-w-0 text-[0.875rem]">
                <Typography {...inline} data-item-title className="text-[0.875rem] font-medium text-foreground">
                  {line.row.r.template.title}
                </Typography>{' '}
                uzun süredir aynı adımda
              </Text>
              <Button size="sm" variant="ghost" aria-label={`Hatırlat: ${line.row.r.template.title}`} onPress={() => remindWithToast(line.row.r)}>
                {line.buttonLabel}
              </Button>
            </>
          ) : (
            <>
              <Text className="text-[0.875rem]">{line.text}</Text>
              <Link
                className="text-[0.875rem] font-semibold text-foreground underline underline-offset-4"
                onPress={() => (line.kind === 'bilgi' ? home.openPeek(line.row.r.id, 'following') : home.openPeek(line.r.id, 'drafts'))}
              >
                {line.linkLabel}
              </Link>
            </>
          )}
        </Box>
      ))}
    </Box>
  )
}

/**
 * Sayfanın tek "tümü bitti" ekranı. Sıradaki iş görünürken (seçili talep kipi dışında) kartın
 * yerinde; kart gizli ya da seçili talep kipindeyse kuyrukta. İlk kullanımda (kutu hiç dolmadı)
 * tek cümle. Geniş alanda yatay, dar alanda ortalı dikey. Konfeti yok, ünlem yok.
 */
export function AllDoneState({ owner, wide }: { owner: 'next' | 'queue'; wide: boolean }) {
  const home = useHome()
  const triage = useTriage()
  const lines = useMeanwhile()
  const snoozed = triage.snoozed.length > 0

  const body = !triage.everHad
    ? 'Size bir onay geldiğinde burada göreceksiniz.'
    : owner === 'queue' && snoozed
      ? 'Şimdilik sırada iş yok. Ertelediğiniz işler zamanı gelince geri gelecek.'
      : owner === 'next'
        ? 'Onayınızı bekleyen iş kalmadı. Yeni talepler geldiğinde ilk burada göreceksiniz.'
        : 'Onayınızı bekleyen iş kalmadı. Yeni talepler geldiğinde burada görünür.'

  return (
    <EmptyState
      className={cn(
        'home-fade-in flex min-h-0 flex-1 gap-5 overflow-hidden p-0 text-foreground',
        wide ? 'flex-row items-center px-2' : 'flex-col items-center justify-center text-center',
      )}
    >
      <Surface variant="tertiary" className={cn('grid size-13 shrink-0 place-items-center rounded-pill', tile)}>
        <CheckCheck size={24} strokeWidth={1.5} aria-hidden />
      </Surface>

      <Box className={cn('flex min-w-0 flex-col gap-3', wide ? 'items-start' : 'items-center')}>
        <Box className={cn('flex flex-col gap-1', !wide && 'items-center')}>
          <Typography.Heading
            level={3}
            data-empty-heading
            tabIndex={-1}
            className="rounded-tile text-[1.125rem] font-semibold tracking-tight outline-none focus-visible:status-focused"
          >
            {allDoneTitle()}
          </Typography.Heading>
          <Text className="text-[0.875rem]">{body}</Text>
          {snoozed &&
            (owner === 'next' ? (
              <Box className={cn('flex flex-wrap items-center gap-x-2 gap-y-1', !wide && 'justify-center')}>
                <Text tone="muted" className="text-[0.8125rem]">
                  Ertelediğiniz işler zamanı gelince burada olacak.
                </Text>
                <SnoozedLink />
              </Box>
            ) : (
              <SnoozedLink />
            ))}
        </Box>

        <MeanwhileLines lines={lines} center={!wide} />

        <Button variant="ghost" size="sm" className={cn(wide && '-ms-3')} onPress={() => home.openStart()}>
          <Plus {...ICON} />
          Yeni talep başlat
        </Button>
      </Box>
    </EmptyState>
  )
}

/* ---- Sıradaki iş ------------------------------------------------------------------------------- */

export function NextWidget(props: WidgetBodyProps) {
  const home = useHome()
  const triage = useTriage()
  const secili = props.mode === 'secili'
  // Seçili talep kipinde kuyrukta odaklanan satır; odak yoksa (ya da talep karar verilip düştüyse) ilk talep
  const r = secili ? (triage.all.find((x) => x.id === home.focusedId) ?? triage.all[0]) : triage.head

  if (!r) {
    // Seçili talep kipinde kuyruk boşken pano bu widget'ı çizmez; tümü bitti ekranı kuyrukta
    if (secili) return null
    return <AllDoneState owner="next" wide={props.innerWidthPx >= WIDE_EMPTY_FROM} />
  }
  return <DecisionCard key={r.id} r={r} {...props} />
}

function DecisionCard({ r, mode, density, innerWidthPx, budgetPx }: WidgetBodyProps & { r: WorkRequest }) {
  const home = useHome()
  const triage = useTriage()
  const leaving = useLeaving().has(r.id)
  const rejectRef = useRef<HTMLButtonElement>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [snoozeOpen, setSnoozeOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  const p = processOf(r)
  const Icon = p.icon
  const compact = density === 'compact'
  const secili = mode === 'secili'
  const detailed = mode === 'ayrintili' || secili
  const folded = innerWidthPx < FOLD_ACTIONS_BELOW
  const iconOnly = !folded && innerWidthPx < COMPACT_ACTIONS_BELOW
  const keys = home.keysOn
  const title = r.template.title
  const attachments = r.template.attachments ?? []

  // Karardan sonra gelecek talep: seçili kipte kuyrukta bir sonraki satır, diğerlerinde ilk başka talep
  const idx = triage.all.findIndex((x) => x.id === r.id)
  const upcoming = secili ? (triage.all[idx + 1] ?? triage.all[idx - 1]) : sequenceNext(triage.all, r.id)

  const decideOpts = { from: 'next' as const, setFocusedId: secili ? home.setFocusedId : undefined }
  const approve = () => decideWithUndo(r, 'approved', '', decideOpts)
  const peek = () => home.openPeek(r.id, 'queue')
  const skip = () => {
    if (!upcoming || leaving) return
    home.skip(r.id)
    if (secili) home.setFocusedId(upcoming.id)
    afterPaint(() => void focusNextApprove())
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = triageKey(e, keys, 'next')
    if (!k || leaving) return
    switch (k) {
      case 'approve':
        approve()
        break
      case 'reject':
        setRejectOpen(true)
        break
      case 'snooze':
        if (folded) setMoreOpen(true)
        else setSnoozeOpen(true)
        break
      case 'peek':
        peek()
        break
      case 'toggleRead':
        toggleRead(r)
        break
      case 'skip':
        skip()
        break
      default:
        return
    }
    e.preventDefault()
  }

  /**
   * İpucu metni; tek tuş kısayolları kapalıyken harf gösterilmez. Kartta odak hep "Karar" araç
   * çubuğundaki bir düğmede durur: orada Boşluk o düğmeye basar, ← / → düğmeler arasında gezer
   * (ARIA toolbar). Bu yüzden "İncele" tuş göstermez, "Atla" J'yi gösterir (→ araç çubuğu
   * dışındayken de çalışır).
   */
  const tip = (label: string, key?: string) => (keys && key ? `${label} · ${key}` : label)

  return (
    // Beliriş animasyonu dolgu değerini (opacity 1) tuttuğu için solarken sınıf değişir
    <Box onKeyDown={onKeyDown} className={cn('flex min-h-0 flex-1 flex-col', leaving ? 'home-row-leave' : 'home-fade-in')}>
      {/*
       * Alan yetmezse (ör. büyük yazı boyutu) kırpılan yalnızca bu orta bölüm olur, karar çubuğu hep
       * görünür; parçalar küçülmez, sondan (Sıradaki satırı) kırpılır.
       */}
      <Box className={cn('flex min-h-0 flex-1 flex-col overflow-hidden [&>*]:shrink-0', compact ? 'gap-2' : 'gap-3')}>
        {/* Süreç ve neden sırada */}
        <Box className="flex items-center gap-3">
          <Surface variant="tertiary" className={cn('grid shrink-0 place-items-center rounded-pill', tile, compact ? 'size-9' : 'size-11')}>
            <Icon {...ICON} />
          </Surface>
          <Text className="min-w-0 flex-1 truncate text-[0.8125rem]">
            {p.name} · {p.department}
          </Text>
          <UrgencyMark r={r} />
        </Box>

        <Typography.Heading
          level={3}
          data-item-title
          weight="semibold"
          className="line-clamp-2 min-h-[2lh] text-[1.25rem] leading-tight tracking-tight"
        >
          {title}
        </Typography.Heading>

        {/* Talep sahibi */}
        <Box className="flex min-w-0 items-center gap-2">
          <Avatar size="sm" color={avatarColor(r.requester.name)} aria-hidden className={cn('shrink-0', compact && 'size-7')}>
            <Avatar.Fallback className="text-[0.75rem] font-semibold">{initials(r.requester.name)}</Avatar.Fallback>
          </Avatar>
          <Text className="min-w-0 truncate text-[0.8125rem]">
            {r.requester.name} · {r.requester.department} ·
          </Text>
          <RequestTime date={r.createdAt} />
        </Box>

        <Text className="truncate text-[0.8125rem]">
          <Text tone="muted">Sizden beklenen: </Text>
          <Text tone="primary" className="font-medium">
            {p.steps[p.approverStep]}
          </Text>
        </Text>

        {detailed && (
          <>
            {/* Onay yolu: tek satır, taşarsa yatay kaydırma gölgesi; rakam yok */}
            <ScrollShadow orientation="horizontal" hideScrollBar size={24} role="list" aria-label="Onay yolu" className="flex shrink-0 items-center gap-1.5">
              {p.steps.map((step, i) =>
                i < p.approverStep ? (
                  <Chip key={step} role="listitem" size="sm" variant="tertiary" className="shrink-0 whitespace-nowrap text-foreground/65">
                    <Check size={14} strokeWidth={1.5} aria-hidden />
                    <Chip.Label>{step}</Chip.Label>
                  </Chip>
                ) : i === p.approverStep ? (
                  <Chip key={step} role="listitem" size="sm" color="accent" variant="primary" className="shrink-0 whitespace-nowrap">
                    {`Sizde · ${step}`}
                  </Chip>
                ) : (
                  <Chip key={step} role="listitem" size="sm" variant="secondary" className="shrink-0 whitespace-nowrap text-foreground/45">
                    {step}
                  </Chip>
                ),
              )}
            </ScrollShadow>

            <Typography.Paragraph
              size="sm"
              data-item-title
              className={cn('min-h-[3lh] leading-normal text-foreground/65', reasonClamp(mode, budgetPx, compact))}
            >
              {r.template.reason}
            </Typography.Paragraph>

            {attachments.length > 0 ? (
              <ScrollShadow orientation="horizontal" hideScrollBar size={24} role="list" aria-label="Ekler" className="flex shrink-0 items-center gap-1.5">
                {attachments.map((file) => (
                  <Chip key={file} role="listitem" size="sm" variant="secondary" className="shrink-0">
                    <Paperclip size={14} strokeWidth={1.5} aria-hidden />
                    <Chip.Label data-item-title className="max-w-48 truncate">
                      {file}
                    </Chip.Label>
                  </Chip>
                ))}
              </ScrollShadow>
            ) : (
              <Text tone="muted" className="shrink-0 text-[0.75rem] leading-5">
                Ek yok
              </Text>
            )}

            <Text tone="muted" className="shrink-0 truncate text-[0.75rem]">
              {upcoming ? `Sıradaki: ${upcoming.requester.name} · ${processOf(upcoming).name}` : 'Sırada başka iş yok'}
            </Text>
          </>
        )}
      </Box>

      <Card.Footer className={cn('mt-auto shrink-0', compact ? 'pt-2' : 'pt-3')}>
        <Toolbar aria-label="Karar" className="flex w-full min-w-0 items-center gap-2">
          <Tooltip>
            <Button variant="primary" data-next-approve data-request-id={r.id} isDisabled={leaving} onPress={approve}>
              <Check {...ICON} />
              Onayla
            </Button>
            <Tooltip.Content>{tip('Onayla', 'A')}</Tooltip.Content>
          </Tooltip>

          <Tooltip>
            <Button ref={rejectRef} variant="secondary" isDisabled={leaving} aria-haspopup="dialog" aria-expanded={rejectOpen} onPress={() => setRejectOpen(true)}>
              <X {...ICON} />
              Reddet
            </Button>
            <Tooltip.Content>{tip('Reddet', 'R')}</Tooltip.Content>
          </Tooltip>

          {folded ? (
            <MoreActions
              r={r}
              isOpen={moreOpen}
              onOpenChange={setMoreOpen}
              canSkip={!!upcoming}
              isDisabled={leaving}
              onPeek={peek}
              onSkip={skip}
              setFocusedId={secili ? home.setFocusedId : undefined}
            />
          ) : (
            <>
              <SnoozeMenu r={r} from="next" isOpen={snoozeOpen} onOpenChange={setSnoozeOpen}>
                <Tooltip>
                  <Button variant="ghost" isIconOnly={iconOnly} isDisabled={leaving} aria-label={iconOnly ? `Sonra: ${title}` : undefined} className={cn(iconOnly && 'size-10')}>
                    <Clock {...ICON} />
                    {!iconOnly && (
                      <>
                        Sonra
                        <ChevronDown size={16} strokeWidth={1.5} aria-hidden />
                      </>
                    )}
                  </Button>
                  <Tooltip.Content>{tip('Sonra', 'H')}</Tooltip.Content>
                </Tooltip>
              </SnoozeMenu>

              <Tooltip>
                <Button variant="ghost" isIconOnly={iconOnly} aria-label={iconOnly ? `İncele: ${title}` : undefined} className={cn(iconOnly && 'size-10')} onPress={peek}>
                  <Eye {...ICON} />
                  {!iconOnly && 'İncele'}
                </Button>
                <Tooltip.Content>{tip('İncele')}</Tooltip.Content>
              </Tooltip>

              <Tooltip>
                <Button
                  variant="ghost"
                  isIconOnly={iconOnly}
                  isDisabled={leaving || !upcoming}
                  aria-label={iconOnly ? `Atla: ${title}` : undefined}
                  className={cn('ml-auto', iconOnly && 'size-10')}
                  onPress={skip}
                >
                  <ArrowRight {...ICON} />
                  {!iconOnly && 'Atla'}
                </Button>
                <Tooltip.Content>{tip('Atla', 'J')}</Tooltip.Content>
              </Tooltip>
            </>
          )}
        </Toolbar>
      </Card.Footer>

      <RejectPopover r={r} from="next" triggerRef={rejectRef} isOpen={rejectOpen} onOpenChange={setRejectOpen} />
    </Box>
  )
}

/** Dar kartta "Sonra / İncele / Atla" tek "…" menüsünde ("Diğer işlemler"). H tuşu da bunu açar. */
function MoreActions({
  r,
  isOpen,
  onOpenChange,
  canSkip,
  isDisabled,
  onPeek,
  onSkip,
  setFocusedId,
}: {
  r: WorkRequest
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  canSkip: boolean
  isDisabled: boolean
  onPeek: () => void
  onSkip: () => void
  setFocusedId?: (id: string | null) => void
}) {
  const targets = snoozeTargets()
  return (
    <Dropdown isOpen={isOpen} onOpenChange={onOpenChange}>
      <Button isIconOnly variant="ghost" aria-label={`Diğer işlemler: ${r.template.title}`} isDisabled={isDisabled} className="ml-auto size-10">
        <Ellipsis {...ICON} />
      </Button>
      <Dropdown.Popover placement="top end" className="soft-theme min-w-56">
        <Dropdown.Menu
          aria-label={`Diğer işlemler: ${r.template.title}`}
          disabledKeys={canSkip ? [] : ['skip']}
          onAction={(key) => {
            const k = String(key)
            if (k === 'peek') onPeek()
            else if (k === 'skip') onSkip()
            else if (k.startsWith('snooze:')) {
              const target = targets.find((t) => `snooze:${t.id}` === k)
              if (target) snoozeWithUndo(r, target, { from: 'next', setFocusedId })
            }
          }}
        >
          <Dropdown.Section>
            <Header>Sonra</Header>
            {targets.map((t) => (
              <Dropdown.Item key={t.id} id={`snooze:${t.id}`} textValue={t.label}>
                <Clock size={16} strokeWidth={1.5} aria-hidden className="text-foreground/55" />
                {t.label}
              </Dropdown.Item>
            ))}
          </Dropdown.Section>
          <Dropdown.Section aria-label="Talep">
            <Dropdown.Item id="peek" textValue="İncele">
              <Eye size={16} strokeWidth={1.5} aria-hidden className="text-foreground/55" />
              İncele
            </Dropdown.Item>
            <Dropdown.Item id="skip" textValue="Atla">
              <ArrowRight size={16} strokeWidth={1.5} aria-hidden className="text-foreground/55" />
              Atla
            </Dropdown.Item>
          </Dropdown.Section>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
