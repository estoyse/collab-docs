import { EditorContent, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Collaboration } from '@tiptap/extension-collaboration'
import { CollaborationCaret } from '@tiptap/extension-collaboration-caret'
import { Placeholder } from '@tiptap/extension-placeholder'
import { DOC_BODY_FIELD, type PresenceUser } from '@collab-docs/shared'
import type { DocSession } from '@/collab/session'
import { Toolbar } from './Toolbar'
import { SelectionMenu } from './SelectionMenu'

export function Editor({ session, user }: { session: DocSession; user: PresenceUser }) {
  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: session.doc, field: DOC_BODY_FIELD }),
        CollaborationCaret.configure({ provider: session.provider, user }),
        Placeholder.configure({ placeholder: 'Start writing…' }),
      ],
      editorProps: {
        attributes: { class: 'page-prose focus:outline-none' },
      },
    },
    [session],
  )

  if (!editor) {
    return null
  }

  return (
    <>
      <Toolbar editor={editor} />
      <SelectionMenu editor={editor} />
      <div className="mx-auto w-full max-w-[46rem] px-4 pb-32 sm:px-8">
        <div className="min-h-[60vh] rounded-lg border border-hairline bg-page px-6 py-14 sm:px-16">
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  )
}
