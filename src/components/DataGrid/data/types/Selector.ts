/** A field path (`'address.city'`) or a function returning the value. */
export type Selector<TRow = unknown> = string | ((item: TRow) => unknown)
