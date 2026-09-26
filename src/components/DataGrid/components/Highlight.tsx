import { memo, useContext, type ReactNode } from 'react'
import { Typography } from '@heroui/react'
import { SearchHighlightContext } from '../DataGridContext'

/** Typography renders a <p> by default; a search highlight has to be an inline <mark>. */
const markText = { elementType: 'mark', slot: null } as unknown as Record<string, never>

export interface HighlightProps {
  text: string
  /** Defaults to the grid's applied search text. */
  query?: string
  className?: string
}

/**
 * Paints occurrences of the search text with `<mark>`, as DevExtreme's `highlightSearchText`.
 * Renders no extra nodes when there is nothing to paint.
 *
 * Locale case folding can change the length of some letters (Turkish "İ"); when the length
 * shifted, positions are unreliable and the plain text is rendered instead.
 */
export const Highlight = memo(function Highlight({
  text,
  query,
  className = 'rounded-sm bg-warning-soft text-warning-soft-foreground',
}: HighlightProps) {
  const highlight = useContext(SearchHighlightContext)
  const needle = (query ?? highlight.text).trim()
  if (!needle) return <>{text}</>

  const fold = (s: string) => (highlight.caseSensitive ? s : s.toLocaleLowerCase(highlight.locale))
  const haystack = fold(text)
  const target = fold(needle)
  if (haystack.length !== text.length || target.length !== needle.length) return <>{text}</>

  const parts: ReactNode[] = []
  let cursor = 0
  for (let at = haystack.indexOf(target); at !== -1; at = haystack.indexOf(target, cursor)) {
    if (at > cursor) parts.push(text.slice(cursor, at))
    parts.push(
      <Typography key={at} {...markText} className={className}>
        {text.slice(at, at + needle.length)}
      </Typography>,
    )
    cursor = at + needle.length
  }
  if (!parts.length) return <>{text}</>
  if (cursor < text.length) parts.push(text.slice(cursor))
  return <>{parts}</>
})
