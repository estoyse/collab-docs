import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ChevronLeft, FileQuestionMark } from 'lucide-react'
import { toast } from 'sonner'
import type { PresenceUser } from '@collab-docs/shared'
import { StatusPill } from '@/components/StatusPill'
import { OfflineStorageWarning } from '@/components/OfflineStorageWarning'
import { deriveConnectionToast } from '@/collab/connection'
import { useDocSession } from '@/collab/useDocSession'
import { DocumentTitle } from '@/features/documents/DocumentTitle'
import { AvatarStack } from '@/features/presence/AvatarStack'
import { usePresence } from '@/features/presence/usePresence'
import { Editor } from './Editor'

type Existence = 'checking' | 'exists' | 'not-found' | 'unreachable'

function useDocumentExistence(docId: string): Existence {
  const [existence, setExistence] = useState<Existence>('checking')

  useEffect(() => {
    let cancelled = false
    setExistence('checking')

    fetch(`/api/documents/${docId}`)
      .then((response) => {
        if (cancelled) {
          return
        }

        setExistence(response.status === 404 ? 'not-found' : 'exists')
      })
      .catch(() => {
        if (!cancelled) {
          setExistence('unreachable')
        }
      })

    return () => {
      cancelled = true
    }
  }, [docId])

  return existence
}

function DocumentNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-sm rounded-lg border border-hairline bg-page px-6 py-16 text-center">
        <FileQuestionMark className="mx-auto size-6 text-ink-muted" />
        <p className="mt-3 font-serif text-lg">Document not found</p>
        <p className="mt-1 text-sm text-ink-muted">
          This link doesn't point to a document that exists.
        </p>
        <Link
          to="/"
          className="mt-6 inline-block text-sm text-accent-blue underline underline-offset-4"
        >
          Back to documents
        </Link>
      </div>
    </div>
  )
}

export function DocumentRoute({ user }: { user: PresenceUser }) {
  const { docId } = useParams<{ docId: string }>()

  if (!docId) {
    return null
  }

  return <DocumentPage docId={docId} user={user} />
}

export function DocumentPage({ docId, user }: { docId: string; user: PresenceUser }) {
  const existence = useDocumentExistence(docId)

  if (existence === 'not-found') {
    return <DocumentNotFound />
  }

  if (existence === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-ink-muted">
        Opening document…
      </div>
    )
  }

  return <DocumentEditor docId={docId} user={user} />
}

function DocumentEditor({ docId, user }: { docId: string; user: PresenceUser }) {
  const { session, ready, offlineStorageAvailable, connection, pendingChanges } = useDocSession(
    docId,
    user,
  )
  const users = usePresence(session)

  const inOfflineEpisode = useRef(false)

  useEffect(() => {
    const result = deriveConnectionToast(inOfflineEpisode.current, connection)
    inOfflineEpisode.current = result.inOfflineEpisode

    if (result.toast === 'offline') {
      toast('You are offline', {
        id: 'connection-offline',
        description: 'Keep writing — changes are saved locally and will sync.',
      })
    }

    if (result.toast === 'back-online') {
      toast.success('Back online', {
        id: 'connection-back-online',
        description: 'Your changes have been merged.',
      })
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

        {session && ready && <DocumentTitle doc={session.doc} />}

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
