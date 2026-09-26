/** A GUID for inserted items without a key. */
export function generateKey(): string {
  return crypto.randomUUID()
}
