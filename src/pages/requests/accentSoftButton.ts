import { cn } from '@heroui/react'

/**
 * Soft accent button. HeroUI has no `accent-soft` button variant, but variants build their
 * backgrounds from `--button-bg` / `--button-fg` (see `.button--danger-soft`); feeding the same
 * tokens keeps hover and pressed states working.
 */
export const ACCENT_SOFT_BUTTON = cn(
  '[--button-bg:var(--accent-soft)]',
  '[--button-bg-hover:var(--accent-soft-hover)]',
  '[--button-bg-pressed:var(--accent-soft-hover)]',
  '[--button-fg:var(--accent-soft-foreground)]',
)
