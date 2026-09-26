import type { FilterExpression } from '../data/types/FilterExpression'
import type { Selector } from '../data/types/Selector'
import type { FilterOperation } from '../types/FilterOperation'
import { addDays } from './addDays'
import { startOfDay } from './startOfDay'

/** Dates are compared by day: "= 1 March" means from the start of 1 March to the start of 2 March. */
export function getDateFilterExpression<TRow>(
  selector: Selector<TRow>,
  operation: FilterOperation,
  value: Date,
): FilterExpression {
  const start = startOfDay(value)
  const end = addDays(start, 1)
  switch (operation) {
    case '=':
      return [[selector, '>=', start], 'and', [selector, '<', end]]
    case '<>':
      return [[selector, '<', start], 'or', [selector, '>=', end]]
    case '<':
      return [selector, '<', start]
    case '<=':
      return [selector, '<', end]
    case '>':
      return [selector, '>=', end]
    case '>=':
      return [selector, '>=', start]
    default:
      return [selector, operation, value]
  }
}
