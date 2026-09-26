import { Button, Kbd, Modal, Separator, Switch, Typography, cn } from '@heroui/react'
import { useHome } from '@/pages/workspace/home/HomeContext'
import { Box, Text } from '@/pages/workspace/ui'

/* -------------------------------------------------------------------------------------------------
 * "Klavye kısayolları" penceresi
 *
 * `?` tuşuyla ya da kuyruğun "…" menüsündeki "Klavye kısayolları" ile açılır. Liste tuşları HeroUI
 * `Kbd` ile gösterir; oklar ve özel tuşlar `Kbd.Abbr` (ekran okuyucuya adıyla okunur). "Tek tuş
 * kısayolları" anahtarı harfle çalışan kısayolları kapatır (WCAG 2.1.4); oklar, Boşluk, Enter ve
 * bu pencereyi açan ? her zaman çalışır (anahtara geri dönmenin yolu kapanmasın). Tercih tarayıcıda saklanır (`workspace-home-keys-v1`).
 * ------------------------------------------------------------------------------------------------- */

type ArrowKey = 'down' | 'up' | 'right' | 'enter'

/** Tuş simgesi: harf / sözcük (`Kbd.Content`) ya da ok ve Enter simgesi (`Kbd.Abbr`). */
type KeyCap = { letter: string } | { abbr: ArrowKey }

/** `Kbd.Abbr`'ın `title`'ı HeroUI'de İngilizce; ekran okuyucu ve ipucu için Türkçesi. */
const abbrTitle: Record<ArrowKey, string> = {
  down: 'Aşağı ok',
  up: 'Yukarı ok',
  right: 'Sağ ok',
  enter: 'Enter',
}

interface ShortcutRow {
  label: string
  keys: KeyCap[]
  /** Harfle çalışır; "Tek tuş kısayolları" kapalıyken devre dışı. Oklar / Boşluk / Enter değil. */
  letterOnly?: boolean
}

const listRows: ShortcutRow[] = [
  { label: 'Sonraki', keys: [{ letter: 'J' }, { abbr: 'down' }] },
  { label: 'Önceki', keys: [{ letter: 'K' }, { abbr: 'up' }] },
  { label: 'Onayla', keys: [{ letter: 'A' }], letterOnly: true },
  { label: 'Reddet', keys: [{ letter: 'R' }], letterOnly: true },
  { label: 'Sonra', keys: [{ letter: 'H' }], letterOnly: true },
  { label: 'İncele', keys: [{ letter: 'Boşluk' }, { abbr: 'enter' }] },
  { label: 'Okundu / okunmadı', keys: [{ letter: 'E' }], letterOnly: true },
  { label: 'Atla', keys: [{ abbr: 'right' }, { letter: 'J' }] },
]

const pageRows: ShortcutRow[] = [
  { label: 'Yeni talep', keys: [{ letter: 'N' }], letterOnly: true },
  // ? harf değil ve bu pencereyi (anahtarı) açan tek tuş; kısayollar kapalıyken de çalışır
  { label: 'Bu pencere', keys: [{ letter: '?' }] },
]

function Cap({ k }: { k: KeyCap }) {
  return (
    <Kbd className="min-w-7 justify-center">
      {'letter' in k ? <Kbd.Content>{k.letter}</Kbd.Content> : <Kbd.Abbr keyValue={k.abbr} title={abbrTitle[k.abbr]} />}
    </Kbd>
  )
}

function Rows({ title, rows, keysOn }: { title: string; rows: ShortcutRow[]; keysOn: boolean }) {
  return (
    <Box className="flex flex-col">
      <Typography.Heading level={3} className="mb-1 text-[0.8125rem] leading-5 font-medium tracking-normal text-foreground/65">
        {title}
      </Typography.Heading>
      {rows.map((row) => {
        const off = row.letterOnly && !keysOn
        return (
          <Box key={row.label} className={cn('flex min-h-10 items-center justify-between gap-4', off && 'opacity-45')}>
            <Text tone="primary" className="text-[0.875rem]">
              {row.label}
            </Text>
            <Box className="flex items-center gap-1.5">
              {row.keys.map((k, i) => (
                <Cap key={i} k={k} />
              ))}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

export function ShortcutsModal() {
  const { shortcutsOpen, closeShortcuts, keysOn, setKeysOn } = useHome()

  return (
    <Modal.Backdrop
      isOpen={shortcutsOpen}
      onOpenChange={(open) => {
        if (!open) closeShortcuts()
      }}
      variant="blur"
      // Siyah perde değil, "Yeni talep" penceresiyle aynı buzlu açık perde
      className="soft-theme bg-background/50"
    >
      <Modal.Container placement="center" size="sm">
        <Modal.Dialog className="rounded-panel p-6">
          <Modal.Header>
            <Modal.Heading className="text-[1.125rem] leading-7 font-semibold tracking-tight">Klavye kısayolları</Modal.Heading>
          </Modal.Header>

          <Modal.Body className="flex flex-col gap-5 text-foreground">
            <Box className="flex flex-col gap-1">
              <Switch isSelected={keysOn} onChange={setKeysOn} aria-describedby="home-kisayol-aciklama">
                <Switch.Control>
                  <Switch.Thumb />
                </Switch.Control>
                <Switch.Content className="text-[0.875rem] font-medium text-foreground">Tek tuş kısayolları</Switch.Content>
              </Switch>
              <Text id="home-kisayol-aciklama" tone="muted" className="block text-[0.75rem] leading-4">
                {keysOn ? 'Harflerle onaylayın, reddedin, erteleyin.' : 'Harf kısayolları kapalı; oklar, Boşluk, Enter ve ? çalışmaya devam eder.'}
              </Text>
            </Box>

            <Separator />
            <Rows title="Onay listesinde ve sıradaki işte" rows={listRows} keysOn={keysOn} />
            <Rows title="Sayfa genelinde" rows={pageRows} keysOn={keysOn} />
          </Modal.Body>

          <Modal.Footer className="mt-5">
            <Button variant="secondary" onPress={closeShortcuts}>
              Kapat
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  )
}
