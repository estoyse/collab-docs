import { Link, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import type { PresenceUser } from '@collab-docs/shared'
import { StatusPill } from '@/components/StatusPill'
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
  const { session, ready, connection, pendingChanges } = useDocSession(docId, user)
  const users = usePresence(session)

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
