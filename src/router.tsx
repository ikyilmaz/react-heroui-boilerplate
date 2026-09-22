import { createBrowserRouter } from 'react-router'
import { RootLayout } from '@/components/layout/RootLayout'
import { ShowcasePage } from '@/pages/ShowcasePage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: ShowcasePage },
      { path: '*', Component: NotFoundPage },
    ],
  },
])
