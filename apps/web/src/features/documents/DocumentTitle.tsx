import { useLayoutEffect, useRef } from 'react'
import type * as Y from 'yjs'
import { DOC_TITLE_KEY, MAX_TITLE_LENGTH } from '@collab-docs/shared'
import { useYText } from '@/collab/ytext'

export function DocumentTitle({ doc, onEnter }: { doc: Y.Doc; onEnter?: () => void }) {
  const [title, setTitle] = useYText(doc, DOC_TITLE_KEY)
  const field = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const element = field.current

    if (element) {
      element.style.height = 'auto'
      element.style.height = `${element.scrollHeight}px`
    }
  }, [title])

  return (
    <textarea
      ref={field}
      rows={1}
      value={title}
      maxLength={MAX_TITLE_LENGTH}
      onChange={(event) => setTitle(event.target.value.replace(/\s*\n\s*/g, ' '))}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          onEnter?.()
        }
      }}
      placeholder="Untitled"
      aria-label="Document title"
      className="page-title block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-ink-muted/60"
    />
  )
}
