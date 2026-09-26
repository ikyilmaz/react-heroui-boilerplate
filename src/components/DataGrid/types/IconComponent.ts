import type { ComponentType } from 'react'

/** Any icon component taking a size (lucide icons fit). */
export type IconComponent = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>
