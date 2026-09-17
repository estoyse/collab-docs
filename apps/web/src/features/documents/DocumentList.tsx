import { useNavigate } from 'react-router'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Wordmark } from '@/components/Wordmark'
import { useDocuments } from './useDocuments'
import { formatUpdatedAt, groupDocuments } from './groupDocuments'

export function DocumentList() {
  const { documents, loading, error, create } = useDocuments()
  const navigate = useNavigate()

  const onCreate = async () => {
    const created = await create()

    if (created) {
      void navigate(`/d/${created.id}`)
    }
  }

  const groups = groupDocuments(documents, new Date())

  return (
    <div className="mx-auto w-full max-w-[46rem] px-4 pb-24 sm:px-8">
      <div className="flex h-14 items-center justify-between">
        <Wordmark />
      </div>

      <div className="mt-12 flex flex-wrap items-end justify-between gap-4 sm:mt-16">
        <h1 className="font-serif text-2xl font-semibold tracking-[-0.01em] text-ink">
          Documents
        </h1>
        <Button size="lg" onClick={() => void onCreate()}>
          <Plus className="size-4" data-icon="inline-start" />
          New document
        </Button>
      </div>

      {error && (
        <p className="mt-8 rounded-md bg-danger/8 px-4 py-3 text-sm text-danger">{error}</p>
      )}

      {loading && (
        <div className="mt-10">
          <span className="sr-only">Loading documents</span>
          <ul className="border-t border-hairline" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <li
                key={index}
                className="flex items-baseline justify-between gap-4 border-b border-hairline px-2 py-3.5"
              >
                <div className="h-5 w-2/5 rounded-sm bg-hover" />
                <div className="h-4 w-12 shrink-0 rounded-sm bg-hover" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {!loading && !error && documents.length === 0 && (
        <div className="mt-16">
          <p className="font-serif text-xl text-ink">Start the first document</p>
          <p className="mt-2 max-w-sm text-sm text-ink-muted">
            Documents you create or open from a shared link will show up here.
          </p>
          <Button variant="outline" size="lg" className="mt-6" onClick={() => void onCreate()}>
            New document
          </Button>
        </div>
      )}

      {!loading &&
        groups.map((group) => (
          <div key={group.label} className="mt-10">
            <h2 className="pb-2 text-sm font-medium text-ink-muted">{group.label}</h2>
            <ul className="border-t border-hairline">
              {group.documents.map((document) => (
                <li key={document.id} className="border-b border-hairline">
                  <button
                    type="button"
                    onClick={() => void navigate(`/d/${document.id}`)}
                    className="group -mx-2 flex w-[calc(100%+1rem)] items-baseline justify-between gap-4 rounded-sm px-2 py-3.5 text-left transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-self"
                  >
                    <span className="min-w-0 truncate font-serif text-lg text-ink">
                      {document.title.trim() || 'Untitled'}
                    </span>
                    <span className="shrink-0 text-sm text-ink-muted tabular-nums">
                      {formatUpdatedAt(document.updatedAt, new Date())}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  )
}
