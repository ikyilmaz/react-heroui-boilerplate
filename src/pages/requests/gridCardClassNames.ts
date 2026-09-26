/*
  Widget look: the grid's root is the outer card and carries the toolbar, its body is the inner card.

  Tones: page (0.970) → outer card `tertiary` (0.937) → header strip `surface-secondary` (0.952)
  → inner card `default` (white). The outer card used to be `secondary`, exactly the header
  strip's tone, so the strip disappeared. `.card` has no border, only a background; the inner card
  gets `border-border`, or white on white shows no edge.
*/
export const GRID_CARD_CLASS_NAMES = {
  root: 'card card--tertiary w-full',
  toolbar: 'justify-between gap-3',
  body: 'card card--default min-w-0 border border-border p-2',
}
