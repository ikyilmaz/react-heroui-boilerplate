import type { FilterExpression } from '../types/FilterExpression'
import type { LangParams } from '../types/LangParams'
import type { Selector } from '../types/Selector'
import { compileBinaryCriteria } from './compileBinaryCriteria'

/** Compiles a DevExtreme filter expression into a predicate. */
export function compileCriteria<TRow>(
  criteria: FilterExpression | undefined,
  langParams?: LangParams,
): (item: TRow) => boolean {
  if (!criteria) return () => true
  if (typeof criteria === 'function') return criteria as (item: TRow) => boolean
  if (criteria.length === 0) return () => true

  if (criteria[0] === '!') {
    const inner = compileCriteria<TRow>(criteria[1] as FilterExpression, langParams)
    return (item) => !inner(item)
  }

  // A group starts with a nested expression: [expr, 'and', expr, ...]
  if (Array.isArray(criteria[0]) || typeof criteria[0] === 'function') {
    const operands: ((item: TRow) => boolean)[] = []
    let groupOperator: 'and' | 'or' | undefined
    let expectOperand = true
    for (const part of criteria) {
      if (typeof part === 'string') {
        const op = part.toLowerCase()
        if (op !== 'and' && op !== 'or') throw new Error(`E4009: unknown group operator "${part}"`)
        if (groupOperator && groupOperator !== op)
          throw new Error('E4019: mixing "and" and "or" in one group is not allowed')
        groupOperator = op
        expectOperand = true
        continue
      }
      // Two expressions in a row: implicit "and"
      if (!expectOperand) {
        if (groupOperator === 'or')
          throw new Error('E4019: mixing "and" and "or" in one group is not allowed')
        groupOperator = 'and'
      }
      operands.push(compileCriteria<TRow>(part as FilterExpression, langParams))
      expectOperand = false
    }
    return groupOperator === 'or'
      ? (item) => operands.some((match) => match(item))
      : (item) => operands.every((match) => match(item))
  }

  const [selector, operation, value] =
    criteria.length === 2 ? [criteria[0], '=', criteria[1]] : criteria
  return compileBinaryCriteria(selector as Selector<TRow>, String(operation), value, langParams)
}
