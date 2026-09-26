/** Reports an option change made inside the grid (`onOptionChanged`). */
export type EmitOptionChanged = (name: string, fullName: string, value: unknown, previousValue: unknown) => void
