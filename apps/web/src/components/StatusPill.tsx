import type { ConnectionState } from '@/collab/connection'

const LABELS: Record<ConnectionState, string> = {
  connecting: 'Connecting',
  syncing: 'Syncing',
  synced: 'Saved',
  offline: 'Offline',
}

const DOT_CLASSES: Record<ConnectionState, string> = {
  connecting: 'bg-ink-muted motion-safe:animate-pulse',
  syncing: 'bg-self motion-safe:animate-pulse',
  synced: 'bg-state-ok',
  offline: 'bg-state-offline',
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
      <span
        role="status"
        className="flex shrink-0 items-center gap-2 text-sm text-danger"
        title={OUTDATED_HINT}
      >
        <span aria-hidden className="size-2 rounded-full bg-danger" />
        Outdated
      </span>
    )
  }

  const showPending = state === 'offline' && pendingChanges > 0

  return (
    <span
      role="status"
      className="flex shrink-0 items-center gap-2 text-sm text-ink-muted"
      title={showPending ? `Offline, ${PENDING_LABEL}` : undefined}
    >
      <span aria-hidden className={`size-2 rounded-full ${DOT_CLASSES[state]}`} />
      <span className={state === 'offline' ? 'text-state-offline' : undefined}>
        {LABELS[state]}
        {showPending && <span className="hidden sm:inline">, {PENDING_LABEL}</span>}
      </span>
    </span>
  )
}
