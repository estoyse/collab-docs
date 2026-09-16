import type { Editor } from '@tiptap/core'
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  SquareCode,
  Strikethrough,
  Underline,
  type LucideIcon,
} from 'lucide-react'

export type FormatCommand = {
  id: string
  label: string
  icon: LucideIcon
  isActive(editor: Editor): boolean
  run(editor: Editor): void
}

export const FORMAT_COMMANDS: FormatCommand[] = [
  {
    id: 'bold',
    label: 'Bold',
    icon: Bold,
    isActive: (editor) => editor.isActive('bold'),
    run: (editor) => void editor.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: Italic,
    isActive: (editor) => editor.isActive('italic'),
    run: (editor) => void editor.chain().focus().toggleItalic().run(),
  },
  {
    id: 'underline',
    label: 'Underline',
    icon: Underline,
    isActive: (editor) => editor.isActive('underline'),
    run: (editor) => void editor.chain().focus().toggleUnderline().run(),
  },
  {
    id: 'strike',
    label: 'Strikethrough',
    icon: Strikethrough,
    isActive: (editor) => editor.isActive('strike'),
    run: (editor) => void editor.chain().focus().toggleStrike().run(),
  },
  {
    id: 'code',
    label: 'Inline code',
    icon: Code,
    isActive: (editor) => editor.isActive('code'),
    run: (editor) => void editor.chain().focus().toggleCode().run(),
  },
  {
    id: 'link',
    label: 'Link',
    icon: Link,
    isActive: (editor) => editor.isActive('link'),
    run: (editor) => {
      if (editor.isActive('link')) {
        void editor.chain().focus().extendMarkRange('link').unsetLink().run()
      }
    },
  },
  {
    id: 'h1',
    label: 'Heading 1',
    icon: Heading1,
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    run: (editor) => void editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Heading 2',
    icon: Heading2,
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    run: (editor) => void editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Heading 3',
    icon: Heading3,
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    run: (editor) => void editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'blockquote',
    label: 'Blockquote',
    icon: Quote,
    isActive: (editor) => editor.isActive('blockquote'),
    run: (editor) => void editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    label: 'Code block',
    icon: SquareCode,
    isActive: (editor) => editor.isActive('codeBlock'),
    run: (editor) => void editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'horizontalRule',
    label: 'Horizontal rule',
    icon: Minus,
    isActive: () => false,
    run: (editor) => void editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'bullet',
    label: 'Bullet list',
    icon: List,
    isActive: (editor) => editor.isActive('bulletList'),
    run: (editor) => void editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'ordered',
    label: 'Numbered list',
    icon: ListOrdered,
    isActive: (editor) => editor.isActive('orderedList'),
    run: (editor) => void editor.chain().focus().toggleOrderedList().run(),
  },
]

export const ALWAYS_VISIBLE_COMMAND_IDS = [
  'bold',
  'italic',
  'underline',
  'strike',
  'link',
  'h1',
  'h2',
  'bullet',
  'ordered',
]

export const SELECTION_COMMAND_IDS = ['bold', 'italic', 'underline', 'strike', 'code', 'link']
