import { Cloud, CloudAlert, CloudCheck, CloudOff, CloudUpload } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ConnectionState } from '@/collab/connection'

const LABELS: Record<ConnectionState, string> = {
  connecting: 'Connecting',
  syncing: 'Syncing',
  synced: 'Saved',
  offline: 'Offline',
}

const ICONS: Record<ConnectionState, LucideIcon> = {
  connecting: Cloud,
  syncing: CloudUpload,
  synced: CloudCheck,
  offline: CloudOff,
}

const ICON_CLASSES: Record<ConnectionState, string> = {
  connecting: 'text-ink-muted motion-safe:animate-breathe',
  syncing: 'text-self motion-safe:animate-nudge',
  synced: 'text-state-ok motion-safe:animate-settle',
  offline: 'text-state-offline',
}

const PENDING_LABEL = 'changes waiting to sync'
const OUTDATED_HINT = 'This tab is out of date. Reload to keep syncing.'

export function StatusPill({
  state,
  pendingChanges,
  outdated = false,
}: {
  state: ConnectionState
  pendingChanges: number
  outdated?: boolean
}) {
  if (outdated) {
    return (
      <span role="status" className="flex shrink-0 items-center" title={OUTDATED_HINT}>
        <CloudAlert aria-hidden className="size-4 text-danger" />
        <span className="sr-only">Outdated. {OUTDATED_HINT}</span>
      </span>
    )
  }

  const Icon = ICONS[state]
  const showPending = state === 'offline' && pendingChanges > 0
  const label = showPending ? `${LABELS[state]}, ${pendingChanges} ${PENDING_LABEL}` : LABELS[state]

  return (
    <span role="status" className="flex shrink-0 items-center" title={label}>
      <Icon key={state} aria-hidden className={`size-4 ${ICON_CLASSES[state]}`} />
      <span className="sr-only">{label}</span>
    </span>
  )
}
