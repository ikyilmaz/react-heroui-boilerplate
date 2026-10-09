import { AppShell } from '@/synergy'

/*
 * Kabuk: yönlendiricisi kendinde (sabit yerli react-router `Router`); sayfalar çalışma alanının
 * ekranlarında, her biri kendi adresiyle (`src/synergy/screens.tsx`). Tarayıcının adresi seçili
 * sekmenin adresi ve öbür sekmeler (`shared/workspaceUrl.ts`); bilinmeyen adres açılmaz, Başlangıç
 * kalır.
 */
export default function App() {
  return <AppShell />
}
