import { useMemo, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react'
import { Avatar, Badge, Button, Kbd, Link, Table, Tooltip, Typography, cn } from '@heroui/react'
import { Check, Clock, X } from 'lucide-react'
import { isUnread, toggleRead, useReadOverrides } from '@/pages/workflows/triage'
import { avatarColor, findProcess, initials, processOf, type WorkRequest } from '@/pages/workflows/workflowData'
import { decideWithUndo, focusRow, triageKey, useLeaving } from '@/pages/workspace/home/actions'
import { useHome } from '@/pages/workspace/home/HomeContext'
import { fitRows, flatRows, type RowSection } from '@/pages/workspace/home/metrics'
import { RejectPopover } from '@/pages/workspace/home/RejectPopover'
import { SnoozeMenu } from '@/pages/workspace/home/SnoozeMenu'
import type { WidgetBodyProps } from '@/pages/workspace/home/types'
import { queueSections, useTriage } from '@/pages/workspace/home/useTriage'
import { AllDoneState, RequestTime, SnoozedLink, UrgencyMark } from '@/pages/workspace/home/widgets/NextWidget'
import { Box, Text } from '@/pages/workspace/ui'
import { ICON, inline } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Onayınızı bekleyenler
 *
 * Karar bekleyen işlerin tam listesi; öncelik sayıyla değil kelimelerle kurulur. Üç kip:
 * - `aciliyet`  "Acil", "Gecikenler", "Bu hafta gelenler", "Bugün gelenler" başlıkları altında;
 *               satırda durum çipi yok, başlık zaten söylüyor.
 * - `surec`     süreç başlıkları (ikon + ad); satırda "Acil" ya da soluk "Gecikiyor".
 * - `sade`      tek satırlık düz liste (dar ya da sakin yuvalar için).
 *
 * Her grup ayrı bir HeroUI `Table` (başlık satırı yalnızca ekran okuyucuya); satır ya da Enter
 * önizlemeyi açar (`onRowAction`), Boşluk da. Satırda "Onayla", "Reddet" (X) ve "Sonra" (saat)
 * her zaman görünür; "Onayla" yalnızca üzerine gelinen / odaktaki satırda siyahtır (sıradaki iş
 * seçili talep kipindeyse hiç). Sıradaki iş kartı ilk talebi zaten gösteriyorsa kuyrukta tekrar
 * etmez (`board.excludeHead`).
 *
 * Kaç satır çizileceği DOM ölçülmeden hesaplanır (`fitRows`): kayıtlı yükseklikten başlık, alt
 * bilgi şeridi ve sabit satır yükseklikleri düşülür; satır yarıda kesilmez, widget içinde kaydırma
 * yok. Tek sütunda en fazla sekiz satır.
 *
 * Klavye (odak bu widget'ın içindeyken): J / ↓ sonraki, K / ↑ önceki satır (grup tabloları
 * arasında da geçer), A onayla, R reddet, H sonra, Boşluk / Enter incele, E okundu / okunmadı.
 * Satır odağı seçili talep kartını yönetir (`focusedId`).
 * ------------------------------------------------------------------------------------------------- */

/** Bu iç genişliğin (px) altında "Zaman" sütunu kalkar, zaman ikinci satırın sonuna iner (32rem). */
const NARROW_BELOW = 512

/** Bu iç genişliğin (px) altında Kbd ipucu satırı kısalır (30rem). */
const SHORT_HINTS_BELOW = 480

/** Tümü bitti ekranı bu iç genişlikten (px) itibaren yatay dizilir (40rem). */
const WIDE_EMPTY_FROM = 640

export function QueueWidget({ mode, budgetPx, cap, m, hc, innerWidthPx }: WidgetBodyProps) {
  const home = useHome()
  const triage = useTriage()
  const leaving = useLeaving()
  const overrides = useReadOverrides()

  const [hoverId, setHoverId] = useState<string | null>(null)
  const [focusWithinId, setFocusWithinId] = useState<string | null>(null)
  const [snoozeId, setSnoozeId] = useState<string | null>(null)
  const [rejectId, setRejectId] = useState<string | null>(null)
  const rejectTrigger = useRef<Element | null>(null)

  const { excludeHead, allDoneOwner } = home.board
  const sade = mode === 'sade'
  const surec = mode === 'surec'
  const narrow = innerWidthPx < NARROW_BELOW
  const keys = home.keysOn
  // Sıradaki iş seçili talep kipindeyse siyah "Onayla" kartta; kuyruktaki satırlar hep ikincil
  const seciliNext = home.isShown('next') && home.modeOf('next') === 'secili'

  const sections = useMemo(() => queueSections(triage, mode, excludeHead), [triage, mode, excludeHead])
  const hasRows = sections.length > 0
  const hintsOn = home.state.shortcutHints && keys
  const sizes = { row: sade ? m.sadeRow : m.queueRow, heading: m.heading }
  let footer = hasRows && (triage.snoozed.length > 0 || hintsOn)
  let fitted: RowSection<WorkRequest>[] = fitRows(sections, budgetPx - (footer ? m.footer : 0), sizes, cap)
  // Çok alçak bir widget'ta (ör. Sıkı, en küçük boy) önce alt bilgi şeridi, sonra grup başlıkları
  // bırakılır; kuyrukta iş varken liste hiçbir zaman boş görünmesin
  if (!fitted.length && hasRows && footer) {
    footer = false
    fitted = fitRows(sections, budgetPx, sizes, cap)
  }
  if (!fitted.length && hasRows) fitted = fitRows(sections.map((s) => ({ ...s, headed: false })), budgetPx, sizes, cap)
  const rows = flatRows(fitted)

  // Seçili talep kipinde kartın gösterdiği satır (odak yoksa ilk talep); satır açık bir şeritle işaretlenir
  const currentId = seciliNext ? (triage.all.find((r) => r.id === home.focusedId) ?? triage.all[0])?.id : undefined
  const rejectR = rejectId ? triage.all.find((r) => r.id === rejectId) : undefined

  if (!hasRows) {
    // Kuyruk tümü bitti ekranının sahibiyse (sıradaki iş gizli ya da seçili talep kipinde) tam ekran
    if (allDoneOwner === 'queue') return <AllDoneState owner="queue" wide={innerWidthPx >= WIDE_EMPTY_FROM} />
    // Sıradaki iş kartı ilk (ve tek) talebi gösteriyor; "Boşken gizle" kapalıysa tek soluk satır
    return (
      <Box className="flex min-h-0 flex-1 flex-col items-start justify-center gap-2 px-1">
        <Text tone="muted" data-empty-heading tabIndex={-1} className="rounded-tile text-[0.875rem] outline-none focus-visible:status-focused">
          Onay bekleyen başka iş yok.
        </Text>
        <SnoozedLink />
      </Box>
    )
  }

  const openReject = (id: string, trigger: Element | null) => {
    rejectTrigger.current = trigger
    setRejectId(id)
  }

  const peekRow = (id: string) => home.openPeek(id, 'queue')

  /**
   * Boşluk (ve seçili talep kipinde Enter) satırın kendi basma işleyicisinden önce yakalanır:
   * React Aria satırda bu iki tuşu tüketip yayılımı durdurur. Yalnızca odak satırın kendisindeyken;
   * satırdaki bir düğmede Boşluk o düğmeye basar. Harf olmadığı için tek tuş tercihinden bağımsız.
   */
  const onKeyDownCapture = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== ' ' && !(e.key === 'Enter' && seciliNext)) return
    if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
    const t = e.target
    if (!(t instanceof Element) || !t.matches('[data-row-id]') || !e.currentTarget.contains(t)) return
    e.preventDefault()
    e.stopPropagation()
    peekRow(t.getAttribute('data-row-id') ?? '')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = triageKey(e, keys, 'list')
    if (!k || k === 'peek') return
    const rowEl = e.target instanceof Element ? e.target.closest<HTMLElement>('[data-row-id]') : null
    const id = rowEl?.getAttribute('data-row-id') ?? null
    const ids = rows.map((r) => r.id)

    if (k === 'down' || k === 'up') {
      // Tablo kendi içinde ↑ / ↓'yi karşılar; buraya yalnızca tablonun ucunda (ya da J / K ile) gelir
      const at = id ? ids.indexOf(id) : -1
      const target = at < 0 ? ids[0] : ids[k === 'down' ? at + 1 : at - 1]
      if (target) focusRow(target, e.currentTarget)
      e.preventDefault()
      return
    }

    const r = id ? rows.find((x) => x.id === id) : undefined
    if (!r || leaving.has(r.id)) return
    e.preventDefault()
    switch (k) {
      case 'approve':
        decideWithUndo(r, 'approved', '', { from: 'queue' })
        break
      case 'reject':
        openReject(r.id, rowEl?.querySelector('[data-reject-trigger]') ?? rowEl)
        break
      case 'snooze':
        setSnoozeId(r.id)
        break
      case 'toggleRead':
        toggleRead(r)
        break
    }
  }

  const rowIdOf = (e: FocusEvent<HTMLDivElement>) =>
    e.target instanceof Element && e.currentTarget.contains(e.target) ? e.target.closest('[data-row-id]')?.getAttribute('data-row-id') : null

  const onFocus = (e: FocusEvent<HTMLDivElement>) => {
    const id = rowIdOf(e)
    if (!id) return
    setFocusWithinId(id)
    if (seciliNext && home.focusedId !== id) home.setFocusedId(id)
  }

  const onBlur = (e: FocusEvent<HTMLDivElement>) => {
    const next = e.relatedTarget
    if (!(next instanceof Node) || !e.currentTarget.contains(next)) setFocusWithinId(null)
  }

  /** İpucu metni; tek tuş kısayolları kapalıyken harf gösterilmez. */
  const tip = (label: string, key: string) => (keys ? `${label} · ${key}` : label)

  const renderRow = (r: WorkRequest) => {
    const p = processOf(r)
    const title = r.template.title
    const unread = isUnread(r, overrides)
    const isLeaving = leaving.has(r.id)
    const active = !seciliNext && (hoverId === r.id || focusWithinId === r.id)
    const line2 = surec ? `${r.requester.name} · ${r.requester.department}` : `${p.name} · ${r.requester.name}`

    const avatar = (
      <Avatar size="sm" color={avatarColor(r.requester.name)} aria-hidden className="shrink-0">
        <Avatar.Fallback className="text-[0.75rem] font-semibold">{initials(r.requester.name)}</Avatar.Fallback>
      </Avatar>
    )

    return (
      <Table.Row
        key={r.id}
        id={r.id}
        data-row-id={r.id}
        onHoverStart={() => setHoverId(r.id)}
        onHoverEnd={() => setHoverId((h) => (h === r.id ? null : h))}
        className={cn(
          // Üzerine gelince / odakta yuvarlak şerit: index.css › `.home-board .table-root--secondary`
          sade ? hc.sadeRow : hc.queueRow,
          // Seçili talep kipinde kartta gösterilen satır: bir kat daha açık, beyaz karo şeridi
          currentId === r.id && '[&>td]:bg-(--surface-tertiary)',
          isLeaving && 'home-row-leave',
        )}
      >
        {/* Talep */}
        <Table.Cell className="w-full max-w-0 py-0 ps-3 pe-2">
          {sade ? (
            <Box className="flex min-w-0 items-center gap-2">
              <Text className="min-w-0 truncate text-[0.875rem]">
                <Typography {...inline} data-item-title weight={unread ? 'semibold' : 'medium'} className="text-[0.875rem] text-foreground">
                  {title}
                </Typography>
                <Text tone="muted"> · {p.name}</Text>
              </Text>
              {unread && <Text className="sr-only">Okunmadı</Text>}
              {narrow && <UrgencyMark r={r} />}
            </Box>
          ) : (
            <Box className="flex min-w-0 items-center gap-3">
              {unread ? (
                <Badge.Anchor className="shrink-0">
                  {avatar}
                  <Badge color="success" size="sm" placement="top-right" className="size-2.5 min-h-0 min-w-0">
                    <Text className="sr-only">Okunmadı</Text>
                  </Badge>
                </Badge.Anchor>
              ) : (
                avatar
              )}
              <Box className="min-w-0 flex-1">
                <Typography {...inline} data-item-title truncate weight={unread ? 'semibold' : 'medium'} className="text-[0.875rem] leading-5">
                  {title}
                </Typography>
                <Box className="flex min-w-0 items-center gap-1.5">
                  <Text className="min-w-0 truncate text-[0.8125rem] leading-5">{line2}</Text>
                  {narrow && (
                    <>
                      {surec && <UrgencyMark r={r} />}
                      <RequestTime date={r.createdAt} />
                    </>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </Table.Cell>

        {/* Zaman (dar alanda ikinci satırın sonunda) */}
        {!narrow ? (
          <Table.Cell className="px-2 py-0 whitespace-nowrap">
            <Box className="flex items-center justify-end gap-2">
              {(surec || sade) && <UrgencyMark r={r} />}
              <RequestTime date={r.createdAt} />
            </Box>
          </Table.Cell>
        ) : null}

        {/* İşlem: her zaman görünür, yalnızca üzerine gelince değil */}
        <Table.Cell className="py-0 ps-1 pe-2">
          <Box className="flex items-center justify-end gap-1">
            <Tooltip>
              <Button
                size="sm"
                variant={active ? 'primary' : 'secondary'}
                aria-label={`Onayla: ${title}`}
                isDisabled={isLeaving}
                className="h-9"
                onPress={() => decideWithUndo(r, 'approved', '', { from: 'queue' })}
              >
                <Check {...ICON} />
                Onayla
              </Button>
              <Tooltip.Content>{tip('Onayla', 'A')}</Tooltip.Content>
            </Tooltip>

            <Tooltip>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                data-reject-trigger
                aria-label={`Reddet: ${title}`}
                aria-haspopup="dialog"
                isDisabled={isLeaving}
                className="size-9"
                onPress={(e) => openReject(r.id, e.target)}
              >
                <X {...ICON} />
              </Button>
              <Tooltip.Content>{tip('Reddet', 'R')}</Tooltip.Content>
            </Tooltip>

            <SnoozeMenu r={r} from="queue" isOpen={snoozeId === r.id} onOpenChange={(open) => setSnoozeId(open ? r.id : null)}>
              {sade ? (
                // Sade satırda saat düğmesi yer kaplamaz: ekran okuyucuya açık, görsel olarak gizli
                // tetikleyici; menü H ile de açılır
                <Button size="sm" variant="ghost" excludeFromTabOrder isDisabled={isLeaving} className="sr-only">
                  {`Sonra: ${title}`}
                </Button>
              ) : (
                <Tooltip>
                  <Button isIconOnly size="sm" variant="ghost" aria-label={`Sonra: ${title}`} isDisabled={isLeaving} className="size-9">
                    <Clock {...ICON} />
                  </Button>
                  <Tooltip.Content>{tip('Sonra', 'H')}</Tooltip.Content>
                </Tooltip>
              )}
            </SnoozeMenu>
          </Box>
        </Table.Cell>
      </Table.Row>
    )
  }

  return (
    <Box onKeyDownCapture={onKeyDownCapture} onKeyDown={onKeyDown} onFocus={onFocus} onBlur={onBlur} className="flex min-h-0 flex-1 flex-col">
      <Box className="min-h-0 flex-1">
        {fitted.map((s) => {
          const GroupIcon = surec ? findProcess(s.id)?.icon : undefined
          return (
            <Box key={s.id}>
              {s.headed && (
                <Typography.Heading
                  level={3}
                  className={cn(hc.heading, 'flex min-w-0 items-end gap-2 ps-3 pb-2 text-[0.8125rem] leading-5 font-medium tracking-normal text-foreground/65')}
                >
                  {GroupIcon && <GroupIcon size={16} strokeWidth={1.5} aria-hidden className="mb-0.5 shrink-0" />}
                  <Text className="shrink-0 text-current!">{s.label}</Text>
                  {s.hint && (
                    <Text tone="muted" className="min-w-0 truncate font-normal">
                      · {s.hint}
                    </Text>
                  )}
                </Typography.Heading>
              )}
              <Table variant="secondary" className="bg-transparent p-0">
                <Table.ScrollContainer className="overflow-hidden">
                  {/*
                   * Satıra basmak önizlemeyi açar. Seçili talep kipinde (Onay masası) tıklama yalnızca
                   * seçer, yandaki kart o talebi gösterir; önizleme Enter / Boşluk ile açılır.
                   */}
                  <Table.Content aria-label={s.label} onRowAction={seciliNext ? undefined : (key) => peekRow(String(key))}>
                    <Table.Header className="sr-only">
                      <Table.Column isRowHeader>Talep</Table.Column>
                      {!narrow ? <Table.Column>Zaman</Table.Column> : null}
                      <Table.Column>İşlem</Table.Column>
                    </Table.Header>
                    <Table.Body>{s.rows.map(renderRow)}</Table.Body>
                  </Table.Content>
                </Table.ScrollContainer>
              </Table>
            </Box>
          )
        })}
      </Box>

      {footer && (
        <Box className={cn(hc.footer, 'mt-auto flex shrink-0 items-center gap-3 ps-3 pe-1')}>
          <SnoozedLink />
          {hintsOn && <ShortcutHints short={innerWidthPx < SHORT_HINTS_BELOW} />}
        </Box>
      )}

      {rejectR && (
        <RejectPopover
          key={rejectR.id}
          r={rejectR}
          from="queue"
          triggerRef={rejectTrigger}
          isOpen
          onOpenChange={(open) => {
            if (!open) setRejectId(null)
          }}
        />
      )}
    </Box>
  )
}

/** Kuyruğun altındaki soluk tuş ipuçları ("Kısayol ipuçları" açıkken); "Kısayollar" pencereyi açar. */
function ShortcutHints({ short }: { short: boolean }) {
  const home = useHome()
  const items: { key: string; label: string; wide?: boolean }[] = [
    { key: 'A', label: 'Onayla' },
    { key: 'R', label: 'Reddet' },
    { key: 'H', label: 'Sonra', wide: true },
    { key: 'Boşluk', label: 'İncele', wide: true },
  ]
  return (
    <Box className="ms-auto flex min-w-0 items-center gap-2 overflow-hidden whitespace-nowrap text-[0.75rem] text-foreground/45">
      {items
        .filter((it) => !short || !it.wide)
        .map((it) => (
          <Box key={it.key} className="flex shrink-0 items-center gap-1.5">
            <Kbd className="h-5 rounded-pill px-1.5 text-[0.75rem]">{it.key}</Kbd>
            <Text tone="muted" className="text-[0.75rem]">
              {it.label}
            </Text>
            <Text tone="muted" aria-hidden className="text-[0.75rem]">
              ·
            </Text>
          </Box>
        ))}
      <Link className="flex shrink-0 items-center gap-1.5 text-[0.75rem] font-normal text-foreground/45" onPress={home.openShortcuts}>
        <Kbd className="h-5 rounded-pill px-1.5 text-[0.75rem]">?</Kbd>
        Kısayollar
      </Link>
    </Box>
  )
}
