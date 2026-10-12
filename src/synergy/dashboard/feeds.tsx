import type { ReactNode } from 'react'
import { Avatar, Flex, Typography } from 'antd'
import { ArrowLeftRight, Bell, FileText, MessageSquare, type LucideIcon } from 'lucide-react'
import { initials, relative } from '@/synergy/shared/workflowData'
import {
  activities,
  announcements,
  delegationState,
  formatDay,
  givenDelegations,
  receivedDelegations,
  START_MOCK_LABELS,
} from '@/synergy/shared/startMock'
import { DOC_LABELS, recentDocuments } from '@/synergy/shared/documents'
import { IC, Scroll, cn } from '@/synergy/ant/ui'
import { WidgetCard, WidgetTitle } from '@/synergy/dashboard/widgets'
import type { WidgetSize } from '@/synergy/dashboard/model'

/*
 * Başlangıç panosunun akış widget'ları (açık istek üzerine eklenen maketler; verileri başlat
 * kutusunun bölümleriyle ortak, `shared/startMock.ts` / `shared/documents.ts`): Duyurular,
 * Aktiviteler, Vekaletler, Son Dokümanlar. Hepsi satır listesi: başlık, altında kayan satırlar;
 * geniş boyutlarda iki sütun, kısa boyutlarda satır sayısı kadar.
 */

/** Satır: solda ikon ya da avatar, ortada ad ve not, sağda zaman. */
function Row({
  lead,
  icon: Icon,
  label,
  note,
  time,
  extra,
  unread = false,
}: {
  lead?: ReactNode
  icon?: LucideIcon
  label: string
  note?: ReactNode
  time?: string
  /** Sağda (durum rozeti). */
  extra?: ReactNode
  unread?: boolean
}) {
  return (
    <Flex
      role="listitem"
      align="center"
      gap={10}
      className="min-h-11 shrink-0 rounded-xl px-1.5 py-1 hover:bg-surface-secondary"
    >
      {lead ?? (
        <Flex
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-soft-foreground"
        >
          {Icon && <Icon {...IC} size={16} />}
        </Flex>
      )}
      <Flex vertical className="min-w-0 flex-1">
        <Flex align="center" gap={6} className="min-w-0">
          {unread && (
            <Flex aria-hidden className="block size-1.5 shrink-0 rounded-full bg-accent" />
          )}
          <Typography.Text
            className={cn('block min-w-0 truncate text-sm leading-snug', unread && 'font-medium')}
          >
            {label}
          </Typography.Text>
        </Flex>
        {note && (
          <Typography.Text className="block truncate text-xs leading-tight text-muted">
            {note}
          </Typography.Text>
        )}
      </Flex>
      {time && (
        <Typography.Text className="shrink-0 text-xs text-muted tabular-nums">
          {time}
        </Typography.Text>
      )}
      {extra}
    </Flex>
  )
}

/** Liste: kartı doldurur, taşınca kayar; geniş boyutta iki sütun. */
function Rows({
  label,
  columns = 1,
  children,
}: {
  label: string
  columns?: 1 | 2
  children: ReactNode
}) {
  return (
    <Scroll className="-mx-1.5 min-h-0 flex-1">
      <Flex
        role="list"
        aria-label={label}
        vertical={columns === 1}
        className={cn(columns === 2 && 'grid grid-cols-2 gap-x-3')}
      >
        {children}
      </Flex>
    </Scroll>
  )
}

/* --- Duyurular --------------------------------------------------------------------------------- */

export function AnnouncementsWidget({ size }: { size: WidgetSize }) {
  const wide = size.w >= 6
  const unread = announcements.filter((a) => a.unread).length
  return (
    <WidgetCard className="gap-2">
      <WidgetTitle
        icon={Bell}
        extra={
          unread > 0 && (
            <Typography.Text className="text-xs text-accent-soft-foreground">
              {unread} yeni
            </Typography.Text>
          )
        }
      >
        {START_MOCK_LABELS.announcements}
      </WidgetTitle>
      <Rows label={START_MOCK_LABELS.announcements} columns={wide ? 2 : 1}>
        {announcements.map((a) => (
          <Row
            key={a.id}
            icon={Bell}
            label={a.title}
            note={a.summary}
            time={relative(a.date)}
            unread={a.unread}
          />
        ))}
      </Rows>
    </WidgetCard>
  )
}

/* --- Aktiviteler ------------------------------------------------------------------------------- */

export function ActivityWidget({ size }: { size: WidgetSize }) {
  const wide = size.w >= 6
  return (
    <WidgetCard className="gap-2">
      <WidgetTitle icon={MessageSquare}>{START_MOCK_LABELS.activities}</WidgetTitle>
      <Rows label={START_MOCK_LABELS.activities} columns={wide ? 2 : 1}>
        {activities.map((a) => (
          <Row
            key={a.id}
            lead={
              <Avatar
                size={32}
                className="shrink-0 bg-accent-soft! text-xs font-semibold text-accent-soft-foreground!"
              >
                {initials(a.who.name)}
              </Avatar>
            }
            label={`${a.who.name} ${a.action}`}
            note={a.text ?? a.target}
            time={relative(a.date)}
            unread={a.unread}
          />
        ))}
      </Rows>
    </WidgetCard>
  )
}

/* --- Vekaletler -------------------------------------------------------------------------------- */

const STATE_LABEL = {
  active: START_MOCK_LABELS.active,
  planned: START_MOCK_LABELS.planned,
  ended: START_MOCK_LABELS.ended,
} as const
const STATE_PILL = {
  active: 'bg-success/15 text-foreground/85',
  planned: 'bg-warning/20 text-foreground/85',
  ended: 'bg-surface-tertiary text-muted',
} as const

export function DelegationsWidget({ size }: { size: WidgetSize }) {
  // Alçak boyutta yalnızca aktif ve planlı vekaletler; büyükte hepsi
  const low = size.h <= 2
  const items = [
    ...givenDelegations.map((d) => ({ d, prefix: 'Vekilim:' })),
    ...receivedDelegations.map((d) => ({ d, prefix: 'Vekili olduğum:' })),
  ].filter(({ d }) => !low || delegationState(d) !== 'ended')
  return (
    <WidgetCard className="gap-2">
      <WidgetTitle icon={ArrowLeftRight}>{START_MOCK_LABELS.delegations}</WidgetTitle>
      <Rows label={START_MOCK_LABELS.delegations}>
        {items.map(({ d, prefix }) => {
          const state = delegationState(d)
          return (
            <Row
              key={d.id}
              lead={
                <Avatar
                  size={32}
                  className="shrink-0 bg-accent-soft! text-xs font-semibold text-accent-soft-foreground!"
                >
                  {initials(d.person.name)}
                </Avatar>
              }
              label={`${prefix} ${d.person.name}`}
              note={`${d.scope} · ${formatDay(d.start)} – ${formatDay(d.end)}`}
              extra={
                <Typography.Text
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                    STATE_PILL[state],
                  )}
                >
                  {STATE_LABEL[state]}
                </Typography.Text>
              }
            />
          )
        })}
      </Rows>
    </WidgetCard>
  )
}

/* --- Son dokümanlar ---------------------------------------------------------------------------- */

export function DocumentsWidget({ size }: { size: WidgetSize }) {
  const wide = size.w >= 6
  return (
    <WidgetCard className="gap-2">
      <WidgetTitle icon={FileText}>{DOC_LABELS.recentDocs}</WidgetTitle>
      <Rows label={DOC_LABELS.recentDocs} columns={wide ? 2 : 1}>
        {recentDocuments.map((d) => (
          <Row key={d.id} icon={d.icon} label={d.name} note={d.repo} time={relative(d.openedAt)} />
        ))}
      </Rows>
    </WidgetCard>
  )
}
