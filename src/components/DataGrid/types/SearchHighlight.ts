/** What highlighting reads from context: the applied search text and how to match it. */
export interface SearchHighlight {
  text: string
  caseSensitive: boolean
  locale: string
}
