import { useCallback } from 'react'
import { useNavigate } from 'react-router'
import {
  boxHref,
  processHref,
  requestHref,
  type BoxId,
  type MenuApp,
  type WorkRequest,
} from '@/synergy/shared/workflowData'
import { openDeck } from '@/synergy/shared/formDeck'

/* Adresler. Ortak yardımcılar zaten uygulama adreslerini döndürür; kök Başlangıç'a gider. */

export const BASE = '/calisma-alani'

export const k = (href: string) => (href === '/' ? BASE : href)

export const boxLink = (box: BoxId) => k(boxHref(box))
export const processLink = (box: BoxId, processId: string) => k(processHref(box, processId))
export const requestLink = (r: WorkRequest) => k(requestHref(r))

/**
 * Menü uygulamasını açar: sayfasına gidilir (çalışma alanında: Başlangıç'tan ve kabuktan yeni
 * sekmede, açıksa onun sekmesine); modal / drawer'da açılan (`openOn`) bulunulan sayfanın üstünde,
 * form destesinde açılır (`FormDeck.tsx`).
 */
export function useOpenApp() {
  const navigate = useNavigate()
  return useCallback(
    (app: MenuApp) => (app.openOn ? openDeck(app) : navigate(k(app.href))),
    [navigate],
  )
}

/** İş Akış Yönetimi'nin boş durumu: hiçbir kutu / süreç seçili değil. */
export const WF_HOME = '/is-akislari'
