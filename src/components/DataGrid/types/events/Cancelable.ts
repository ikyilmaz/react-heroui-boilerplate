/** Set `cancel` to `true` (or a Promise resolving to `true`) to stop the action. */
export interface Cancelable {
  cancel: boolean | Promise<boolean>
}
