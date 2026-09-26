import type { KeyboardEvent } from 'react'

/**
 * RAC Table is an ARIA grid: Tab only moves within the same cell and leaves the table when the
 * cell has nothing else to focus. In the filter and editing rows, Tab / Shift+Tab cycle through
 * the row's controls instead; arrow-key cell navigation stays as it is.
 */
export function moveFocusWithinRow(e: KeyboardEvent<HTMLElement>): void {
  if (e.key !== 'Tab') return
  const target = e.target as HTMLElement
  const row = target.closest<HTMLElement>('[role="row"]')
  if (!row) return
  const focusables = [...row.querySelectorAll<HTMLElement>('input, button, [tabindex="0"]')].filter(
    (el) =>
      el.tabIndex >= 0 &&
      !el.hasAttribute('disabled') &&
      // The controls, not the cell: RAC gives the active cell `tabindex=0` for navigation too
      !el.matches('td, th, [role="gridcell"], [role="rowheader"]') &&
      // React Aria's hidden validation input is `display:none` with `tabIndex` 0; `focus()` on it
      // silently fails and focus would stay put
      el.getClientRects().length > 0 &&
      !el.closest('[aria-hidden="true"]'),
  )
  const next = focusables[focusables.indexOf(target) + (e.shiftKey ? -1 : 1)]
  if (next) {
    e.preventDefault()
    e.stopPropagation()
    next.focus()
  }
}
