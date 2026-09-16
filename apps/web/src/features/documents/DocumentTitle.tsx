import type * as Y from 'yjs'
import { DOC_TITLE_KEY } from '@collab-docs/shared'
import { useYText } from '@/collab/ytext'

export function DocumentTitle({ doc }: { doc: Y.Doc }) {
  const [title, setTitle] = useYText(doc, DOC_TITLE_KEY)

  return (
    <input
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      placeholder="Untitled"
      aria-label="Document title"
      className="min-w-0 flex-1 bg-transparent font-serif text-base outline-none placeholder:text-ink-muted"
    />
  )
}
