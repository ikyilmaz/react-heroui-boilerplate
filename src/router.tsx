import { Navigate, createBrowserRouter } from 'react-router'
import { AppShell } from '@/synergy'
import { StartPage } from '@/synergy/StartPage'
import { WorkflowPage } from '@/synergy/WorkflowPage'
import { DetailPage } from '@/synergy/DetailPage'
import { AppPage } from '@/synergy/AppPage'
import { HrPage } from '@/synergy/hr/HrPage'

export const router = createBrowserRouter([
  {
    Component: AppShell,
    children: [
      { path: '/', element: <Navigate to="/calisma-alani" replace /> },
      // Başlangıç (orijinaldeki "Başlangıç" paneli)
      { path: '/calisma-alani', Component: StartPage },
      // Menü uygulamaları (Favoriler / Son Kullanılan Uygulamalar)
      { path: '/uygulamalar/:appId', Component: AppPage },
      // İş Akış Yönetimi: kutu → süreç → talepler
      { path: '/is-akislari', element: <Navigate to="/is-akislari/bekleyen" replace /> },
      {
        path: '/is-akislari/gecmis',
        element: <Navigate to="/is-akislari/gecmis-onaylar" replace />,
      },
      // Tek rota (isteğe bağlı süreç): kutuya girip ilk sürece geçerken sayfa yeniden kurulmaz
      { path: '/is-akislari/:box/:processId?', Component: WorkflowPage },
      // Talep ayrıntısı (Flow Viewer)
      { path: '/is-akislari/:box/:processId/:requestId', Component: DetailPage },
      // İnsan Kaynakları: modül listesi ve kayıt düzenleme (orijinal modules/hr)
      {
        path: '/insan-kaynaklari',
        element: <Navigate to="/insan-kaynaklari/kullanicilar" replace />,
      },
      { path: '/insan-kaynaklari/:module/:recordId?', Component: HrPage },
      // Bilinmeyen adres: Başlangıç
      { path: '*', element: <Navigate to="/calisma-alani" replace /> },
    ],
  },
])
