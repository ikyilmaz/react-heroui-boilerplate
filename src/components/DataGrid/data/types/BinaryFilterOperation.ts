/** Operations understood by the query engine. `between` is expanded by the grid. */
export type BinaryFilterOperation =
  | '='
  | '<>'
  | '<'
  | '<='
  | '>'
  | '>='
  | 'contains'
  | 'notcontains'
  | 'startswith'
  | 'endswith'
