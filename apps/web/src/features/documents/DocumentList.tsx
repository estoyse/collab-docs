import { useNavigate } from 'react-router'
import { FileText, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDocuments } from './useDocuments'

function formatUpdatedAt(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp))
}

export function DocumentList() {
  const { documents, loading, error, create } = useDocuments()
  const navigate = useNavigate()

  const onCreate = async () => {
    const created = await create()

    if (created) {
      void navigate(`/d/${created.id}`)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-xl">Documents</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Everything you and your collaborators are working on.
          </p>
        </div>
        <Button onClick={() => void onCreate()}>
          <Plus className="mr-2 size-4" />
          New document
        </Button>
      </div>

      {error && (
        <p className="mt-6 rounded-md border border-hairline bg-page px-4 py-3 text-sm text-ink-muted">
          {error}
        </p>
      )}

      {loading && <p className="mt-8 text-sm text-ink-muted">Loading…</p>}

      {!loading && documents.length === 0 && !error && (
        <div className="mt-10 rounded-lg border border-hairline bg-page px-6 py-16 text-center">
          <FileText className="mx-auto size-6 text-ink-muted" />
          <p className="mt-3 font-serif text-lg">Nothing here yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Create a document and share its link to write together.
          </p>
        </div>
      )}

      <ul className="mt-8 flex flex-col gap-2">
        {documents.map((document) => (
          <li key={document.id}>
            <button
              type="button"
              onClick={() => void navigate(`/d/${document.id}`)}
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-hairline bg-page px-4 py-3 text-left transition-colors hover:bg-hover"
            >
              <span className="font-serif text-base">{document.title}</span>
              <span className="text-xs text-ink-muted">
                {formatUpdatedAt(document.updatedAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
