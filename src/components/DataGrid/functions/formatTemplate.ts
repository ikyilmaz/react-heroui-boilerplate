/** Fills `{0}`, `{1}`… (as DevExtreme's `infoText`). */
export function formatTemplate(template: string, ...values: unknown[]): string {
  return template.replace(/\{(\d+)\}/g, (m, i) => String(values[Number(i)] ?? m))
}
