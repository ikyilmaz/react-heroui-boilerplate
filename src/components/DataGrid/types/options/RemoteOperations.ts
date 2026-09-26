/** Operations the store does itself. Remote paging implies remote filtering and sorting. */
export interface RemoteOperations {
  filtering?: boolean
  sorting?: boolean
  paging?: boolean
}
