import { Card, Spinner, Typography } from '@heroui/react'

export function LoadPanel({ text, showIndicator, className }: { text: string; showIndicator: boolean; className: string }) {
  return (
    // Card: örtü, tablonun kartıyla aynı HeroUI yarıçapında
    <Card variant="transparent" className={className} role="status" aria-live="polite">
      {showIndicator && <Spinner size="sm" />}
      <Typography type="body-sm" color="muted">
        {text}
      </Typography>
    </Card>
  )
}
