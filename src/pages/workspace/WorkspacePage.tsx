import { useCallback, useEffect } from 'react'
import { useContainerWidth } from 'react-grid-layout'
import { usePageCrumbs } from '@/pages/workspace/crumbs'
import { afterPaint, anyOverlayOpen, focusEl, isTypingTarget, pageKey } from '@/pages/workspace/home/actions'
import { EditStrip } from '@/pages/workspace/home/EditStrip'
import { Greeting } from '@/pages/workspace/home/Greeting'
import { HomeBoard } from '@/pages/workspace/home/HomeBoard'
import { HomeContext, useHomeValue } from '@/pages/workspace/home/HomeContext'
import { STACK_BELOW } from '@/pages/workspace/home/metrics'
import { RequestPeek } from '@/pages/workspace/home/RequestPeek'
import { ShortcutsModal } from '@/pages/workspace/home/ShortcutsModal'
import { StartModal } from '@/pages/workspace/home/StartModal'
import { useHomeState } from '@/pages/workspace/home/useHomeState'
import { Box } from '@/pages/workspace/ui'

/* -------------------------------------------------------------------------------------------------
 * Çalışma alanı · ana sayfa ("iş masası")
 *
 * Grafik, sayaç ve toplam yok: sayfa önce "beni ne bekliyor, önce hangisi?", sonra "taleplerim
 * nerede?" sorusunu sözcüklerle yanıtlar. Yukarıdan aşağı: karşılama (tarih, selam, yönlendirme
 * cümlesi, "Yeni talep" ve "Sayfayı düzenle"), yalnızca düzenleme kipinde düzenleme şeridi, sonra
 * widget panosu. Önizleme çekmecesi (`RequestPeek`), "Yeni talep" penceresi (`StartModal`) ve
 * "Klavye kısayolları" penceresi sayfada bir kez çizilir; hepsi `HomeContext`'ten yönetilir.
 *
 * Sayfa geneli tuşlar (yazı alanında ve açık katmanda yok sayılır): N yeni talep, ? kısayollar,
 * Esc düzenleme kipinden çıkar. Karar tuşları (A, R, H, J / K…) yalnızca ilgili widget'ın içinde.
 * ------------------------------------------------------------------------------------------------- */

export function WorkspacePage() {
  usePageCrumbs([{ label: 'Ana Sayfa' }])
  const api = useHomeState()
  const { width, containerRef, mounted } = useContainerWidth()
  // Pano 760px'ten darsa ızgara okunmaz: kayıtlı görünüm ne olursa olsun tek sütun
  const narrow = mounted && width < STACK_BELOW
  const stacked = api.state.view === 'stack' || narrow
  const home = useHomeValue(api, { stacked })
  const { editing, setEditing, keysOn, openStart, openShortcuts } = home

  /**
   * Düzenleme kipinden çıkar. Odak kalkan bir denetimdeyse (şerit, başlıktaki kip seçici) boşa
   * düşer; o zaman "Sayfayı düzenle" düğmesine döner.
   */
  const finishEditing = useCallback(() => {
    setEditing(false)
    afterPaint(() => {
      const active = document.activeElement
      if (!active || active === document.body) focusEl(document.querySelector<HTMLElement>('[data-edit-trigger]'))
    })
  }, [setEditing])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return
      if (e.key === 'Escape') {
        if (editing && !anyOverlayOpen() && !isTypingTarget(e.target)) {
          e.preventDefault()
          finishEditing()
        }
        return
      }
      const action = pageKey(e, keysOn)
      if (action === 'new') {
        e.preventDefault()
        openStart()
      } else if (action === 'help') {
        e.preventDefault()
        openShortcuts()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [editing, keysOn, finishEditing, openStart, openShortcuts])

  return (
    <HomeContext.Provider value={home}>
      <Box className="flex flex-col gap-6">
        <Greeting narrow={narrow} />
        {editing && <EditStrip onDone={finishEditing} />}
        <Box ref={containerRef} className="w-full min-w-0">
          <HomeBoard width={width} mounted={mounted} />
        </Box>

        {/* Taşıma ve ekleme duyuruları (ekran okuyucu) */}
        <Box role="status" aria-live="polite" className="sr-only">
          {home.announcement}
        </Box>

        <RequestPeek />
        <StartModal />
        <ShortcutsModal />
      </Box>
    </HomeContext.Provider>
  )
}
