import { createContext, useContext, useEffect } from 'react'

/* -------------------------------------------------------------------------------------------------
 * Sayfa konumu (breadcrumb) kabuğun başlığında gösterilir. Sayfalar kendi yolunu
 * `usePageCrumbs` ile bildirir; sayfa kapanınca başlıktaki konum temizlenir.
 * ------------------------------------------------------------------------------------------------- */

/** Konumdaki tek adım; `href` yoksa bulunulan sayfadır. */
export interface Crumb {
  label: string
  href?: string
}

export const CrumbsContext = createContext<(items: Crumb[] | null) => void>(() => {})

/** `null` verilirse (örn. gömülü görünüm) başlıktaki konuma dokunulmaz. */
export function usePageCrumbs(items: Crumb[] | null) {
  const setCrumbs = useContext(CrumbsContext)
  // Dizi her çizimde yeniden oluşuyor; etkiyi içeriğe bağla
  const key = items ? JSON.stringify(items) : null
  useEffect(() => {
    if (key == null) return
    setCrumbs(JSON.parse(key) as Crumb[])
    return () => setCrumbs(null)
  }, [setCrumbs, key])
}
