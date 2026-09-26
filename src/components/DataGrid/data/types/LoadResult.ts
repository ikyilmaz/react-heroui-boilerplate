/** A store's `load` result. A plain array means "these are all the items". */
export type LoadResult<TRow> = TRow[] | { data: TRow[]; totalCount?: number }
