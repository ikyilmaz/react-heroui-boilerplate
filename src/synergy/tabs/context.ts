import { createContext, useContext } from 'react'
import type { Where } from '@/synergy/shared/workspace'

/* Çalışma alanının içeriğe verdiği bağlamlar (Workspace.tsx kurar, sayfalar okur). Değerler ekran
   başına sabit: sekme geçişinde değişmez, formlar yeniden çizilmez. */

/** Child açma: açan form ve açılacak talep. */
export type OpenChild = (from: string, id: string) => void

/** Formun içinden child açma (çalışma alanının içindeyse). Ekran başına sabit işlev. */
export const OpenChildContext = createContext<OpenChild | null>(null)

/** Formun içinden child açma (çalışma alanının içindeyse; değilse `null`). */
export const useOpenChild = () => useContext(OpenChildContext)

/**
 * Ekranın kaydırma kabı (bölmesi; çalışma alanının dışında `null`: sayfa kayar). Değer sekme
 * geçişinde değişmez: gizli bölme de kendi kabını bilir.
 */
export const PaneContext = createContext<HTMLElement | null>(null)

/** Ekranın kaydırma kabı (çalışma alanının dışında `null`). */
export const useTabScroller = () => useContext(PaneContext)

/** Bir ekranın (sekme ya da yan yana sekmenin bir yarısı) işlemleri. */
export interface ScreenApi {
  key: string
  /** Child form (formdaki düğmeyle açıldı): Geri / İleri yok, açanı kapanınca kapanır. */
  child: boolean
  /** Kapatır: listenin üstündeki form listeye döner, kendi sekmesindeki ekran sekmesiyle kapanır. */
  close: () => void
  /**
   * Başka bir yeri açar: burada, yeni sekmede ya da yanında. `background`: geçmeden (Ctrl / Cmd /
   * orta tık); `force`: liste açıksa bile yenisi (talep ve uygulama yine tek).
   */
  open: (
    path: string,
    where: Where,
    state?: unknown,
    opts?: { background?: boolean; force?: boolean },
  ) => void
  /** Listenin üstündeki formu kendi sekmesine taşır ("Ayrı sekmeye taşı"). */
  popOut: () => void
}

export const ScreenContext = createContext<ScreenApi | null>(null)

/** Sayfanın ekranı (çalışma alanının içindeyse; başlat kutusunda `null`). */
export const useScreen = () => useContext(ScreenContext)
