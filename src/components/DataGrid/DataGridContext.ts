import { createContext } from 'react'
import type { SearchHighlight } from './types/SearchHighlight'

/**
 * The applied search text, for highlighting. Read through context so a search does not have to
 * re-render the rows themselves — only the highlighted texts.
 */
export const SearchHighlightContext = createContext<SearchHighlight>({
  text: '',
  caseSensitive: false,
  locale: 'tr',
})
