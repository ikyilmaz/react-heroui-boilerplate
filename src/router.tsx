import { Navigate, createBrowserRouter } from 'react-router'
import { AppShell } from '@/synergy'
import { StartPage } from '@/synergy/StartPage'
import { WorkflowPage } from '@/synergy/WorkflowPage'
import { DetailPage } from '@/synergy/DetailPage'
import { HrPage } from '@/synergy/hr/HrPage'

export const router = createBrowserRouter([
  {
    Component: AppShell,
    children: [
      { path: '/', element: <Navigate to="/calisma-alani" replace /> },
      // Başlangıç (orijinaldeki "Başlangıç" paneli)
      { path: '/calisma-alani', Component: StartPage },
      // Menü uygulamaları (Favoriler / Son Kullanılan Uygulamalar): formları talep ayrıntısıyla aynı
      // form gruplarında açılır (aynı sayfa; `DetailPage`)
      { path: '/uygulamalar/:appId', Component: DetailPage },
      // İş Akış Yönetimi: kutu → süreç → talepler
      // Boş durum: kutu / süreç seçili değil (kırıntı ve uygulama bağlantıları buraya gelir)
      { path: '/is-akislari', Component: WorkflowPage },
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
