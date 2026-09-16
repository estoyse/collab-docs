import { TriangleAlert } from 'lucide-react'

export function OfflineStorageWarning() {
  return (
    <div className="flex items-start gap-2 border-b border-hairline bg-state-offline-surface px-3 py-2 text-xs text-ink">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-state-offline" />
      <p>
        Offline editing is unavailable in this browser session, so changes made
        without a connection will not be kept. Private browsing windows and
        blocked site data are the usual causes.
      </p>
    </div>
  )
}
