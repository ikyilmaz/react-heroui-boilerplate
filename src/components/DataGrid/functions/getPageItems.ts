import type { PageItem } from '../types/PageItem'

/** 1 … 4 5 6 … 12 — the first and last pages are always visible. Page numbers are 1-based. */
export function getPageItems(page: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const items: PageItem[] = [1]
  const from = Math.max(2, page - 1)
  const to = Math.min(total - 1, page + 1)
  if (from > 2) items.push('gap')
  for (let i = from; i <= to; i++) items.push(i)
  if (to < total - 1) items.push('gap')
  items.push(total)
  return items
}
