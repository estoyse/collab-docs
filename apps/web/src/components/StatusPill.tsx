import type { ConnectionState } from '@/collab/connection'

const LABELS: Record<ConnectionState, string> = {
  connecting: 'Connecting',
  syncing: 'Syncing',
  synced: 'Saved',
  offline: 'Offline',
}

const DOT_CLASSES: Record<ConnectionState, string> = {
  connecting: 'bg-ink-muted',
  syncing: 'bg-accent-blue',
  synced: 'bg-emerald-600',
  offline: 'bg-amber-600',
}

export function StatusPill({
  state,
  pendingChanges,
}: {
  state: ConnectionState
  pendingChanges: number
}) {
  const suffix =
    state === 'offline' && pendingChanges > 0 ? ` · ${pendingChanges} pending` : ''

  return (
    <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-hairline px-2.5 py-1 text-xs text-ink-muted">
      <span className={`size-1.5 rounded-full ${DOT_CLASSES[state]}`} />
      {LABELS[state]}
      {suffix}
    </span>
  )
}
