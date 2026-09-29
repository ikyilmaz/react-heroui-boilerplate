import { createContext, useContext, useEffect } from 'react'
import { boxHref, processHref, requestHref, type BoxId, type WorkRequest } from '@/synergy/shared/workflowData'

/* v2 adresleri: ortak yardımcıların döndürdüğü adresler `/v2` önekiyle; kök Başlangıç'a gider. */

export const V2 = '/v2'
export const BASE = `${V2}/calisma-alani`

export const v = (href: string) => (href === '/' ? BASE : `${V2}${href}`)

export const boxLink = (box: BoxId) => v(boxHref(box))
export const processLink = (box: BoxId, processId: string) => v(processHref(box, processId))
export const requestLink = (r: WorkRequest) => v(requestHref(r))
export const WF_HOME = boxLink('bekleyen')

export interface Crumb {
  label: string
  href?: string
}

export const START_CRUMB: Crumb = { label: 'Başlangıç', href: BASE }
export const WF_CRUMB: Crumb = { label: 'İş Akış Yönetimi', href: WF_HOME }

/** Sayfalar konumunu bildirir; kabuk üst şeritte konum yolunu çizer. */
export const CrumbsContext = createContext<(crumbs: Crumb[]) => void>(() => {})

export function useCrumbs(crumbs: Crumb[]) {
  const set = useContext(CrumbsContext)
  const key = JSON.stringify(crumbs)
  useEffect(() => {
    set(JSON.parse(key) as Crumb[])
    return () => set([])
  }, [set, key])
}
