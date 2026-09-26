/** Filter row operations, as in DevExtreme's `filterOperations`. */
export type FilterOperation =
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
  | 'between'
