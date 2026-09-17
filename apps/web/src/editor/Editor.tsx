import { useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { StarterKit } from '@tiptap/starter-kit'
import { Collaboration } from '@tiptap/extension-collaboration'
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import { DOC_BODY_FIELD } from '@collab-docs/shared'
import type { PresenceUser } from '@/lib/identity'
import type { DocSession } from '@/collab/session'
import { DocumentTitle } from '@/features/documents/DocumentTitle'
import { Toolbar } from './Toolbar'
import { SelectionMenu } from './SelectionMenu'

export function Editor({
  session,
  user,
  onEditorChange,
}: {
  session: DocSession
  user: PresenceUser
  onEditorChange: (editor: TiptapEditor | null) => void
}) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          undoRedo: false,
          trailingNode: false,
          link: { openOnClick: false, defaultProtocol: 'https' },
        }),
        Collaboration.configure({ document: session.doc, field: DOC_BODY_FIELD }),
        CollaborationCaret.configure({
          provider: session.provider,
          user,
          selectionRender: (remoteUser) => ({
            nodeName: 'span',
            class: 'remote-selection',
            style: `background-color: color-mix(in srgb, ${remoteUser.color} 22%, transparent)`,
          }),
        }),
        Placeholder.configure({ placeholder: 'Start writing…' }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
      ],
      editorProps: {
        attributes: { class: 'page-prose min-h-[40vh] focus:outline-none' },
      },
    },
    [session],
  )

  useEffect(() => {
    onEditorChange(editor)
    return () => onEditorChange(null)
  }, [editor, onEditorChange])

  if (!editor) {
    return null
  }

  return (
    <div className="mx-auto w-full max-w-[46rem] px-4 pb-32 xs:grid xs:max-w-[52rem] xs:grid-cols-[auto_minmax(0,1fr)] xs:gap-3 sm:gap-4 sm:px-8 lg:gap-5">
      <Toolbar editor={editor} />
      <SelectionMenu editor={editor} />
      <article className="mt-4 rounded-sm border border-hairline bg-page px-6 pt-12 pb-24 shadow-rail xs:mt-0 sm:px-10 sm:pt-16 md:px-12 lg:px-16">
        <DocumentTitle doc={session.doc} onEnter={() => editor.commands.focus('start')} />
        <EditorContent editor={editor} className="mt-8" />
      </article>
    </div>
  )
}
