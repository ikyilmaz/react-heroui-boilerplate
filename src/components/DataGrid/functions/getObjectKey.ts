const keys = new WeakMap<object, number>()
let next = 1

/** Stores without a key: the item object itself identifies the row (DevExtreme's behaviour). */
export function getObjectKey(item: object): number {
  let key = keys.get(item)
  if (key === undefined) keys.set(item, (key = next++))
  return key
}
