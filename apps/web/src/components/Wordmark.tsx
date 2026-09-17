import { cn } from 'cn'
import { PRESENCE_COLORS } from '@/lib/colors'

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-sans text-sm font-semibold text-ink', className)}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <rect x="5" y="2" width="7" height="4" rx="1" fill={PRESENCE_COLORS[5]} />
        <rect x="5" y="5" width="1.5" height="13" fill={PRESENCE_COLORS[5]} />
        <rect x="13" y="5" width="5" height="4" rx="1" fill={PRESENCE_COLORS[0]} />
        <rect x="13" y="8" width="1.5" height="10" fill={PRESENCE_COLORS[0]} />
      </svg>
      Collab Docs
    </span>
  )
}
