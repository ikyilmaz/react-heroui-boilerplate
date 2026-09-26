/** `'requestNo'` → `'Request No'`, `'address.city'` → `'Address City'` (DevExtreme's rule). */
export function captionize(name: string): string {
  return name
    .replace(/[._]/g, ' ')
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|\s)\S/g, (c) => c.toUpperCase())
}
