/**
 * DevExtreme filter expression:
 *
 * - binary: `['dataField', '>=', 10]` (or `['dataField', 10]` for `=`)
 * - group: `[expr, 'and', expr, 'or', ...]`; adjacent expressions without an operator mean `and`
 * - negation: `['!', expr]`
 * - a function `(item) => boolean`
 */
export type FilterExpression = readonly unknown[] | ((item: never) => boolean)
