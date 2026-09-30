import { Check } from 'lucide-react'
import { Avatar, Flex, Tag, Typography } from 'antd'
import { avatarColor, initials } from '@/synergy/shared/workflowData'
import {
  formatDay,
  formatMoney,
  fullName,
  hrRecord,
  type HrRecord,
  type HrStatus,
} from '@/synergy/shared/hrData'
import { IC, cn } from '@/synergy/ant/ui'
import { STATUS_DOT } from '@/synergy/hr/HrFields'
import { refLabel, type Column } from '@/synergy/hr/modules'

/* İK tablosunun hücreleri: kullanıcı (avatar + ad + kullanıcı adı), durum işareti, vardiya saat
   çubuğu, grup üyesi avatarları, para, tarih; sıralama ve arama için düz değer. */

const { Text } = Typography

/** Kullanıcı kaydı (hücre `user` ise: kendisi ya da `userId` ile başvurduğu). */
const userOf = (r: HrRecord, col: Column) =>
  col.key === 'userId' ? hrRecord('kullanicilar', r.userId) : r

/** Avatar boyutları (px) ve isme göre sabit renkleri. */
const AVATAR_SIZE = { sm: 32, md: 40, lg: 48 } as const
const AVATAR_TONE = {
  success: 'bg-success/15 text-success',
  accent: 'bg-accent-soft text-accent-soft-foreground',
  default: 'bg-default text-default-foreground',
} as const

/** Boş değer. */
const Dash = () => <Text type="secondary">-</Text>

export function UserAvatar({
  user,
  size = 'sm',
}: {
  user: HrRecord | undefined
  size?: 'sm' | 'md' | 'lg'
}) {
  const name = fullName(user)
  return (
    <Avatar
      size={AVATAR_SIZE[size]}
      aria-hidden
      className={cn(
        // `!`: antd sayı boyutlu avatarda yazı boyutunu satır içi yazar (boyutun yarısı)
        'shrink-0 text-xs! font-semibold',
        size === 'lg' && 'text-base!',
        AVATAR_TONE[avatarColor(name)],
      )}
    >
      {initials(name)}
    </Avatar>
  )
}

export function StatusBadge({ status }: { status: HrStatus }) {
  return (
    <Flex align="center" gap={6} className="inline-flex text-sm">
      <Flex aria-hidden className={cn('block size-2 shrink-0 rounded-full', STATUS_DOT[status])} />
      <Text className="text-current">{status}</Text>
    </Flex>
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
    <Flex align="center" gap={12}>
      <Text className="w-28 shrink-0 font-mono text-sm text-current">
        {start} – {end}
      </Text>
      <Flex
        aria-hidden
        className="relative block h-1.5 w-32 overflow-hidden rounded-full bg-surface-tertiary"
      >
        {parts.map(([s, e], i) => (
          <Flex
            key={i}
            style={{ left: `${(s! / 1440) * 100}%`, width: `${((e! - s!) / 1440) * 100}%` }}
            className="absolute inset-y-0 block rounded-full bg-accent"
          />
        ))}
      </Flex>
    </Flex>
  )
}

/** Grup üyeleri: ilk üç üyenin avatarı üst üste, yanında sayı. */
function Members({ ids }: { ids: string[] }) {
  return (
    <Flex align="center" gap={8}>
      <Flex className="-space-x-2">
        {ids.slice(0, 3).map((id) => (
          <Flex key={id} className="rounded-full ring-2 ring-surface">
            <UserAvatar user={hrRecord('kullanicilar', id)} />
          </Flex>
        ))}
      </Flex>
      <Text type="secondary" className="text-sm">
        {ids.length}
      </Text>
    </Flex>
  )
}

export function Cell({ r, col }: { r: HrRecord; col: Column }) {
  const v = r[col.key]
  switch (col.kind) {
    case 'user': {
      const u = userOf(r, col)
      return (
        <Flex align="center" gap={12} className="min-w-0">
          <UserAvatar user={u} />
          <Flex vertical className="min-w-0">
            <Text ellipsis className="block font-medium text-current">
              {fullName(u)}
            </Text>
            <Text type="secondary" ellipsis className="block font-mono text-xs">
              {u?.username as string}
            </Text>
          </Flex>
        </Flex>
      )
    }
    case 'status':
      return <StatusBadge status={(v as HrStatus) ?? 'Aktif'} />
    case 'ref':
      return refLabel(col.ref, v) ? <>{refLabel(col.ref, v)}</> : <Dash />
    case 'date':
      return v ? <>{formatDay(v)}</> : <Dash />
    case 'money':
      return (
        <Text className="font-medium text-current tabular-nums">{formatMoney(v, r.currency)}</Text>
      )
    case 'timeRange':
      return <TimeRange start={r.startTime as string} end={r.endTime as string} />
    case 'bool':
      return v ? (
        <Check {...IC} className="text-accent-soft-foreground" aria-label="Evet" />
      ) : (
        <Dash />
      )
    case 'factor':
      return (
        <Tag
          variant="filled"
          className="me-0 rounded-full border-0 bg-accent-soft font-mono text-accent-soft-foreground"
        >
          ×{String(v)}
        </Tag>
      )
    case 'count':
      return <Members ids={(v as string[]) ?? []} />
    case 'mono':
      return v ? <Text className="font-mono text-sm text-current">{String(v)}</Text> : <Dash />
    default:
      return v != null && v !== '' ? <>{String(v)}</> : <Dash />
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
