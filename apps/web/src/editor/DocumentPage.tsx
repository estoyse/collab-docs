import type { PresenceUser } from '@collab-docs/shared'
import { useDocSession } from '@/collab/useDocSession'
import { Editor } from './Editor'

export function DocumentPage({ docId, user }: { docId: string; user: PresenceUser }) {
  const { session, ready } = useDocSession(docId, user)

  if (!session || !ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-ink-muted">
        Opening document…
      </div>
    )
  }

  return <Editor session={session} user={user} />
}
