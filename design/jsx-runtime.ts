/*
 * JSX çalışma zamanı, sayfanın React'iyle: tuval React 18 verir, paketlenen React 19 jsx-runtime'ı
 * öğeleri React 18'in tanımadığı bir işaretle üretiyordu. Her JSX çağrısı `React.createElement`e gider.
 */
import * as React from 'react'

type Props = Record<string, unknown> | null

export const Fragment = React.Fragment

export function jsx(type: React.ElementType, props: Props, key?: React.Key) {
  return React.createElement(type, key === undefined ? props : { ...props, key })
}

export const jsxs = jsx
export const jsxDEV = jsx
