import { useState, type KeyboardEvent } from 'react'
import { Button, Kbd, Popover, TextArea, TextField, popoverVariants } from '@heroui/react'
import { X } from 'lucide-react'
import { decideWithUndo } from '@/pages/workspace/home/actions'
import { useHome } from '@/pages/workspace/home/HomeContext'
import type { RejectPopoverProps } from '@/pages/workspace/home/types'
import { Box, Text } from '@/pages/workspace/ui'
import { ICON } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Ret gerekçesi
 *
 * "Reddet" ya da R tuşu bu küçük pencereyi açar: gerekçe zorunlu (talep sahibi notu görür), boşken
 * "Reddet" pasif; ⌘↵ / Ctrl+↵ gönderir, Esc ve "Vazgeç" kapatır. Kapanınca odak açan düğmeye ya da
 * satıra döner (React Aria `FocusScope`); ret işlenince `decideWithUndo` odağı bir sonraki talebe
 * taşır ve "Reddedildi" bildirimi "Geri al" sunar.
 *
 * Tetikleyiciye sarılı değil, bağımsız `Popover.Content` + `triggerRef`: böylece klavyeden (R)
 * açılabilir ve satırdaki `Tooltip` bağlamı pencerenin içine sızmaz. Kök (`Popover`) olmadığı için
 * HeroUI'nin yuva sınıfları `popoverVariants()` ile elle verilir. Not, çağıran bileşen pencereyi
 * talep kimliğiyle anahtarladığı sürece (aynı talep için) kapatıp açınca korunur.
 * ------------------------------------------------------------------------------------------------- */

const slots = popoverVariants()

/** Gönderme kısayolunun etiketi: Mac'te ⌘, diğerlerinde Ctrl. */
const submitHint = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.userAgent) ? '⌘ ↵' : 'Ctrl ↵'

export function RejectPopover({ r, from, triggerRef, isOpen, onOpenChange }: RejectPopoverProps) {
  const home = useHome()
  const [note, setNote] = useState('')
  const ready = note.trim().length > 0

  const submit = () => {
    if (!ready) return
    onOpenChange(false)
    decideWithUndo(r, 'rejected', note, {
      from,
      // Seçili talep kartından reddedilince kuyruğun odağı da bir sonraki satıra geçsin
      setFocusedId: from === 'next' && home.modeOf('next') === 'secili' ? home.setFocusedId : undefined,
    })
    setNote('')
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <Popover.Content
      triggerRef={triggerRef}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      placement="bottom end"
      offset={8}
      className={slots.base({ className: 'soft-theme w-80 max-w-[calc(100vw-2rem)]' })}
    >
      <Popover.Dialog className={slots.dialog({ className: 'flex flex-col gap-3 p-4' })}>
        <Box className="flex flex-col gap-1">
          <Popover.Heading className={slots.heading({ className: 'text-[0.9375rem] font-semibold tracking-tight text-foreground' })}>
            Neden reddediyorsunuz?
          </Popover.Heading>
          <Text data-item-title className="line-clamp-2 text-[0.8125rem]">
            {r.template.title}
          </Text>
        </Box>

        <TextField aria-label="Ret gerekçesi" isRequired autoFocus value={note} onChange={setNote} fullWidth>
          <TextArea rows={3} placeholder="Talep sahibi bu notu görecek" onKeyDown={onKeyDown} className="min-h-24 w-full resize-none rounded-tile" />
        </TextField>

        <Box className="flex items-center gap-2">
          <Text tone="muted" className="flex items-center gap-1.5 text-[0.75rem]">
            <Kbd className="h-5 rounded-pill px-1.5 text-[0.75rem]">{submitHint}</Kbd>
            gönderir
          </Text>
          <Button variant="ghost" size="sm" className="ms-auto" onPress={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button variant="primary" size="sm" isDisabled={!ready} onPress={submit}>
            <X {...ICON} />
            Reddet
          </Button>
        </Box>
      </Popover.Dialog>
    </Popover.Content>
  )
}
