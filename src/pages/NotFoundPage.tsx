import { Link as RouterLink } from 'react-router'
import { Button, Surface, Typography } from '@heroui/react'

export function NotFoundPage() {
  return (
    <Surface variant="transparent" className="flex flex-col items-center gap-4 py-24">
      <Typography className="text-7xl font-bold text-accent">404</Typography>
      <Typography.Heading level={1} className="text-xl font-semibold">
        Sayfa bulunamadı
      </Typography.Heading>
      <RouterLink to="/">
        <Button variant="primary">Vitrine dön</Button>
      </RouterLink>
    </Surface>
  )
}
