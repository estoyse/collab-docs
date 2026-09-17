import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { cn } from 'cn'
import { DEFAULT_DOCUMENT_TITLE, type DocumentSummary } from '@collab-docs/shared'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/Wordmark'
import { formatEdited } from './formatEdited'
import { useDocuments } from './useDocuments'

const SKELETON_PAGES = 6

function PagePreview({
  document,
  featured = false,
}: {
  document: DocumentSummary
  featured?: boolean
}) {
  const title = document.title.trim()
  const excerpt = document.excerpt.trim()

  return (
    <div
      aria-hidden
      className={cn(
        'flex min-h-0 flex-1 flex-col overflow-hidden rounded-sm border border-hairline bg-page text-left shadow-rail transition-[box-shadow,border-color] duration-150 group-hover:border-input group-hover:shadow-overlay motion-reduce:transition-none',
        featured
          ? 'aspect-[3/2] px-6 pt-6 sm:aspect-auto sm:px-10 sm:pt-10'
          : 'aspect-[3/4] flex-none px-4 pt-4',
      )}
    >
      <p
        className={cn(
          'font-serif font-semibold text-ink',
          featured ? 'text-xl leading-tight sm:text-2xl' : 'line-clamp-3 text-sm leading-snug',
        )}
      >
        {title || DEFAULT_DOCUMENT_TITLE}
      </p>
      <p
        className={cn(
          'mt-3 min-h-0 flex-1 overflow-hidden font-serif whitespace-pre-line [contain:size] [mask-image:linear-gradient(to_bottom,black_55%,transparent)]',
          featured
            ? 'text-sm leading-relaxed text-ink sm:mt-4 sm:text-prose sm:leading-relaxed'
            : 'text-caret-label leading-relaxed text-ink-muted',
          !excerpt && 'italic',
        )}
      >
        {excerpt || 'Start writing…'}
      </p>
    </div>
  )
}

function DocumentTile({
  document,
  featured = false,
  now,
  onOpen,
}: {
  document: DocumentSummary
  featured?: boolean
  now: Date
  onOpen: () => void
}) {
  const title = document.title.trim() || DEFAULT_DOCUMENT_TITLE
  const edited = formatEdited(document.updatedAt, now)

  return (
    <li className={cn(featured && 'col-span-2 sm:row-span-2')}>
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${title}, ${edited.toLowerCase()}`}
        className="group flex h-full w-full flex-col rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-self"
      >
        <PagePreview document={document} featured={featured} />
        <span
          className={cn(
            'mt-3 block text-ink-muted',
            featured ? 'text-sm' : 'text-xs',
          )}
        >
          {edited}
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
    <div className="mx-auto w-full max-w-6xl px-4 pb-24 sm:px-8">
      <div className="flex h-14 items-center">
        <Wordmark />
      </div>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-4 sm:mt-14">
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
        <div className="mt-10">
          <span className="sr-only">Loading documents</span>
          <ul
            aria-hidden
            className="grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5"
          >
            {Array.from({ length: SKELETON_PAGES }).map((_, index) => (
              <li key={index} className={cn(index === 0 && 'col-span-2 sm:row-span-2')}>
                <div
                  className={cn(
                    'rounded-sm border border-hairline bg-page p-4',
                    index === 0 ? 'aspect-[3/2] sm:aspect-auto sm:h-full' : 'aspect-[3/4]',
                  )}
                >
                  <div className="h-3 w-3/5 rounded-xs bg-hover" />
                  <div className="mt-3 h-2 w-full rounded-xs bg-hover" />
                  <div className="mt-2 h-2 w-4/5 rounded-xs bg-hover" />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showEmpty && (
        <div className="mt-10 grid grid-cols-2 gap-x-5 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5">
          <button
            type="button"
            onClick={() => void onCreate()}
            className="group col-span-2 flex flex-col rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-self"
          >
            <span className="flex aspect-[3/2] flex-col rounded-sm border border-dashed border-input bg-page/60 px-6 pt-6 transition-colors group-hover:border-ink-muted group-hover:bg-page sm:px-10 sm:pt-10">
              <span className="font-serif text-xl font-semibold text-ink-muted sm:text-2xl">
                {DEFAULT_DOCUMENT_TITLE}
              </span>
              <span className="mt-3 font-serif text-sm text-ink-muted italic sm:mt-4 sm:text-prose">
                Start writing…
              </span>
            </span>
            <span className="mt-3 text-sm text-ink-muted">
              No documents yet. Start one, then share its link to write together.
            </span>
          </button>
        </div>
      )}

      {documents.length > 0 && (
        <ul className="mt-10 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-5">
          {documents.map((document, index) => (
            <DocumentTile
              key={document.id}
              document={document}
              featured={index === 0}
              now={now}
              onOpen={() => void navigate(`/d/${document.id}`)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
