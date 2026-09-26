import { useCallback, useEffect, useMemo, useRef } from 'react'

/* -------------------------------------------------------------------------------------------------
 * useDebounced
 *
 * A "do it once the user stops" timer. Defers expensive per-keystroke work (re-filtering,
 * pushing a record upwards) until typing pauses.
 *
 * The delay applies to **the work only**; a field's value must always update immediately.
 * Debouncing a field's `value` makes the caret jump and swallows characters.
 * ------------------------------------------------------------------------------------------------- */

export interface DebouncedOptions {
  /**
   * Run the pending work on unmount instead of dropping it?
   *
   * `true` where losing what was typed is not acceptable (inline row editing). Keep it `false`
   * for work that only affects what is on screen, such as filtering: there is no point updating
   * state on behalf of a component that is gone.
   *
   * @default false
   */
  flushOnUnmount?: boolean
}

export interface Debounced {
  /** Restarts the timer: the work runs `delay` ms after the last call. */
  run: () => void
  /** Runs pending work right away; does nothing when nothing is pending. */
  flush: () => void
  /** Drops the pending work. */
  cancel: () => void
}

/**
 * @param fn The work to run. A new one may be passed on every render; the latest is always the
 *   one that runs, so it does not need `useCallback`.
 * @param delay Wait time in ms.
 *
 * The returned object has a stable identity: safe to put in dependency arrays.
 */
export function useDebounced(
  fn: () => void,
  delay: number,
  { flushOnUnmount = false }: DebouncedOptions = {},
): Debounced {
  /* Work, delay and options live in a ref so `run`/`flush`/`cancel` keep their identities. */
  const latest = useRef({ fn, delay, flushOnUnmount })
  useEffect(() => {
    latest.current = { fn, delay, flushOnUnmount }
  })

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }, [])

  const flush = useCallback(() => {
    if (timer.current === null) return
    cancel()
    latest.current.fn()
  }, [cancel])

  const run = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      latest.current.fn()
    }, latest.current.delay)
  }, [])

  /*
    Unmount cleanup has to live here: a caller's own `useEffect` registers AFTER this hook's,
    and cleanups run in registration order. So a "flush on unmount" cleanup added from outside
    could never do anything — the `cancel` below would already have dropped the timer.
  */
  useEffect(
    () => () => {
      if (latest.current.flushOnUnmount) flush()
      else cancel()
    },
    [cancel, flush],
  )

  return useMemo(() => ({ run, flush, cancel }), [run, flush, cancel])
}
