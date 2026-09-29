/*
  Widget look: the grid's root is one card and carries the toolbar and the table.

  Tones: page `background` (0.953) → card `default` (the theme white, like the showcase's demo
  cards) → header strip `surface-secondary` (0.975) and fields `field-background`. The card used to
  be `tertiary` (0.95), which is the page tone, so it vanished; and a second white card for the
  body only nested white in white. `.card` has no border, only a background, so it gets
  `border-border`.
*/
export const GRID_CARD_CLASS_NAMES = {
  root: 'card card--default w-full border border-border',
  toolbar: 'justify-between gap-3',
  body: 'min-w-0',
}
