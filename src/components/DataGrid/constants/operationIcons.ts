import {
  AlignLeft,
  AlignRight,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Equal,
  EqualNot,
  Search,
  SearchX,
} from 'lucide-react'
import type { FilterOperation } from '../types/FilterOperation'
import type { IconComponent } from '../types/IconComponent'

export const OPERATION_ICONS: Record<FilterOperation, IconComponent> = {
  '=': Equal,
  '<>': EqualNot,
  '<': ChevronLeft,
  '<=': ChevronsLeft,
  '>': ChevronRight,
  '>=': ChevronsRight,
  contains: Search,
  notcontains: SearchX,
  startswith: AlignLeft,
  endswith: AlignRight,
  between: ArrowLeftRight,
}
