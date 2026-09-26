/** The live-region message, kept outside React state so announcing does not re-render the grid. */
export interface StatusStore {
  get: () => string
  set: (message: string) => void
  subscribe: (listener: () => void) => () => void
}
