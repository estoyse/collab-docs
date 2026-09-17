import { TriangleAlert } from 'lucide-react'

export function OfflineStorageWarning() {
  return (
    <div
      role="alert"
      className="mx-4 mb-4 flex items-start gap-2.5 rounded-md bg-state-offline-surface px-4 py-3 text-sm text-ink sm:mx-auto sm:max-w-[40rem]"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-state-offline" />
      <p>
        Offline editing is unavailable in this browser session, so changes made
        without a connection will not be kept. Private browsing windows and
        blocked site data are the usual causes.
      </p>
    </div>
  )
}
