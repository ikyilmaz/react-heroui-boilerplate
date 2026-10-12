import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button, Flex, Popover, Typography } from 'antd'
import { useMenuApps } from '@/synergy/shared/decisions'
import { APPS_LABELS, initials, type MenuApp } from '@/synergy/shared/workflowData'
import { MENU_LABELS } from '@/synergy/shared/menuTree'
import { useOpenApp } from '@/synergy/paths'
import { IC, Tip, cn } from '@/synergy/ant/ui'

/*
 * Sekme şeridinin sonundaki "+" (açık istek üzerine eklendi): son sekmenin hemen sağında, geri /
 * ileri gibi şeridin parçası. Basınca küçük bir panel: Favoriler (ikon karoları) ve Son Kullanılan
 * Uygulamalar (satırlar); seçilen uygulama sekmesinde açılır (`useOpenApp`: açıksa ona geçer,
 * modal / drawer formu destede) ve panel kapanır. Etiketler orijinalin yerelleştirmesinden.
 */

const { Text } = Typography

const NO_FAVORITES = 'Sabitlenmiş Uygulama Yok' // 102028
const RECENT_LIMIT = 6

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Flex vertical className="gap-1.5">
      <Text className="px-1 text-xs font-medium text-muted">{title}</Text>
      {children}
    </Flex>
  )
}

function Glyph({ app, size }: { app: MenuApp; size: 'md' | 'sm' }) {
  const Icon = app.icon
  if (Icon) return <Icon {...IC} size={size === 'md' ? 20 : 16} className="shrink-0" />
  return (
    <Text
      className={cn('font-semibold text-current', size === 'md' ? 'text-xs' : 'text-[0.625rem]')}
    >
      {initials(app.caption)}
    </Text>
  )
}

export function QuickOpen() {
  const [open, setOpen] = useState(false)
  const { favorites, recent } = useMenuApps()
  const openApp = useOpenApp()
  const pick = (app: MenuApp) => {
    setOpen(false)
    openApp(app)
  }
  const content = (
    <Flex role="dialog" aria-label={MENU_LABELS.apps} vertical className="gap-4">
      <Section title={APPS_LABELS.favorites}>
        {favorites.length ? (
          <Flex role="list" aria-label={APPS_LABELS.favorites} className="grid grid-cols-4 gap-1">
            {favorites.map((a) => (
              <Flex key={a.id} role="listitem" className="flex">
                <Button
                  type="text"
                  onClick={() => pick(a)}
                  className="group/tile h-auto w-full flex-col gap-1.5 rounded-xl! px-1 pt-2 pb-1.5 font-normal whitespace-normal text-foreground hover:bg-surface-secondary!"
                >
                  <Flex className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent-soft-foreground transition-colors group-hover/tile:bg-accent group-hover/tile:text-accent-foreground">
                    <Glyph app={a} size="md" />
                  </Flex>
                  <Text className="line-clamp-2 w-full text-center text-[0.6875rem] leading-[1.25] text-current">
                    {a.caption}
                  </Text>
                </Button>
              </Flex>
            ))}
          </Flex>
        ) : (
          <Text className="px-1 text-sm text-muted">{NO_FAVORITES}</Text>
        )}
      </Section>
      <Section title={APPS_LABELS.recent}>
        <Flex role="list" aria-label={APPS_LABELS.recent} vertical className="gap-0.5">
          {recent.slice(0, RECENT_LIMIT).map((a) => (
            <Flex key={a.id} role="listitem" className="flex">
              <Button
                type="text"
                onClick={() => pick(a)}
                className="group/row h-9 w-full justify-start gap-2.5 rounded-lg! px-2 text-start font-normal text-foreground hover:bg-surface-secondary!"
              >
                <Flex className="grid size-6 place-items-center text-muted group-hover/row:text-foreground">
                  <Glyph app={a} size="sm" />
                </Flex>
                <Text className="min-w-0 flex-1 text-sm text-current truncate">{a.caption}</Text>
              </Button>
            </Flex>
          ))}
        </Flex>
      </Section>
    </Flex>
  )
  return (
    // Sekme yuvası gibi: tab boyunda, hapın merkezinde (alt pay `--tab-gap`)
    <Flex className="flex h-(--tab-h) shrink-0 items-center ps-1.5 pb-(--tab-gap)">
      {/* İpucu ile açılır panel aynı tetikleyiciyi paylaşamaz: ipucu sarmalayıcıda */}
      <Tip label={MENU_LABELS.apps} placement="bottom">
        <Flex className="inline-flex">
          <Popover
            open={open}
            onOpenChange={setOpen}
            trigger="click"
            placement="bottomLeft"
            arrow={false}
            destroyOnHidden
            content={content}
            classNames={{ container: 'w-80 max-w-[calc(100vw-2rem)] p-3' }}
          >
            <Button
              type="text"
              aria-label={MENU_LABELS.apps}
              aria-haspopup="dialog"
              aria-expanded={open}
              icon={<Plus {...IC} size={16} />}
              className="size-[28px] min-w-[28px] rounded-full p-0 text-muted hover:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)]! hover:text-foreground!"
            />
          </Popover>
        </Flex>
      </Tip>
    </Flex>
  )
}
