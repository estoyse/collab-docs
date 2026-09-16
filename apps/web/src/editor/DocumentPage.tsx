import { useEffect, useRef } from 'react'
import { Link, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { PresenceUser } from '@collab-docs/shared'
import { StatusPill } from '@/components/StatusPill'
import { OfflineStorageWarning } from '@/components/OfflineStorageWarning'
import { useDocSession } from '@/collab/useDocSession'
import { DocumentTitle } from '@/features/documents/DocumentTitle'
import { AvatarStack } from '@/features/presence/AvatarStack'
import { usePresence } from '@/features/presence/usePresence'
import { Editor } from './Editor'

export function DocumentRoute({ user }: { user: PresenceUser }) {
  const { docId } = useParams<{ docId: string }>()

  if (!docId) {
    return null
  }

  return <DocumentPage docId={docId} user={user} />
}

export function DocumentPage({ docId, user }: { docId: string; user: PresenceUser }) {
  const { session, ready, offlineStorageAvailable, connection, pendingChanges } = useDocSession(
    docId,
    user,
  )
  const users = usePresence(session)

  const previousConnection = useRef(connection)

  useEffect(() => {
    const previous = previousConnection.current
    previousConnection.current = connection

    if (previous === connection) {
      return
    }

    if (connection === 'offline') {
      toast('You are offline', {
        description: 'Keep writing — changes are saved locally and will sync.',
      })
    }

    if (previous === 'offline' && connection === 'synced') {
      toast.success('Back online', { description: 'Your changes have been merged.' })
    }
  }, [connection])

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center gap-3 border-b border-hairline px-3 py-2">
        <Link
          to="/"
          aria-label="Back to documents"
          className="flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-hover"
        >
          <ChevronLeft className="size-4" />
        </Link>

        {session && <DocumentTitle doc={session.doc} />}

        <div className="flex shrink-0 items-center gap-3">
          <AvatarStack users={users} />
          <StatusPill state={connection} pendingChanges={pendingChanges} />
        </div>
      </header>

      {!offlineStorageAvailable && <OfflineStorageWarning />}

      {session && ready ? (
        <Editor session={session} user={user} />
      ) : (
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-muted">
          Opening document…
        </div>
      )}
    </div>
  )
}
