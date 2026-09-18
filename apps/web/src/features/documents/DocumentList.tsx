import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { cn } from 'cn'
import { DEFAULT_DOCUMENT_TITLE, type DocumentSummary } from '@collab-docs/shared'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/Wordmark'
import { editedAt, formatEdited } from './formatEdited'
import { useDocuments } from './useDocuments'

const SKELETON_ROWS = 6

const ROW_GRID = 'grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6'

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
        className={cn(
          ROW_GRID,
          'w-full items-baseline border-b border-hairline py-3.5 text-left transition-colors hover:border-self focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-self motion-reduce:transition-none',
        )}
      >
        <span className="truncate text-right text-xs text-ink-muted tabular-nums">
          {editedAt(document.updatedAt, now)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-base font-medium text-ink">{title}</span>
          <span className={cn('mt-1 block truncate text-sm text-ink-muted', !line && 'italic opacity-70')}>
            {line || 'No content yet'}
          </span>
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
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-8">
      <div className="flex h-14 items-center">
        <Wordmark />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-b border-ink pb-4">
        <h1 className="text-2xl font-semibold text-ink">Documents</h1>
        <Button size="lg" onClick={() => void onCreate()}>
          <Plus />
          New document
        </Button>
      </div>

      {error && (
        <p className="mt-8 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {showSkeleton && (
        <>
          <span className="sr-only">Loading documents</span>
          <ul aria-hidden>
            {Array.from({ length: SKELETON_ROWS }).map((_, index) => (
              <li key={index} className={cn(ROW_GRID, 'items-baseline border-b border-hairline py-3.5')}>
                <div className="ml-auto h-2.5 w-14 rounded-xs bg-hover" />
                <div>
                  <div className="h-4 w-2/5 rounded-xs bg-hover" />
                  <div className="mt-2 h-3 w-3/5 rounded-xs bg-hover" />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {showEmpty && (
        <div className="pt-10">
          <p className="text-base font-medium text-ink">Nothing here yet</p>
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
        <ul>
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
