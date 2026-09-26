/** `'auto'`: half, equal and double the page size (DevExtreme's rule); the current size is always in. */
export function getPageSizes(allowed: number[] | 'auto', pageSize: number): number[] {
  const sizes = allowed === 'auto' ? [Math.max(1, Math.round(pageSize / 2)), pageSize, pageSize * 2] : allowed
  return [...new Set(sizes.includes(pageSize) ? sizes : [...sizes, pageSize])].sort((a, b) => a - b)
}
