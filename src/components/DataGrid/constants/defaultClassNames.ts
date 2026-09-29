import type { DataGridClassNames } from '../types/DataGridClassNames'

/*
  Why these look the way they do:

  - Row highlights (hover / selected / editing) are painted on cells, not on `tr`: a `tr` cannot be
    and HeroUI paints the row background on cells too (table.css: "applied to cells so
    Firefox clips bg to border-radius"). So the outer corners of the first/last cell are rounded;
    the size follows the theme radius, capped at 16px.
  - Column lines: a short centred vertical divider between columns, like HeroUI's header
    (`.table__column::after`); painting a cell border cut through the row highlight. The
    divider is an `after:` pseudo-element written with Tailwind arbitrary variants.
  - Compact rows: 2.75rem high, shortened padding; the 2rem controls inside still fit in edit mode.
  - Row gap: the table is already `border-separate` + `border-spacing-0`; `tr` takes no margin.
  - Cells get `max-w-0`, which stops auto layout growing min-content with the text so `truncate`
    works.
*/
export const DEFAULT_CLASS_NAMES: DataGridClassNames = {
  root: 'relative flex min-h-0 w-full flex-col gap-3',
  toolbar: 'flex flex-row flex-wrap items-center gap-2',
  body: 'flex min-h-0 min-w-0 flex-1 flex-col gap-3',
  table: 'min-h-0 w-full flex-1',
  scrollContainer: 'h-full overflow-auto',
  content:
    'w-full min-w-[104rem] table-auto border-spacing-y-1 [&_tr]:border-b-0 [&_td]:border-b-0',
  header: 'sticky top-0 z-10',
  headerCell: 'overflow-hidden max-w-0',
  selectionColumn: 'w-12 whitespace-nowrap px-3',
  commandColumn: 'w-26 whitespace-nowrap',
  cell: 'overflow-hidden max-w-0',
  selectionCell: 'whitespace-nowrap px-3',
  commandCell: 'whitespace-nowrap',
  row: 'h-11 [&>td]:py-1',
  rowCorners: '',
  editRow: '[&>td]:bg-accent-soft/30',
  selectedRow: '[&[data-selected=true]>td]:bg-accent-soft',
  noHover: '[&:hover>td]:bg-transparent [&[data-hovered=true]>td]:bg-transparent',
  alternateRow: '[&>td]:bg-default/40',
  rowLines: '[&_tbody_td]:border-b [&_tbody_td]:border-separator',
  columnLines:
    "[&_tbody_td]:relative [&_tbody_td:not(:last-child)]:after:pointer-events-none [&_tbody_td:not(:last-child)]:after:absolute [&_tbody_td:not(:last-child)]:after:end-0 [&_tbody_td:not(:last-child)]:after:top-1/2 [&_tbody_td:not(:last-child)]:after:h-4 [&_tbody_td:not(:last-child)]:after:w-px [&_tbody_td:not(:last-child)]:after:-translate-y-1/2 [&_tbody_td:not(:last-child)]:after:bg-separator [&_tbody_td:not(:last-child)]:after:content-['']",
  borders: 'border border-separator',
  wordWrap: '[&_td]:whitespace-normal [&_td_*]:whitespace-normal',
  filterCell: 'flex items-center',
  /*
    `relative focus-within:z-10`: the operation chooser's trigger is `relative isolate` and
    covered the focus ring of its unpositioned neighbour.
  */
  filterEditor: 'w-full min-w-0 relative focus-within:z-10',
  /** Editors fill the cell: the components' own fixed widths do not apply here. */
  editor: 'w-full min-w-0',
  noData: 'py-16',
  pager: 'px-1',
  loadPanel:
    'absolute inset-0 z-20 flex items-center justify-center gap-2 bg-background/60 backdrop-blur-[1px]',
}
