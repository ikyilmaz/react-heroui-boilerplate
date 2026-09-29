import { Outlet } from 'react-router'
import { Surface } from '@heroui/react'
import { Navbar } from '@/components/layout/Navbar'

export function RootLayout() {
  return (
    <Surface variant="transparent" className="flex min-h-screen flex-col bg-background text-foreground">
      <Navbar />
      {/* Surface <div> basar; <main> yerine landmark rolünü veriyoruz */}
      <Surface variant="transparent" role="main" className="mx-auto w-full flex-1 px-4 py-8 md:w-[92%] 2xl:w-[88%]">
        <Outlet />
      </Surface>
    </Surface>
  )
}
