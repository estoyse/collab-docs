import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { cn } from 'cn'
import { DEFAULT_DOCUMENT_TITLE, type DocumentSummary } from '@collab-docs/shared'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/Wordmark'
import { editedAt, formatEdited } from './formatEdited'
import { useDocuments } from './useDocuments'

const SKELETON_ROWS = 7

function firstLine(excerpt: string): string {
  return excerpt.trim().split('\n', 1)[0]?.trim() ?? ''
}

function DocumentRow({
  document,
  now,
  onOpen,
}: {
  document: DocumentSummary
  now: Date
  onOpen: () => void
}) {
  const title = document.title.trim() || DEFAULT_DOCUMENT_TITLE
  const line = firstLine(document.excerpt)

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${title}, ${formatEdited(document.updatedAt, now).toLowerCase()}`}
        className="flex w-full flex-col gap-1 border-b border-hairline px-2.5 py-3 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-self motion-reduce:transition-none"
      >
        <span className="flex items-baseline justify-between gap-6">
          <span className="truncate font-serif text-prose text-ink">{title}</span>
          <span className="flex-none text-xs text-ink-muted tabular-nums">
            {editedAt(document.updatedAt, now)}
          </span>
        </span>
        <span
          className={cn(
            'truncate font-serif text-sm text-ink-muted',
            !line && 'italic opacity-70',
          )}
        >
          {line || 'No content yet'}
        </span>
      </button>
    </li>
  )
}

export function DocumentList() {
  const { documents, loading, error, create } = useDocuments()
  const navigate = useNavigate()
  const now = new Date()

  const onCreate = async () => {
    const created = await create()

    if (created) {
      void navigate(`/d/${created.id}`)
    }
  }

  const showSkeleton = loading && documents.length === 0
  const showEmpty = !loading && !error && documents.length === 0

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pb-24 sm:px-8">
      <div className="flex h-14 items-center">
        <Wordmark />
      </div>

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4 sm:mt-10">
        <h1 className="font-serif text-2xl font-semibold text-ink">Documents</h1>
        <Button size="lg" onClick={() => void onCreate()}>
          <Plus />
          New document
        </Button>
      </div>

      {error && (
        <p className="mt-8 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {showSkeleton && (
        <div className="mt-8">
          <span className="sr-only">Loading documents</span>
          <ul aria-hidden>
            {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
              <li key={index} className="border-b border-hairline px-2.5 py-3">
                <div className="flex items-baseline justify-between gap-6">
                  <div className="h-3.5 w-2/5 rounded-xs bg-hover" />
                  <div className="h-2.5 w-14 flex-none rounded-xs bg-hover" />
                </div>
                <div className="mt-2.5 h-2.5 w-3/5 rounded-xs bg-hover" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {showEmpty && (
        <div className="mt-8 border-t border-hairline pt-10">
          <p className="font-serif text-prose text-ink">Nothing here yet</p>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            Start a document, then share its link with anyone you want writing alongside you.
          </p>
          <Button size="lg" className="mt-6" onClick={() => void onCreate()}>
            <Plus />
            New document
          </Button>
        </div>
      )}

      {documents.length > 0 && (
        <ul className="mt-8">
          {documents.map((document) => (
            <DocumentRow
              key={document.id}
              document={document}
              now={now}
              onOpen={() => void navigate(`/d/${document.id}`)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
