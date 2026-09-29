import { Check } from 'lucide-react'
import { Avatar, Chip, Typography, cn } from '@heroui/react'
import { avatarColor, initials } from '@/synergy/shared/workflowData'
import {
  formatDay,
  formatMoney,
  fullName,
  hrRecord,
  type HrRecord,
  type HrStatus,
} from '@/synergy/shared/hrData'
import { inline } from '@/synergy/shared/tokens'
import { Box, Text } from '@/synergy/shared/ui'
import { IC } from '@/synergy/v1/parts'
import { STATUS_DOT } from '@/synergy/v1/hr/HrFields'
import { refLabel, type Column } from '@/synergy/v1/hr/modules'

/* İK tablosunun hücreleri: kullanıcı (avatar + ad + kullanıcı adı), durum işareti, vardiya saat
   çubuğu, grup üyesi avatarları, para, tarih; sıralama ve arama için düz değer. */

/** Kullanıcı kaydı (hücre `user` ise: kendisi ya da `userId` ile başvurduğu). */
const userOf = (r: HrRecord, col: Column) =>
  col.key === 'userId' ? hrRecord('kullanicilar', r.userId) : r

export function UserAvatar({
  user,
  size = 'sm',
}: {
  user: HrRecord | undefined
  size?: 'sm' | 'md' | 'lg'
}) {
  const name = fullName(user)
  return (
    <Avatar size={size} color={avatarColor(name)} aria-hidden className="shrink-0">
      <Avatar.Fallback className="font-semibold">{initials(name)}</Avatar.Fallback>
    </Avatar>
  )
}

export function StatusBadge({ status }: { status: HrStatus }) {
  return (
    <Box className="inline-flex items-center gap-1.5 text-sm">
      <Box aria-hidden className={cn('size-2 shrink-0 rounded-full', STATUS_DOT[status])} />
      <Text className="text-current">{status}</Text>
    </Box>
  )
}

/** Vardiya: saat aralığı ve 24 saatlik küçük çubuk (gece yarısını aşan vardiya iki parça). */
function TimeRange({ start, end }: { start: string; end: string }) {
  const min = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return (h ?? 0) * 60 + (m ?? 0)
  }
  const a = min(start)
  const b = min(end) || 1440
  const parts =
    b > a
      ? [[a, b]]
      : [
          [a, 1440],
          [0, b],
        ]
  return (
    <Box className="flex items-center gap-3">
      <Typography {...inline} className="w-28 shrink-0 font-mono text-sm text-current!">
        {start} – {end}
      </Typography>
      <Box
        aria-hidden
        className="relative h-1.5 w-32 overflow-hidden rounded-full bg-surface-tertiary"
      >
        {parts.map(([s, e], i) => (
          <Box
            key={i}
            style={{ left: `${(s! / 1440) * 100}%`, width: `${((e! - s!) / 1440) * 100}%` }}
            className="absolute inset-y-0 rounded-full bg-accent"
          />
        ))}
      </Box>
    </Box>
  )
}

/** Grup üyeleri: ilk üç üyenin avatarı üst üste, yanında sayı. */
function Members({ ids }: { ids: string[] }) {
  return (
    <Box className="flex items-center gap-2">
      <Box className="flex -space-x-2">
        {ids.slice(0, 3).map((id) => (
          <Box key={id} className="rounded-full ring-2 ring-surface">
            <UserAvatar user={hrRecord('kullanicilar', id)} />
          </Box>
        ))}
      </Box>
      <Text tone="muted" className="text-sm">
        {ids.length}
      </Text>
    </Box>
  )
}

export function Cell({ r, col }: { r: HrRecord; col: Column }) {
  const v = r[col.key]
  switch (col.kind) {
    case 'user': {
      const u = userOf(r, col)
      return (
        <Box className="flex min-w-0 items-center gap-3">
          <UserAvatar user={u} />
          <Box className="min-w-0">
            <Typography {...inline} truncate className="block font-medium text-current!">
              {fullName(u)}
            </Typography>
            <Typography {...inline} truncate className="block font-mono text-xs text-muted!">
              {u?.username as string}
            </Typography>
          </Box>
        </Box>
      )
    }
    case 'status':
      return <StatusBadge status={(v as HrStatus) ?? 'Aktif'} />
    case 'ref':
      return refLabel(col.ref, v) ? <>{refLabel(col.ref, v)}</> : <Text tone="muted">-</Text>
    case 'date':
      return v ? <>{formatDay(v)}</> : <Text tone="muted">-</Text>
    case 'money':
      return (
        <Typography {...inline} className="font-medium tabular-nums text-current!">
          {formatMoney(v, r.currency)}
        </Typography>
      )
    case 'timeRange':
      return <TimeRange start={r.startTime as string} end={r.endTime as string} />
    case 'bool':
      return v ? (
        <Check {...IC} className="text-accent-soft-foreground" aria-label="Evet" />
      ) : (
        <Text tone="muted">-</Text>
      )
    case 'factor':
      return (
        <Chip size="sm" variant="soft" color="accent" className="font-mono">
          ×{String(v)}
        </Chip>
      )
    case 'count':
      return <Members ids={(v as string[]) ?? []} />
    case 'mono':
      return v ? (
        <Typography {...inline} className="font-mono text-sm text-current!">
          {String(v)}
        </Typography>
      ) : (
        <Text tone="muted">-</Text>
      )
    default:
      return v != null && v !== '' ? <>{String(v)}</> : <Text tone="muted">-</Text>
  }
}

/** Sıralama / arama değeri. */
export function cellValue(r: HrRecord, col: Column): string | number {
  const v = r[col.key]
  switch (col.kind) {
    case 'user':
      return fullName(userOf(r, col))
    case 'ref':
      return refLabel(col.ref, v)
    case 'count':
      return (v as string[] | undefined)?.length ?? 0
    case 'money':
    case 'factor':
      return typeof v === 'number' ? v : 0
    case 'bool':
      return v ? 1 : 0
    default:
      return v == null ? '' : String(v)
  }
}
