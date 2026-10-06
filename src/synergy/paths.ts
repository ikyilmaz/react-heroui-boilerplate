import { createContext, startTransition, useContext, useEffect } from 'react'
import {
  boxHref,
  processHref,
  requestHref,
  type BoxId,
  type WorkRequest,
} from '@/synergy/shared/workflowData'

/* Adresler ve çerçeve bağlamı. Ortak yardımcılar zaten uygulama adreslerini döndürür; kök Başlangıç'a gider. */

export const BASE = '/calisma-alani'

export const k = (href: string) => (href === '/' ? BASE : href)

export const boxLink = (box: BoxId) => k(boxHref(box))
export const processLink = (box: BoxId, processId: string) => k(processHref(box, processId))
export const requestLink = (r: WorkRequest) => k(requestHref(r))

export interface Crumb {
  label: string
  href?: string
  /**
   * Konum çubuğundaki ikon (metin; `useFrame` karşılaştırması için JSON'a girer): `home`,
   * `workflow`, `box:<kutu>`, `process:<süreç>`, `app:<uygulama>`, `request`.
   */
  icon?: string
}

export interface Frame {
  crumbs: Crumb[]
}

export const FrameContext = createContext<(frame: Frame | null) => void>(() => {})

/** Sayfalar konumunu bildirir; kabuk konum haplarını çizer. İkinci bağımsız değişken yalnızca uyumluluk için. */
export function useFrame(crumbs: Crumb[], _scope?: unknown) {
  const set = useContext(FrameContext)
  const key = JSON.stringify(crumbs)
  // Kabuğun güncellemesi acil değil (geçiş): sayfanın kendi değişimi (ör. sekme geçişi) önce
  // çizilir, konum hapları ve raf hemen ardından
  useEffect(() => {
    startTransition(() => set({ crumbs: JSON.parse(key) as Crumb[] }))
    return () => set(null)
  }, [set, key])
}

export const START_CRUMB: Crumb = { label: 'Başlangıç', href: BASE, icon: 'home' }
/** İş Akış Yönetimi'nin boş durumu: hiçbir kutu / süreç seçili değil. */
export const WF_HOME = '/is-akislari'

export const WF_CRUMB: Crumb = {
  label: 'İş Akış Yönetimi',
  href: WF_HOME,
  icon: 'workflow',
}
