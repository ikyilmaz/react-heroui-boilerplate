import { NavLink } from 'react-router'
import { Surface, Typography } from '@heroui/react'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ThemeTweaker } from '@/components/ThemeTweaker'

export function Navbar() {
  return (
    <Surface
      variant="transparent"
      role="banner"
      className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur"
    >
      <Surface variant="transparent" className="mx-auto flex h-14 w-full items-center justify-between px-4 md:w-[92%] 2xl:w-[88%]">
        <NavLink to="/">
          <Typography weight="semibold">HeroUI Boilerplate</Typography>
        </NavLink>
        <Surface variant="transparent" className="flex items-center gap-1">
          <ThemeTweaker />
          <ThemeToggle />
        </Surface>
      </Surface>
    </Surface>
  )
}
