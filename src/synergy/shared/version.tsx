import { useLocation } from 'react-router'
import { Button, Dropdown } from '@heroui/react'
import { ChevronDown } from 'lucide-react'

/* -------------------------------------------------------------------------------------------------
 * Tasarım sürümleri: v1 kök adreslerde (/calisma-alani, /is-akislari…), sonrakiler önekli
 * (/v2/calisma-alani…). Geçiş aynı sayfanın öbür sürümüne gider.
 * ------------------------------------------------------------------------------------------------- */

export const VERSIONS = [
  { id: 'v1', label: 'v1 · Karo', prefix: '' },
  { id: 'v2', label: 'v2 · Bento', prefix: '/v2' },
] as const

export type VersionId = (typeof VERSIONS)[number]['id']

/** Adresin sürümsüz hali (ör. /v2/is-akislari/bekleyen → /is-akislari/bekleyen). */
function bare(pathname: string) {
  const v = VERSIONS.find((x) => x.prefix && (pathname === x.prefix || pathname.startsWith(`${x.prefix}/`)))
  const rest = v ? pathname.slice(v.prefix.length) : pathname
  return rest || '/calisma-alani'
}

export function VersionSwitch({ current, className }: { current: VersionId; className?: string }) {
  const { pathname } = useLocation()
  const path = bare(pathname)
  const now = VERSIONS.find((v) => v.id === current)!
  return (
    <Dropdown>
      <Button size="sm" variant="ghost" aria-label={`Tasarım sürümü: ${now.label}`} className={className}>
        {current}
        <ChevronDown size={14} strokeWidth={1.75} aria-hidden />
      </Button>
      <Dropdown.Popover placement="bottom end">
        <Dropdown.Menu aria-label="Tasarım sürümü" selectionMode="single" selectedKeys={[current]}>
          {VERSIONS.map((v) => (
            <Dropdown.Item key={v.id} id={v.id} href={`${v.prefix}${path}`} textValue={v.label}>
              {v.label}
              <Dropdown.ItemIndicator />
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  )
}
