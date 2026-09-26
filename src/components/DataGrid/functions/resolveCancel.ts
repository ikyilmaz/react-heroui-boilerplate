/** An event's `cancel`: a boolean or a Promise of one. */
export async function resolveCancel(cancel: boolean | Promise<boolean>): Promise<boolean> {
  return typeof cancel === 'boolean' ? cancel : !!(await cancel)
}
