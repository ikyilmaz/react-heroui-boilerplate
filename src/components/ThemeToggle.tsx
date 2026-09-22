import { Button, useTheme } from '@heroui/react'
import { Moon, Sun } from 'lucide-react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant="ghost"
      size="sm"
      isIconOnly
      aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
      onPress={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
    </Button>
  )
}
