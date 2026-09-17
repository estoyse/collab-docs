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

function pendingLabel(count: number): string {
  return count === 1 ? '1 change waiting to sync' : `${count} changes waiting to sync`
}

export function StatusPill({
  state,
  pendingChanges,
}: {
  state: ConnectionState
  pendingChanges: number
}) {
  const showPending = state === 'offline' && pendingChanges > 0

  return (
    <span
      role="status"
      className="flex shrink-0 items-center gap-2 text-sm text-ink-muted"
      title={showPending ? pendingLabel(pendingChanges) : undefined}
    >
      <span aria-hidden className={`size-2 rounded-full ${DOT_CLASSES[state]}`} />
      <span className={state === 'offline' ? 'text-state-offline' : undefined}>
        {LABELS[state]}
        {showPending && (
          <span className="hidden sm:inline">, {pendingLabel(pendingChanges)}</span>
        )}
      </span>
    </span>
  )
}
