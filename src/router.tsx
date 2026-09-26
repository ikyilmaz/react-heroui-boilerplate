import { createBrowserRouter } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { ShowcasePage } from '@/pages/ShowcasePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { WorkspaceShell } from '@/pages/workspace/WorkspaceShell'
import { WorkspacePage } from '@/pages/workspace/WorkspacePage'
import { WorkflowsPage } from '@/pages/workflows/WorkflowsPage'
import { ProcessRequestsPage } from '@/pages/workflows/ProcessRequestsPage'
import { RequestDetailPage } from '@/pages/workflows/RequestDetailPage'

export const router = createBrowserRouter([
  // Kendi kabuğu (üst menü + ikon rayı) olan maket sayfaları; RootLayout dışında
  {
    Component: WorkspaceShell,
    children: [
      { path: '/calisma-alani', Component: WorkspacePage },
      { path: '/is-akislari', Component: WorkflowsPage },
      { path: '/is-akislari/:box', Component: WorkflowsPage },
      { path: '/is-akislari/:box/:processId', Component: ProcessRequestsPage },
      { path: '/is-akislari/:box/:processId/:requestId', Component: RequestDetailPage },
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
