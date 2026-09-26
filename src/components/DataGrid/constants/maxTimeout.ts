/**
 * "Never" for `useBufferedValue`: data-row editors commit on blur / Enter / unmount only, like
 * DevExtreme's `valueChangeEvent: 'change'`. `setTimeout` treats larger values as 0.
 */
export const MAX_TIMEOUT = 2 ** 31 - 1
