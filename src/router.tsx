import { Navigate, createBrowserRouter } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { ShowcasePage } from '@/pages/ShowcasePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { AppShell } from '@/synergy/v1'
import { StartPage } from '@/synergy/v1/StartPage'
import { WorkflowPage } from '@/synergy/v1/WorkflowPage'
import { DetailPage } from '@/synergy/v1/DetailPage'
import { KaroAppPage } from '@/synergy/v1/AppPage'
import { HrPage } from '@/synergy/v1/hr/HrPage'
import { BentoShell } from '@/synergy/v2'
import { BentoStart } from '@/synergy/v2/StartPage'
import { BentoWorkflow } from '@/synergy/v2/WorkflowPage'
import { BentoDetail } from '@/synergy/v2/DetailPage'
import { BentoAppPage } from '@/synergy/v2/AppPage'

export const router = createBrowserRouter([
  // v1 ("Karo", orijinal Synergy özellikleri): kendi kabuğu (üst çubuk + uygulama rafı) ile
  {
    Component: AppShell,
    children: [
      // Başlangıç (orijinaldeki "Başlangıç" paneli)
      { path: '/calisma-alani', Component: StartPage },
      // Menü uygulamaları (Favoriler / Son Kullanılan Uygulamalar)
      { path: '/uygulamalar/:appId', Component: KaroAppPage },
      // İş Akış Yönetimi: kutu → süreç → talepler
      { path: '/is-akislari', element: <Navigate to="/is-akislari/bekleyen" replace /> },
      { path: '/is-akislari/gecmis', element: <Navigate to="/is-akislari/gecmis-onaylar" replace /> },
      { path: '/is-akislari/:box', Component: WorkflowPage },
      { path: '/is-akislari/:box/:processId', Component: WorkflowPage },
      // Talep ayrıntısı (Flow Viewer)
      { path: '/is-akislari/:box/:processId/:requestId', Component: DetailPage },
      // İnsan Kaynakları: modül listesi ve kayıt düzenleme (orijinal modules/hr)
      { path: '/insan-kaynaklari', element: <Navigate to="/insan-kaynaklari/kullanicilar" replace /> },
      { path: '/insan-kaynaklari/:module', Component: HrPage },
      { path: '/insan-kaynaklari/:module/:recordId', Component: HrPage },
    ],
  },
  // v2 ("Bento"): aynı sayfalar `/v2` önekiyle, kendi kabuğu ve teması ile
  {
    path: '/v2',
    Component: BentoShell,
    children: [
      { index: true, element: <Navigate to="/v2/calisma-alani" replace /> },
      { path: 'calisma-alani', Component: BentoStart },
      { path: 'uygulamalar/:appId', Component: BentoAppPage },
      { path: 'is-akislari', element: <Navigate to="/v2/is-akislari/bekleyen" replace /> },
      { path: 'is-akislari/gecmis', element: <Navigate to="/v2/is-akislari/gecmis-onaylar" replace /> },
      { path: 'is-akislari/:box', Component: BentoWorkflow },
      { path: 'is-akislari/:box/:processId', Component: BentoWorkflow },
      { path: 'is-akislari/:box/:processId/:requestId', Component: BentoDetail },
    ],
  },
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: ShowcasePage },
      { path: '*', Component: NotFoundPage },
    ],
  },
])
