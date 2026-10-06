import type { ReactNode } from 'react'
import { App } from 'antd'

/* İK sayfalarının antd yardımcıları: bildirim (yönlü içerik geçişi ortak: `tabs/ContentSwitch.tsx`). */

/** Bildirim (antd `notification`): başlık + açıklama. */
export function useNotify() {
  const { notification } = App.useApp()
  const show = (kind: 'success' | 'warning' | 'info') => (title: string, description?: ReactNode) =>
    notification[kind]({ title, description, placement: 'bottomRight' })
  return { success: show('success'), warning: show('warning'), info: show('info') }
}
