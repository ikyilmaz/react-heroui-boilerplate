import { useEffect, useState } from 'react'
import { Button, Link, Tooltip, Typography, cn } from '@heroui/react'
import { Plus, SlidersHorizontal } from 'lucide-react'
import { CURRENT_USER } from '@/pages/workflows/workflowData'
import { afterPaint, focusEl, runGuidance } from '@/pages/workspace/home/actions'
import { useHome } from '@/pages/workspace/home/HomeContext'
import { greetingWord, useGuidance } from '@/pages/workspace/home/useTriage'
import { Box } from '@/pages/workspace/ui'
import { ICON, tile, timeOf } from '@/pages/workspace/tokens'

/* -------------------------------------------------------------------------------------------------
 * Karşılama
 *
 * Zeminin üstünde, panelsiz: tarih (takvim bilgisi, ölçüm değil), saate göre selam ve tek cümlelik
 * yönlendirme. Cümle `useGuidance`'ın kural sırasıyla seçilir (acil → bilgi istendi → geciken →
 * bugün gelen → bekleyen → taslak → her şey yolunda); sayılar yalnızca tekil / çoğul seçimi için
 * okunur, hiçbiri yazılmaz. Cümledeki bağlantı sıradaki işin "Onayla"sına, kuyruktaki satıra ya da
 * önizlemeye götürür (`runGuidance`).
 *
 * Sağda yalnızca iki denetim: "Yeni talep" (ekranda siyah bir "Onayla" yokken siyah, varken ikincil;
 * böylece durağan ekranda tek siyah eylem olur) ve "Sayfayı düzenle". Düzenleme kipinde ikisi de
 * çekilir; yerlerini düzenleme şeridi alır.
 * ------------------------------------------------------------------------------------------------- */

/**
 * Kenar halkası (`tile`) yardımcı katmanda olduğu için HeroUI'nin klavye odak halkasını ezer;
 * odakta HeroUI'nin kendi `status-focused` görünümü geri verilir (kabuktaki düğmelerle aynı).
 */
const focusRing = 'data-[focus-visible]:status-focused'

const dateFormat = new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })

/** Yerel takvim günü, `YYYY-MM-DD` (`<time dateTime>` için). */
function localIsoDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Dakikada bir yenilenen "şimdi": sayfa açık kalırsa selam ve tarih kendiliğinden güncellenir. */
function useNow(stepMs = 60_000) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), stepMs)
    return () => window.clearInterval(t)
  }, [stepMs])
  return now
}

/** Düzenleme şeridine odaklanır (şerit `tabIndex={-1}` bir bölge; ekran okuyucu adını okur). */
function focusEditStrip() {
  afterPaint(() => void focusEl(document.querySelector<HTMLElement>('[data-edit-strip]')))
}

export function Greeting({ narrow }: { narrow: boolean }) {
  const home = useHome()
  const guidance = useGuidance()
  const now = useNow()
  const { board, editing } = home
  const primary = board.newRequestPrimary
  const firstName = CURRENT_USER.name.split(' ')[0]

  return (
    <Box
      className={cn(
        'flex gap-4 px-1 pt-2',
        narrow ? 'flex-col items-stretch' : 'flex-row flex-wrap items-end justify-between',
      )}
    >
      <Box className="min-w-0 flex-1">
        <Typography {...timeOf(localIsoDate(now))} className="block text-[0.8125rem] leading-5 text-foreground/45">
          {dateFormat.format(now)}
        </Typography>
        <Typography.Heading
          level={1}
          className={cn('mt-1 leading-tight font-bold tracking-tight text-foreground', narrow ? 'text-[1.5rem]' : 'text-[2rem]')}
        >
          {greetingWord(now)}, {firstName}
        </Typography.Heading>
        <Typography className="mt-2 text-[0.9375rem] leading-6 text-foreground/65">
          {guidance.text}
          {guidance.link && (
            <>
              {' '}
              <Link
                onPress={() => runGuidance(guidance.link!.target, home)}
                className="font-semibold text-current! underline decoration-current/30 underline-offset-4"
              >
                {guidance.link.label}
              </Link>
            </>
          )}
        </Typography>
      </Box>

      {!editing && (
        <Box className="flex shrink-0 items-center gap-2">
          {narrow ? (
            <Tooltip>
              <Button
                isIconOnly
                variant={primary ? 'primary' : 'secondary'}
                aria-label="Yeni talep"
                onPress={() => home.openStart()}
                className={cn('size-11', !primary && tile, focusRing)}
              >
                <Plus {...ICON} />
              </Button>
              <Tooltip.Content placement="bottom">Yeni talep</Tooltip.Content>
            </Tooltip>
          ) : (
            <Button
              variant={primary ? 'primary' : 'secondary'}
              onPress={() => home.openStart()}
              className={cn('h-11 px-5', !primary && tile, focusRing)}
            >
              <Plus {...ICON} />
              Yeni talep
            </Button>
          )}

          <Tooltip>
            <Button
              isIconOnly
              variant="ghost"
              aria-label="Sayfayı düzenle"
              data-edit-trigger
              onPress={() => {
                home.setEditing(true)
                focusEditStrip()
              }}
              className={cn('size-11', tile, focusRing)}
            >
              <SlidersHorizontal {...ICON} />
            </Button>
            <Tooltip.Content placement="bottom">Sayfayı düzenle</Tooltip.Content>
          </Tooltip>
        </Box>
      )}
    </Box>
  )
}
