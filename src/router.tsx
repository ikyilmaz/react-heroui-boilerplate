import { createBrowserRouter } from 'react-router'
import { AppShell } from '@/synergy'

/*
 * Tek rota: kabuk. Sayfalar çalışma alanının ekranlarında, her biri kendi adresiyle
 * (`src/synergy/screens.tsx`); tarayıcının adresi seçili sekmenin adresi ve öbür sekmeler
 * (`shared/workspaceUrl.ts`). Bilinmeyen adres açılmaz, Başlangıç kalır.
 */
export const router = createBrowserRouter([{ path: '*', Component: AppShell }])
