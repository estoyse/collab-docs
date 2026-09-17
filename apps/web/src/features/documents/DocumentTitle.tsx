import { useEffect, useLayoutEffect, useRef } from 'react'
import type * as Y from 'yjs'
import { DEFAULT_DOCUMENT_TITLE, DOC_TITLE_KEY, MAX_TITLE_LENGTH } from '@collab-docs/shared'
import { mapIndexThroughDelta, useYText } from '@/collab/ytext'

type SavedSelection = {
  start: number
  end: number
  direction: 'forward' | 'backward' | 'none'
}

export function DocumentTitle({ doc, onEnter }: { doc: Y.Doc; onEnter?: () => void }) {
  const [title, setTitle] = useYText(doc, DOC_TITLE_KEY)
  const field = useRef<HTMLTextAreaElement>(null)
  const remoteSelection = useRef<SavedSelection | null>(null)

  useEffect(() => {
    const ytext = doc.getText(DOC_TITLE_KEY)

    const observer = (event: Y.YTextEvent) => {
      const element = field.current

      if (event.transaction.local || !element || element.ownerDocument.activeElement !== element) {
        remoteSelection.current = null
        return
      }

      const selection = remoteSelection.current ?? {
        start: element.selectionStart,
        end: element.selectionEnd,
        direction: element.selectionDirection,
      }

      remoteSelection.current = {
        ...selection,
        start: mapIndexThroughDelta(selection.start, event.delta),
        end: mapIndexThroughDelta(selection.end, event.delta),
      }
    }

    ytext.observe(observer)

    return () => {
      ytext.unobserve(observer)
      remoteSelection.current = null
    }
  }, [doc])

  useLayoutEffect(() => {
    const element = field.current

    if (!element) {
      return
    }

    element.style.height = 'auto'
    element.style.height = `${element.scrollHeight}px`

    const selection = remoteSelection.current
    remoteSelection.current = null

    if (selection && element.ownerDocument.activeElement === element) {
      element.setSelectionRange(selection.start, selection.end, selection.direction)
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
      placeholder={DEFAULT_DOCUMENT_TITLE}
      aria-label="Document title"
      className="page-title block w-full resize-none overflow-hidden bg-transparent outline-none placeholder:text-ink-muted"
    />
  )
}
