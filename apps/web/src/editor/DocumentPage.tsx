import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { toast } from 'sonner'
import { apiUrl } from '@/lib/api'
import type { PresenceUser } from '@/lib/identity'
import { buttonVariants } from '@/components/ui/button'
import { StatusPill } from '@/components/StatusPill'
import { Wordmark } from '@/components/Wordmark'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { OfflineStorageWarning } from '@/components/OfflineStorageWarning'
import { deriveConnectionToast } from '@/collab/connection'
import { useDocSession } from '@/collab/useDocSession'
import { AvatarStack } from '@/features/presence/AvatarStack'
import { usePresence } from '@/features/presence/usePresence'
import { Editor } from './Editor'
import { ExportMenu } from './ExportMenu'

type Existence = 'checking' | 'exists' | 'not-found' | 'unreachable'

function useDocumentExistence(docId: string): Existence {
  const [existence, setExistence] = useState<Existence>('checking')

  useEffect(() => {
    let cancelled = false
    setExistence('checking')

    fetch(apiUrl(`/api/documents/${docId}`))
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
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 sm:px-8">
      <div className="flex h-14 items-center">
        <Wordmark />
      </div>
      <div className="flex flex-1 items-center justify-center pb-24">
        <div className="w-full max-w-sm">
          <h1 className="text-xl font-semibold text-ink">This document doesn't exist</h1>
          <p className="mt-2 text-sm text-ink-muted">
            The link may be mistyped, or the document was never created on this server.
          </p>
          <Link to="/" className={buttonVariants({ size: 'lg', className: 'mt-6' })}>
            Go to documents
          </Link>
        </div>
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

  return (
    <ErrorBoundary
      resetKey={docId}
      fullPage={false}
      title="This document couldn't be displayed"
      description="Your edits are kept on this device and on the server once synced. Reload to reopen it."
    >
      <DocumentEditor docId={docId} user={user} existence={existence} />
    </ErrorBoundary>
  )
}

function DocumentEditor({
  docId,
  user,
  existence,
}: {
  docId: string
  user: PresenceUser
  existence: Existence
}) {
  const { session, ready, offlineStorageAvailable, connection, pendingChanges, outdated } =
    useDocSession(docId, user)
  const users = usePresence(session)
  const [editor, setEditor] = useState<TiptapEditor | null>(null)

  const inOfflineEpisode = useRef(false)

  useEffect(() => {
    if (outdated) {
      toast.dismiss('connection-offline')
      return
    }

    const result = deriveConnectionToast(inOfflineEpisode.current, connection)
    inOfflineEpisode.current = result.inOfflineEpisode

    if (result.toast === 'offline') {
      toast('You are offline', {
        id: 'connection-offline',
        description: 'Keep writing. Changes are saved locally and will sync.',
      })
    }

    if (result.toast === 'back-online') {
      toast.success('Back online', {
        id: 'connection-back-online',
        description: 'Your changes have been merged.',
      })
    }
  }, [connection, outdated])

  return (
    <div className="min-h-screen">
      <header>
        <div className="mx-auto flex h-14 w-full max-w-[46rem] items-center justify-between gap-3 px-4 xs:max-w-[52rem] sm:px-8">
          <Link
            to="/"
            className="-ml-2 inline-flex items-center gap-1 rounded-sm py-1 pr-2.5 pl-1.5 text-sm text-ink-muted transition-colors hover:bg-hover hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-self"
          >
            <ChevronLeft className="size-4" />
            Documents
          </Link>

          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <StatusPill state={connection} pendingChanges={pendingChanges} outdated={outdated} />
            <AvatarStack users={users} />
            {session && editor && <ExportMenu editor={editor} doc={session.doc} />}
          </div>
        </div>
      </header>

      {!offlineStorageAvailable && <OfflineStorageWarning />}

      {existence !== 'checking' && session && ready ? (
        <Editor session={session} user={user} onEditorChange={setEditor} />
      ) : (
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-muted">
          Opening document…
        </div>
      )}
    </div>
  )
}
