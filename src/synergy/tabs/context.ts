import { createContext, useContext } from 'react'

/* Form sekmelerinin içeriğe verdiği bağlamlar (FormTabs.tsx kurar, form görünümü okur). */

/** Child açma: açan form ve açılacak talep. */
export type OpenChild = (from: string, id: string) => void

/** Formun içinden child açma (sekmelerin içindeyse). Grup başına sabit işlev. */
export const OpenChildContext = createContext<OpenChild | null>(null)

/** Formun içinden child açma (sekmelerin içindeyse; değilse `null`). */
export const useOpenChild = () => useContext(OpenChildContext)

/**
 * Sekmeler açıkken formun kaydırma kabı (değilse `null`: sayfa kayar). Değer sekme geçişinde
 * değişmez: gizli bölme de kendi kabını bilir.
 */
export const PaneContext = createContext<HTMLElement | null>(null)

/** Formun kaydırma kabı (sekmeler açıkken; değilse `null`). */
export const useTabScroller = () => useContext(PaneContext)
